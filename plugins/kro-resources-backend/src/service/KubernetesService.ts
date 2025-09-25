import { LoggerService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { KroResource, KroEvent, KroResourceTableRow } from '@terasky/backstage-plugin-kro-common';
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

  private getPluralKind(kind: string): string {
    const pluralMap: Record<string, string> = {
      'ingress': 'ingresses',
      'proxy': 'proxies',
      'index': 'indices',
      'matrix': 'matrices',
      'vertex': 'vertices',
    };
    return pluralMap[kind.toLowerCase()] || `${kind.toLowerCase()}s`;
  }

  private getApiGroup(apiVersion?: string): string {
    if (!apiVersion) return 'Unknown';
    
    if (apiVersion.includes('/')) {
      const [group] = apiVersion.split('/');
      return group;
    } else {
      return apiVersion === 'v1' ? 'core' : apiVersion;
    }
  }


  async getResources(
    clusterName: string,
    namespace: string,
    rgdName: string,
    rgdId: string,
    instanceId: string,
    instanceName: string,
    crdName: string,
  ): Promise<{ resources: KroResourceTableRow[]; supportingResources: KroResource[] }> {
    const resources: KroResourceTableRow[] = [];
    const supportingResources: KroResource[] = [];

    try {
      // Fetch RGD
      const rgd = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/kro.run/v1alpha1/resourcegraphdefinitions/${rgdName}`,
      );
      supportingResources.push(rgd);

      // Get CRD using the provided name
      const crd = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`,
      );
      supportingResources.push(crd);

      // Get the version from the CRD
      const version = crd.spec.versions.find((v: any) => v.served && v.storage)?.name || crd.spec.versions[0].name;

      // Fetch the instance using CRD info
      const instance = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/${crd.spec.group}/${version}/namespaces/${namespace}/${crd.spec.names.plural}/${instanceName}`,
      );
      resources.push({
        type: 'Instance',
        name: instance.metadata?.name || 'Unknown',
        namespace: instance.metadata?.namespace,
        group: this.getApiGroup(instance.apiVersion),
        kind: instance.kind || 'Unknown',
        status: {
          ready: instance.status?.conditions?.find((c: any) => c.type === 'InstanceSynced')?.status === 'True' || false,
          synced: instance.status?.conditions?.find((c: any) => c.type === 'InstanceSynced')?.status === 'True' || false,
          conditions: instance.status?.conditions || []
        },
        createdAt: instance.metadata?.creationTimestamp || '',
        resource: instance,
        level: 0,
        parentId: undefined
      });

      // Get sub-resources from RGD spec
      const subResources = rgd.spec?.resources?.map((resource: { template: any; id: string }) => {
        const template = resource.template;
        return {
          apiVersion: template.apiVersion,
          kind: template.kind,
          name: template.metadata?.name,
        };
      }) || [];

      // Fetch all managed resources
      for (const resource of subResources) {
        const [group, version] = resource.apiVersion.split('/');
        const pluralKind = this.getPluralKind(resource.kind);
        
        try {
          // Replace template variables in the name
          const resourceName = resource.name
            .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
            .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);

          const path = group === 'v1'
            ? `/api/v1/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                'kro.run/owned=true',
                `kro.run/instance-id=${instanceId}`,
                `kro.run/resource-graph-definition-id=${rgdId}`,
              ].join(','))}&fieldSelector=metadata.name=${resourceName}`
            : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                'kro.run/owned=true',
                `kro.run/instance-id=${instanceId}`,
                `kro.run/resource-graph-definition-id=${rgdId}`,
              ].join(','))}&fieldSelector=metadata.name=${resourceName}`;

          const resourceList = await this.proxyKubernetesRequest(clusterName, path);
          const items = resourceList.items || [];

          for (const item of items) {
            const resourcePath = group === 'v1'
              ? `/api/v1/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`
              : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`;

            const fullResource = await this.proxyKubernetesRequest(clusterName, resourcePath);

            resources.push({
              type: 'Resource',
              name: item.metadata?.name || 'Unknown',
              namespace: item.metadata?.namespace,
              group: this.getApiGroup(resourceList.apiVersion),
              kind: resourceList.kind.replace('List', ''),
              status: {
                synced: true,
                ready: true,
                conditions: item.status?.conditions || []
              },
              createdAt: item.metadata?.creationTimestamp || '',
              resource: fullResource,
              level: 1,
              parentId: instance.metadata?.uid || `${instance.kind}-${instance.metadata?.name}`
            });
          }
        } catch (error) {
          this.logger.error(`Failed to fetch ${resource.kind} resources: ${error}`);
        }
      }

      return { resources, supportingResources };
    } catch (error) {
      this.logger.error(`Failed to fetch resources: ${error}`);
      throw error;
    }
  }

  async getEvents(
    clusterName: string,
    namespace: string,
    resourceName: string,
    resourceKind: string,
  ): Promise<KroEvent[]> {
    try {
      const path = `/api/v1/namespaces/${namespace}/events?fieldSelector=${encodeURIComponent(
        `involvedObject.name=${resourceName},involvedObject.kind=${resourceKind}`,
      )}`;

      const response = await this.proxyKubernetesRequest(clusterName, path);
      return response.items || [];
    } catch (error) {
      this.logger.error(`Failed to fetch events: ${error}`);
      throw error;
    }
  }

  async getResourceGraph(
    clusterName: string,
    namespace: string,
    rgdName: string,
    rgdId: string,
    instanceId: string,
    instanceName: string,
  ): Promise<KroResource[]> {
    const resources: KroResource[] = [];

    try {
      // Fetch RGD
      const rgd = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/kro.run/v1alpha1/resourcegraphdefinitions/${rgdName}`,
      );
      resources.push(rgd);

      // Get CRD info directly from the RGD
      const crdName = rgd.spec?.names?.plural ? `${rgd.spec.names.plural}.${rgd.spec.group}` : null;
      if (!crdName) {
        throw new Error('Could not determine CRD name from RGD spec');
      }

      // Get CRD
      const crd = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`,
      );
      resources.push(crd);

      // Get the version from the CRD
      const version = crd.spec.versions.find((v: any) => v.served && v.storage)?.name || crd.spec.versions[0].name;

      // Fetch the instance using CRD info
      const instance = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/${rgd.spec.group}/${version}/namespaces/${namespace}/${rgd.spec.names.plural}/${instanceName}`,
      );
      resources.push(instance);

      // Get sub-resources from RGD spec
      const subResources = rgd.spec?.resources?.map((resource: { template: any; id: string }) => {
        const template = resource.template;
        return {
          apiVersion: template.apiVersion,
          kind: template.kind,
          name: template.metadata?.name,
        };
      }) || [];

      // Fetch all managed resources
      for (const resource of subResources) {
        const [group, version] = resource.apiVersion.split('/');
        const pluralKind = this.getPluralKind(resource.kind);
        
        try {
          // Replace template variables in the name
          const resourceName = resource.name
            .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
            .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);

          const path = group === 'v1'
            ? `/api/v1/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                'kro.run/owned=true',
                `kro.run/instance-id=${instanceId}`,
                `kro.run/resource-graph-definition-id=${rgdId}`,
              ].join(','))}&fieldSelector=metadata.name=${resourceName}`
            : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                'kro.run/owned=true',
                `kro.run/instance-id=${instanceId}`,
                `kro.run/resource-graph-definition-id=${rgdId}`,
              ].join(','))}&fieldSelector=metadata.name=${resourceName}`;

          const resourceList = await this.proxyKubernetesRequest(clusterName, path);
          const items = resourceList.items || [];

          for (const item of items) {
            const resourcePath = group === 'v1'
              ? `/api/v1/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`
              : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`;

            const fullResource = await this.proxyKubernetesRequest(clusterName, resourcePath);
            resources.push(fullResource);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch ${resource.kind} resources: ${error}`);
        }
      }

      return resources;
    } catch (error) {
      this.logger.error(`Failed to fetch resources for graph: ${error}`);
      throw error;
    }
  }
}