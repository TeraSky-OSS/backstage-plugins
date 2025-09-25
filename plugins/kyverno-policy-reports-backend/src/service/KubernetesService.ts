import { LoggerService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { PolicyReport, GetPolicyReportsRequest } from '@terasky/backstage-plugin-kyverno-common';
import fetch from 'node-fetch';

export class KubernetesService {
  constructor(
    private readonly logger: LoggerService,
    private readonly discovery: DiscoveryService,
    private readonly auth: AuthService,
  ) {}

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
}