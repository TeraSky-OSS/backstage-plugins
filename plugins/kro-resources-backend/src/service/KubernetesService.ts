import { LoggerService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { KroResource, KroEvent, KroResourceTableRow } from '@terasky/backstage-plugin-kro-common';
import fetch from 'node-fetch';

export class KubernetesService {
  constructor(
    private readonly logger: LoggerService,
    private readonly discovery: DiscoveryService,
    private readonly auth: AuthService,
  ) {}

  async proxyKubernetesRequest(clusterName: string, path: string) {
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
      // Check for Ready condition (KRO v0.8+) or InstanceSynced (older versions)
      const isReady = instance.status?.conditions?.find((c: any) => 
        c.type === 'Ready' && c.status === 'True'
      ) || instance.status?.conditions?.find((c: any) => 
        c.type === 'InstanceSynced' && c.status === 'True'
      );
      
      resources.push({
        type: 'Instance',
        name: instance.metadata?.name || 'Unknown',
        namespace: instance.metadata?.namespace,
        group: this.getApiGroup(instance.apiVersion),
        kind: instance.kind || 'Unknown',
        status: {
          ready: !!isReady,
          synced: !!isReady,
          conditions: instance.status?.conditions || []
        },
        createdAt: instance.metadata?.creationTimestamp || '',
        resource: instance,
        level: 0,
        parentId: undefined
      });

      // Separate external refs from managed resources
      const externalRefs: any[] = [];
      const subResources: any[] = [];
      
      this.logger.info(`Processing RGD resources. Total resources in spec: ${rgd.spec?.resources?.length || 0}`);
      
      (rgd.spec?.resources || []).forEach((resource: any) => {
        if (resource.externalRef) {
          this.logger.info(`Found external ref: ${resource.externalRef.kind}/${resource.externalRef.metadata?.name}`);
          externalRefs.push({
            apiVersion: resource.externalRef.apiVersion,
            kind: resource.externalRef.kind,
            name: resource.externalRef.metadata?.name,
            namespace: resource.externalRef.metadata?.namespace || namespace,
            id: resource.id,
            isExternal: true,
          });
        } else if (resource.template) {
          const template = resource.template;
          this.logger.info(`Found managed resource: ${template.kind} (isCollection: ${!!resource.forEach})`);
          subResources.push({
            apiVersion: template.apiVersion,
            kind: template.kind,
            name: template.metadata?.name,
            isCollection: !!resource.forEach,
            id: resource.id,
            isExternal: false,
          });
        } else {
          this.logger.warn(`Resource with id ${resource.id} has neither template nor externalRef`);
        }
      });
      
      this.logger.info(`Found ${externalRefs.length} external refs and ${subResources.length} managed resources`);

      // Fetch external references first
      for (const extRef of externalRefs) {
        try {
          const apiVersionParts = extRef.apiVersion.split('/');
          const group = apiVersionParts.length === 2 ? apiVersionParts[0] : extRef.apiVersion;
          const version = apiVersionParts.length === 2 ? apiVersionParts[1] : extRef.apiVersion;
          const pluralKind = this.getPluralKind(extRef.kind);
          const isCoreAPI = extRef.apiVersion === 'v1';
          
          const resourcePath = isCoreAPI
            ? `/api/v1/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`
            : `/apis/${group}/${version}/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`;

          const fullResource = await this.proxyKubernetesRequest(clusterName, resourcePath);

          resources.push({
            type: 'Resource',
            name: fullResource.metadata?.name || 'Unknown',
            namespace: fullResource.metadata?.namespace,
            group: this.getApiGroup(fullResource.apiVersion),
            kind: fullResource.kind || extRef.kind,
            status: {
              synced: true,
              ready: true,
              conditions: fullResource.status?.conditions || []
            },
            createdAt: fullResource.metadata?.creationTimestamp || '',
            resource: fullResource,
            level: 1,
            parentId: instance.metadata?.uid || `${instance.kind}-${instance.metadata?.name}`,
            isExternal: true,
          });
        } catch (error) {
          this.logger.error(`Failed to fetch external reference ${extRef.kind}/${extRef.name}: ${error}`);
        }
      }

      // Fetch all managed resources
      for (const resource of subResources) {
        const apiVersionParts = resource.apiVersion.split('/');
        const group = apiVersionParts.length === 2 ? apiVersionParts[0] : resource.apiVersion;
        const version = apiVersionParts.length === 2 ? apiVersionParts[1] : resource.apiVersion;
        const pluralKind = this.getPluralKind(resource.kind);
        
        try {
          // For collections (forEach), we can't predict the exact names, so we query by labels only
          // For regular templates, we can try to predict the name for more efficient querying
          let path: string;
          
          // Determine if this is a core API resource (apiVersion === "v1") or a named API group
          const isCoreAPI = resource.apiVersion === 'v1';
          
          if (resource.isCollection) {
            // Collections: use label selector only, no name filter
            path = isCoreAPI
              ? `/api/v1/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                  'kro.run/owned=true',
                  `kro.run/instance-id=${instanceId}`,
                  `kro.run/resource-graph-definition-id=${rgdId}`,
                ].join(','))}`
              : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                  'kro.run/owned=true',
                  `kro.run/instance-id=${instanceId}`,
                  `kro.run/resource-graph-definition-id=${rgdId}`,
                ].join(','))}`;
          } else {
            // Regular template: try to predict name for more efficient query
            // Handle basic CEL expressions in names
            let resourceName = resource.name || '';
            
            // Replace common template patterns
            resourceName = resourceName
              .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
              .replace(/\$\{schema\.metadata\.name\}/g, instance.metadata?.name || '')
              .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);
            
            // If name still contains template variables or CEL expressions, query without name filter
            if (resourceName.includes('${') || resourceName.includes('+') || !resourceName) {
              path = isCoreAPI
                ? `/api/v1/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                    'kro.run/owned=true',
                    `kro.run/instance-id=${instanceId}`,
                    `kro.run/resource-graph-definition-id=${rgdId}`,
                  ].join(','))}`
                : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                    'kro.run/owned=true',
                    `kro.run/instance-id=${instanceId}`,
                    `kro.run/resource-graph-definition-id=${rgdId}`,
                  ].join(','))}`;
            } else {
              // Name is fully resolved, use field selector for efficiency
              path = isCoreAPI
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
            }
          }

          // First try to fetch by label selectors (for managed resources)
          let resourceList;
          try {
            this.logger.info(`Querying for ${resource.kind} at path: ${path}`);
            resourceList = await this.proxyKubernetesRequest(clusterName, path);
          } catch (error) {
            // If label selector query fails, try fetching by name directly (for nested KRO instances)
            this.logger.debug(`Label selector query failed for ${resource.kind}, trying direct fetch: ${error}`);
            resourceList = { items: [] };
          }
          
          let items = resourceList.items || [];
          this.logger.info(`Found ${items.length} ${resource.kind} resource(s) with KRO labels`);

          // If no items found with label selectors, try direct name-based fetch (for nested KRO instances)
          if (items.length === 0 && resource.name) {
            try {
              let resourceName = resource.name || '';
              resourceName = resourceName
                .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
                .replace(/\$\{schema\.metadata\.name\}/g, instance.metadata?.name || '')
                .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);

              if (!resourceName.includes('${') && !resourceName.includes('+')) {
                this.logger.info(`Attempting direct fetch for ${resource.kind}/${resourceName}`);
                const resourcePath = isCoreAPI
                  ? `/api/v1/namespaces/${namespace}/${pluralKind}/${resourceName}`
                  : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${resourceName}`;
                
                const directResource = await this.proxyKubernetesRequest(clusterName, resourcePath);
                items = [directResource];
              }
            } catch (error) {
              this.logger.debug(`Direct fetch also failed for ${resource.kind}: ${error}`);
            }
          }

          for (const item of items) {
            const resourcePath = isCoreAPI
              ? `/api/v1/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`
              : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`;

            const fullResource = await this.proxyKubernetesRequest(clusterName, resourcePath);

            // Check if this resource is itself a KRO instance (nested RGD)
            // A KRO instance has group 'kro.run' and has the RGD labels
            const resourceGroup = this.getApiGroup(fullResource.apiVersion || '');
            const hasRgdLabel = !!fullResource.metadata?.labels?.['kro.run/resource-graph-definition-id'];
            
            // It's an instance if it's in the kro.run group (custom KRO-defined kinds)
            const isNestedKroInstance = resourceGroup === 'kro.run' && hasRgdLabel;

            resources.push({
              type: isNestedKroInstance ? 'Instance' : 'Resource',
              name: fullResource.metadata?.name || 'Unknown',
              namespace: fullResource.metadata?.namespace,
              group: this.getApiGroup(fullResource.apiVersion || resource.apiVersion),
              kind: fullResource.kind || resource.kind,
              status: {
                synced: true,
                ready: true,
                conditions: fullResource.status?.conditions || []
              },
              createdAt: fullResource.metadata?.creationTimestamp || '',
              resource: fullResource,
              level: 1,
              parentId: instance.metadata?.uid || `${instance.kind}-${instance.metadata?.name}`,
              isExternal: false,
            });
          }
        } catch (error) {
          this.logger.error(`Failed to fetch ${resource.kind} resources: ${error}`);
        }
      }

      this.logger.info(`Returning ${resources.length} total resources (type:kind:name)`);
      this.logger.info(`Resources breakdown: ${resources.map(r => `${r.type}:${r.kind}:${r.name}`).join(', ')}`);
      
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

      // Get CRD info from RGD schema (KRO v0.8.1 structure)
      const schemaGroup = rgd.spec?.schema?.group;
      const schemaKind = rgd.spec?.schema?.kind;
      
      if (!schemaGroup || !schemaKind) {
        throw new Error(`Could not determine group/kind from RGD spec.schema: ${JSON.stringify(rgd.spec?.schema)}`);
      }
      
      // Pluralize the kind
      const kindLower = schemaKind.toLowerCase();
      let plural = kindLower + 's';
      if (kindLower.endsWith('s')) plural = kindLower + 'es';
      if (kindLower.endsWith('y')) plural = kindLower.slice(0, -1) + 'ies';
      
      const crdName = `${plural}.${schemaGroup}`;
      this.logger.info(`Derived CRD name: ${crdName} from kind=${schemaKind}, group=${schemaGroup}`);

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
        `/apis/${schemaGroup}/${version}/namespaces/${namespace}/${plural}/${instanceName}`,
      );
      resources.push(instance);

      // Separate external refs from managed resources
      const externalRefs: any[] = [];
      const subResources: any[] = [];
      
      (rgd.spec?.resources || []).forEach((resource: any) => {
        if (resource.externalRef) {
          externalRefs.push({
            apiVersion: resource.externalRef.apiVersion,
            kind: resource.externalRef.kind,
            name: resource.externalRef.metadata?.name,
            namespace: resource.externalRef.metadata?.namespace || namespace,
            id: resource.id,
            isExternal: true,
          });
        } else {
          const template = resource.template;
          subResources.push({
            apiVersion: template.apiVersion,
            kind: template.kind,
            name: template.metadata?.name,
            isCollection: !!resource.forEach,
            id: resource.id,
            isExternal: false,
          });
        }
      });

      // Fetch external references first
      for (const extRef of externalRefs) {
        try {
          const apiVersionParts = extRef.apiVersion.split('/');
          const group = apiVersionParts.length === 2 ? apiVersionParts[0] : extRef.apiVersion;
          const version = apiVersionParts.length === 2 ? apiVersionParts[1] : extRef.apiVersion;
          const pluralKind = this.getPluralKind(extRef.kind);
          const isCoreAPI = extRef.apiVersion === 'v1';
          
          const resourcePath = isCoreAPI
            ? `/api/v1/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`
            : `/apis/${group}/${version}/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`;

          const fullResource = await this.proxyKubernetesRequest(clusterName, resourcePath);
          resources.push(fullResource);
        } catch (error) {
          this.logger.error(`Failed to fetch external reference ${extRef.kind}/${extRef.name}: ${error}`);
        }
      }

      // Fetch all managed resources
      for (const resource of subResources) {
        const apiVersionParts = resource.apiVersion.split('/');
        const group = apiVersionParts.length === 2 ? apiVersionParts[0] : resource.apiVersion;
        const version = apiVersionParts.length === 2 ? apiVersionParts[1] : resource.apiVersion;
        const pluralKind = this.getPluralKind(resource.kind);
        
        try {
          // For collections (forEach), we can't predict the exact names, so we query by labels only
          // For regular templates, we can try to predict the name for more efficient querying
          let path: string;
          
          // Determine if this is a core API resource (apiVersion === "v1") or a named API group
          const isCoreAPI = resource.apiVersion === 'v1';
          
          if (resource.isCollection) {
            // Collections: use label selector only, no name filter
            path = isCoreAPI
              ? `/api/v1/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                  'kro.run/owned=true',
                  `kro.run/instance-id=${instanceId}`,
                  `kro.run/resource-graph-definition-id=${rgdId}`,
                ].join(','))}`
              : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                  'kro.run/owned=true',
                  `kro.run/instance-id=${instanceId}`,
                  `kro.run/resource-graph-definition-id=${rgdId}`,
                ].join(','))}`;
          } else {
            // Regular template: try to predict name for more efficient query
            // Handle basic CEL expressions in names
            let resourceName = resource.name || '';
            
            // Replace common template patterns
            resourceName = resourceName
              .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
              .replace(/\$\{schema\.metadata\.name\}/g, instance.metadata?.name || '')
              .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);
            
            // If name still contains template variables or CEL expressions, query without name filter
            if (resourceName.includes('${') || resourceName.includes('+') || !resourceName) {
              path = isCoreAPI
                ? `/api/v1/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                    'kro.run/owned=true',
                    `kro.run/instance-id=${instanceId}`,
                    `kro.run/resource-graph-definition-id=${rgdId}`,
                  ].join(','))}`
                : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}?labelSelector=${encodeURIComponent([
                    'kro.run/owned=true',
                    `kro.run/instance-id=${instanceId}`,
                    `kro.run/resource-graph-definition-id=${rgdId}`,
                  ].join(','))}`;
            } else {
              // Name is fully resolved, use field selector for efficiency
              path = isCoreAPI
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
            }
          }

          const resourceList = await this.proxyKubernetesRequest(clusterName, path);
          const items = resourceList.items || [];

          for (const item of items) {
            const resourcePath = isCoreAPI
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