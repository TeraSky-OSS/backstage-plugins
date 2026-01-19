import { LoggerService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { PolicyReport, GetPolicyReportsRequest, GetCrossplanePolicyReportsRequest } from '@terasky/backstage-plugin-kyverno-common';
import fetch from 'node-fetch';

export class KubernetesService {
  constructor(
    private readonly logger: LoggerService,
    private readonly discovery: DiscoveryService,
    private readonly auth: AuthService,
    private readonly config: Config,
  ) {}

  private getAnnotationPrefix(): string {
    return (
      this.config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
      'terasky.backstage.io'
    );
  }

  private getAnnotation(
    annotations: Record<string, string>,
    key: string,
  ): string | undefined {
    const defaultPrefix = 'terasky.backstage.io';
    const prefix = this.getAnnotationPrefix();
    return (
      annotations[`${prefix}/${key}`] ||
      (prefix !== defaultPrefix
        ? annotations[`${defaultPrefix}/${key}`]
        : undefined)
    );
  }

  private async proxyKubernetesRequest(clusterName: string, path: string) {
    const baseUrl = await this.discovery.getBaseUrl('kubernetes');
    const credentials = await this.auth.getOwnServiceCredentials();
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'kubernetes',
    });

    const response = await fetch(`${baseUrl}/proxy${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Backstage-Kubernetes-Cluster': clusterName,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Kubernetes resources: ${response.statusText}`);
    }

    return await response.json();
  }

  async getPolicyReports(request: GetPolicyReportsRequest): Promise<PolicyReport[]> {
    const { entity } = request;
    const reports: PolicyReport[] = [];

    try {
      // First get all workloads for the entity
      const baseUrl = await this.discovery.getBaseUrl('kubernetes');
      const credentials = await this.auth.getOwnServiceCredentials();
      const { token } = await this.auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'kubernetes',
      });

      const workloadsResponse = await fetch(`${baseUrl}/services/${entity.metadata.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entity, auth: {} }),
      });

      if (!workloadsResponse.ok) {
        throw new Error(`Failed to fetch workloads: ${workloadsResponse.statusText}`);
      }

      const workloads = await workloadsResponse.json();

      // For each workload, get its policy report
      for (const item of workloads.items) {
        const clusterName = item.cluster.name;
        
        for (const resourceGroup of item.resources) {
          for (const resource of resourceGroup.resources) {
            const { uid, namespace } = resource.metadata || {};
            if (!uid || !namespace) continue;

            try {
              const report = await this.proxyKubernetesRequest(
                clusterName,
                `/apis/wgpolicyk8s.io/v1alpha2/namespaces/${namespace}/policyreports/${uid}`,
              );
              reports.push({ ...report, clusterName });
            } catch (error) {
              this.logger.error(`Failed to fetch policy report for ${uid}: ${error}`);
            }
          }
        }
      }

      return reports;
    } catch (error) {
      this.logger.error(`Failed to fetch policy reports: ${error}`);
      throw error;
    }
  }

  async getPolicy(clusterName: string, namespace: string | undefined, policyName: string): Promise<any> {
    try {
      // Try cluster-scoped policy first
      try {
        const policy = await this.proxyKubernetesRequest(
          clusterName,
          `/apis/kyverno.io/v1/clusterpolicies/${policyName}`,
        );
        return policy;
      } catch (error) {
        if (!namespace) throw error;
      }

      // If cluster-scoped policy not found and namespace provided, try namespaced policy
      if (namespace) {
        const policy = await this.proxyKubernetesRequest(
          clusterName,
          `/apis/kyverno.io/v1/namespaces/${namespace}/policies/${policyName}`,
        );
        return policy;
      }

      throw new Error(`Policy ${policyName} not found`);
    } catch (error) {
      this.logger.error(`Failed to fetch policy ${policyName}: ${error}`);
      throw error;
    }
  }

  async getCrossplanePolicyReports(request: GetCrossplanePolicyReportsRequest): Promise<PolicyReport[]> {
    const { entity } = request;
    const reports: PolicyReport[] = [];

    try {
      const annotations = entity.metadata.annotations || {};
      const crossplaneVersion = this.getAnnotation(annotations, 'crossplane-version');
      const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
      const cluster = annotations['backstage.io/managed-by-location']?.split(': ')[1];

      if (!cluster) {
        throw new Error('Missing cluster annotation: backstage.io/managed-by-location');
      }

      const resourcesToFetch: any[] = [];

      // Fetch claim (v1 only)
      if (crossplaneVersion === 'v1') {
        const claimPlural = this.getAnnotation(annotations, 'claim-plural');
        const claimGroup = this.getAnnotation(annotations, 'claim-group');
        const claimVersion = this.getAnnotation(annotations, 'claim-version');
        const claimName = this.getAnnotation(annotations, 'claim-name');
        const namespace = labelSelector?.split(',').find(s => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];

        if (claimPlural && claimGroup && claimVersion && claimName && namespace) {
          try {
            const claimUrl = `/apis/${claimGroup}/${claimVersion}/namespaces/${namespace}/${claimPlural}/${claimName}`;
            const claim = await this.proxyKubernetesRequest(cluster, claimUrl);
            resourcesToFetch.push(claim);
          } catch (error) {
            this.logger.warn(`Failed to fetch claim ${claimName}: ${error}`);
          }
        }
      }

      // Fetch composite (for both v1 and v2)
      const compositePlural = this.getAnnotation(annotations, 'composite-plural');
      const compositeGroup = this.getAnnotation(annotations, 'composite-group');
      const compositeVersion = this.getAnnotation(annotations, 'composite-version');
      const compositeName = this.getAnnotation(annotations, 'composite-name');
      const compositeScope = this.getAnnotation(annotations, 'crossplane-scope');

      if (compositePlural && compositeGroup && compositeVersion && compositeName) {
        try {
          let compositeUrl;
          if (compositeScope === 'Namespaced') {
            const ns = labelSelector?.split(',').find(s => 
              s.startsWith('crossplane.io/claim-namespace') || 
              s.startsWith('crossplane.io/composite-namespace')
            )?.split('=')[1] ||
              this.getAnnotation(annotations, 'composite-namespace') ||
              'default';
            compositeUrl = `/apis/${compositeGroup}/${compositeVersion}/namespaces/${ns}/${compositePlural}/${compositeName}`;
          } else {
            compositeUrl = `/apis/${compositeGroup}/${compositeVersion}/${compositePlural}/${compositeName}`;
          }
          const composite = await this.proxyKubernetesRequest(cluster, compositeUrl);
          resourcesToFetch.push(composite);
        } catch (error) {
          this.logger.warn(`Failed to fetch composite ${compositeName}: ${error}`);
        }
      }

      // Fetch policy reports for each resource
      for (const resource of resourcesToFetch) {
        if (!resource || !resource.metadata) continue;
        
        const { uid, namespace } = resource.metadata;
        if (!uid) continue;

        try {
          let reportUrl;
          if (namespace) {
            reportUrl = `/apis/wgpolicyk8s.io/v1alpha2/namespaces/${namespace}/policyreports/${uid}`;
          } else {
            reportUrl = `/apis/wgpolicyk8s.io/v1alpha2/clusterpolicyreports/${uid}`;
          }

          const report = await this.proxyKubernetesRequest(cluster, reportUrl);
          reports.push({ ...report, clusterName: cluster });
        } catch (error) {
          this.logger.error(`Failed to fetch policy report for ${uid}: ${error}`);
        }
      }

      return reports;
    } catch (error) {
      this.logger.error(`Failed to fetch Crossplane policy reports: ${error}`);
      throw error;
    }
  }
}
