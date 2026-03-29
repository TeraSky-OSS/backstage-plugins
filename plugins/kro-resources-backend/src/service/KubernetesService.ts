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

  /**
   * Build a labelSelector string from a matchLabels object.
   * CEL expressions in selector values are treated as literal strings since
   * the Backstage plugin reads the RGD spec statically.
   */
  private buildMatchLabelsSelector(matchLabels: Record<string, string>): string {
    return Object.entries(matchLabels)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  /**
   * Attempt to fetch a Kubernetes resource. Returns null and logs a warning
   * instead of throwing when the server returns a 404-class response, which
   * happens on older kro versions that do not have the requested API kind yet.
   */
  private async tryProxyKubernetesRequest(clusterName: string, path: string): Promise<any | null> {
    try {
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

      if (response.status === 404) {
        this.logger.debug(`Resource not found (404) at ${path} — likely unsupported by this kro version`);
        return null;
      }

      if (!response.ok) {
        this.logger.warn(`Unexpected response ${response.status} at ${path}: ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      this.logger.debug(`Request failed for ${path}: ${error}`);
      return null;
    }
  }

  /**
   * Build the base path for listing/fetching resources, honouring cluster scope.
   * For Cluster-scoped resources the namespace segment is omitted.
   */
  private resourceBasePath(
    isCoreAPI: boolean,
    group: string,
    version: string,
    plural: string,
    namespace: string,
    scope: 'Namespaced' | 'Cluster',
  ): string {
    if (isCoreAPI) {
      return scope === 'Cluster'
        ? `/api/v1/${plural}`
        : `/api/v1/namespaces/${namespace}/${plural}`;
    }
    return scope === 'Cluster'
      ? `/apis/${group}/${version}/${plural}`
      : `/apis/${group}/${version}/namespaces/${namespace}/${plural}`;
  }

  async getResources(
    clusterName: string,
    namespace: string,
    rgdName: string,
    _rgdId: string,
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

      // Fetch GraphRevisions for this RGD (kro 0.9.0+). Gracefully skip on
      // older clusters where the GraphRevision CRD does not exist yet.
      const graphRevisionList = await this.tryProxyKubernetesRequest(
        clusterName,
        `/apis/kro.run/v1alpha1/graphrevisions?labelSelector=${encodeURIComponent(`kro.run/resource-graph-definition-name=${rgdName}`)}`,
      );
      if (graphRevisionList?.items) {
        for (const gr of graphRevisionList.items) {
          supportingResources.push(gr);
        }
        this.logger.info(`Found ${graphRevisionList.items.length} GraphRevision(s) for RGD ${rgdName}`);
      }

      // Get CRD using the provided name
      const crd = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`,
      );
      supportingResources.push(crd);

      // Determine CRD scope: 'Cluster' (kro 0.9.0+) or 'Namespaced' (default)
      const crdScope: 'Namespaced' | 'Cluster' =
        crd.spec?.scope === 'Cluster' ? 'Cluster' : 'Namespaced';

      // Get the version from the CRD
      const version = crd.spec.versions.find((v: any) => v.served && v.storage)?.name || crd.spec.versions[0].name;

      // Fetch the instance — path depends on CRD scope
      const instancePath =
        crdScope === 'Cluster'
          ? `/apis/${crd.spec.group}/${version}/${crd.spec.names.plural}/${instanceName}`
          : `/apis/${crd.spec.group}/${version}/namespaces/${namespace}/${crd.spec.names.plural}/${instanceName}`;

      const instance = await this.proxyKubernetesRequest(clusterName, instancePath);

      // Check for Ready condition (kro v0.8+) or InstanceSynced (older versions)
      const isReady = instance.status?.conditions?.find((c: any) => 
        c.type === 'Ready' && c.status === 'True'
      ) || instance.status?.conditions?.find((c: any) => 
        c.type === 'InstanceSynced' && c.status === 'True'
      );

      // Detect reconciliation-paused state (kro 0.9.0 uses an annotation)
      const reconcilePaused =
        instance.metadata?.annotations?.['kro.run/reconcile'] === 'disabled';
      
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
        parentId: undefined,
        scope: crdScope,
        reconcilePaused,
      });

      // Separate external refs from managed resources
      const externalRefs: any[] = [];
      const subResources: any[] = [];
      
      this.logger.info(`Processing RGD resources. Total resources in spec: ${rgd.spec?.resources?.length || 0}`);
      
      (rgd.spec?.resources || []).forEach((resource: any) => {
        if (resource.externalRef) {
          const extRef = resource.externalRef;
          // kro 0.9.0 places the selector inside metadata; scalar refs use metadata.name
          const selector = extRef.metadata?.selector;
          if (selector) {
            // kro 0.9.0 collection external ref (matchLabels / matchExpressions)
            this.logger.info(`Found collection external ref: ${extRef.kind} with selector`);
            externalRefs.push({
              apiVersion: extRef.apiVersion,
              kind: extRef.kind,
              namespace: extRef.metadata?.namespace || namespace,
              id: resource.id,
              isExternal: true,
              isCollection: true,
              selector,
            });
          } else {
            // scalar external ref (0.8.x style)
            this.logger.info(`Found scalar external ref: ${extRef.kind}/${extRef.metadata?.name}`);
            externalRefs.push({
              apiVersion: extRef.apiVersion,
              kind: extRef.kind,
              name: extRef.metadata?.name,
              namespace: extRef.metadata?.namespace || namespace,
              id: resource.id,
              isExternal: true,
              isCollection: false,
            });
          }
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

      // Fetch external references
      for (const extRef of externalRefs) {
        try {
          const apiVersionParts = extRef.apiVersion.split('/');
          const extGroup = apiVersionParts.length === 2 ? apiVersionParts[0] : extRef.apiVersion;
          const extVersion = apiVersionParts.length === 2 ? apiVersionParts[1] : extRef.apiVersion;
          const pluralKind = this.getPluralKind(extRef.kind);
          const isCoreAPI = extRef.apiVersion === 'v1';
          
          if (extRef.isCollection) {
            // Build label selector from matchLabels
            const matchLabels: Record<string, string> = extRef.selector?.matchLabels || {};
            const labelSelector = this.buildMatchLabelsSelector(matchLabels);
            const listPath = isCoreAPI
              ? `/api/v1/namespaces/${extRef.namespace}/${pluralKind}${labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : ''}`
              : `/apis/${extGroup}/${extVersion}/namespaces/${extRef.namespace}/${pluralKind}${labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : ''}`;

            const list = await this.proxyKubernetesRequest(clusterName, listPath);
            for (const item of list.items || []) {
              // Kubernetes list responses omit apiVersion/kind on each item;
              // inject them from the externalRef definition so the manifest
              // viewer and graph nodes display the correct type.
              if (!item.apiVersion) item.apiVersion = extRef.apiVersion;
              if (!item.kind) item.kind = extRef.kind;
              resources.push({
                type: 'Resource',
                name: item.metadata?.name || 'Unknown',
                namespace: item.metadata?.namespace,
                group: this.getApiGroup(item.apiVersion),
                kind: item.kind,
                status: {
                  synced: true,
                  ready: true,
                  conditions: item.status?.conditions || []
                },
                createdAt: item.metadata?.creationTimestamp || '',
                resource: item,
                level: 1,
                parentId: instance.metadata?.uid || `${instance.kind}-${instance.metadata?.name}`,
                isExternal: true,
              });
            }
          } else {
            const resourcePath = isCoreAPI
              ? `/api/v1/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`
              : `/apis/${extGroup}/${extVersion}/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`;

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
          }
        } catch (error) {
          this.logger.error(`Failed to fetch external reference ${extRef.kind}: ${error}`);
        }
      }

      // Fetch all managed resources
      for (const resource of subResources) {
        const apiVersionParts = resource.apiVersion.split('/');
        const group = apiVersionParts.length === 2 ? apiVersionParts[0] : resource.apiVersion;
        const resVersion = apiVersionParts.length === 2 ? apiVersionParts[1] : resource.apiVersion;
        const pluralKind = this.getPluralKind(resource.kind);
        
        try {
          const isCoreAPI = resource.apiVersion === 'v1';
          let path: string;

          // For cluster-scoped instances, managed resources that are namespaced
          // will have an explicit namespace in their template; for listing we
          // fall back to the instance namespace when building the label query.
          const listNamespace = namespace;
          const basePath = this.resourceBasePath(isCoreAPI, group, resVersion, pluralKind, listNamespace, crdScope);
          // In kro 0.9.0, nested kro instances stamp their own RGD's ID in
          // kro.run/resource-graph-definition-id rather than the parent's, so
          // filtering by rgdId would exclude them. kro.run/instance-id (a UID)
          // is sufficient to uniquely identify resources owned by this instance.
          const kroLabelSelector = encodeURIComponent([
            'kro.run/owned=true',
            `kro.run/instance-id=${instanceId}`,
          ].join(','));

          if (resource.isCollection) {
            path = `${basePath}?labelSelector=${kroLabelSelector}`;
          } else {
            let resourceName = resource.name || '';
            resourceName = resourceName
              .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
              .replace(/\$\{schema\.metadata\.name\}/g, instance.metadata?.name || '')
              .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);

            if (resourceName.includes('${') || resourceName.includes('+') || !resourceName) {
              path = `${basePath}?labelSelector=${kroLabelSelector}`;
            } else {
              path = `${basePath}?labelSelector=${kroLabelSelector}&fieldSelector=metadata.name=${resourceName}`;
            }
          }

          let resourceList;
          try {
            this.logger.info(`Querying for ${resource.kind} at path: ${path}`);
            resourceList = await this.proxyKubernetesRequest(clusterName, path);
          } catch (error) {
            this.logger.debug(`Label selector query failed for ${resource.kind}, trying direct fetch: ${error}`);
            resourceList = { items: [] };
          }
          
          let items = resourceList.items || [];
          this.logger.info(`Found ${items.length} ${resource.kind} resource(s) with KRO labels`);

          // If no items found with label selectors, try direct name-based fetch
          if (items.length === 0 && resource.name) {
            try {
              let resourceName = resource.name || '';
              resourceName = resourceName
                .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
                .replace(/\$\{schema\.metadata\.name\}/g, instance.metadata?.name || '')
                .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);

              if (!resourceName.includes('${') && !resourceName.includes('+')) {
                this.logger.info(`Attempting direct fetch for ${resource.kind}/${resourceName}`);
                const directBasePath = this.resourceBasePath(isCoreAPI, group, resVersion, pluralKind, namespace, 'Namespaced');
                const directResourcePath = `${directBasePath}/${resourceName}`;
                const directResource = await this.proxyKubernetesRequest(clusterName, directResourcePath);
                items = [directResource];
              }
            } catch (error) {
              this.logger.debug(`Direct fetch also failed for ${resource.kind}: ${error}`);
            }
          }

          for (const item of items) {
            const itemBasePath = this.resourceBasePath(isCoreAPI, group, resVersion, pluralKind, item.metadata?.namespace || namespace, 'Namespaced');
            const fullResource = await this.proxyKubernetesRequest(clusterName, `${itemBasePath}/${item.metadata.name}`);

            const resourceGroup = this.getApiGroup(fullResource.apiVersion || '');
            const hasRgdLabel = !!fullResource.metadata?.labels?.['kro.run/resource-graph-definition-id'];
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
    _rgdId: string,
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

      // Get CRD info from RGD schema (kro v0.8.1+ structure)
      const schemaGroup = rgd.spec?.schema?.group;
      const schemaKind = rgd.spec?.schema?.kind;
      
      if (!schemaGroup || !schemaKind) {
        throw new Error(`Could not determine group/kind from RGD spec.schema: ${JSON.stringify(rgd.spec?.schema)}`);
      }
      
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

      // Determine CRD scope
      const crdScope: 'Namespaced' | 'Cluster' =
        crd.spec?.scope === 'Cluster' ? 'Cluster' : 'Namespaced';

      // Get the version from the CRD
      const version = crd.spec.versions.find((v: any) => v.served && v.storage)?.name || crd.spec.versions[0].name;

      // Fetch the instance — path depends on CRD scope
      const instancePath =
        crdScope === 'Cluster'
          ? `/apis/${schemaGroup}/${version}/${plural}/${instanceName}`
          : `/apis/${schemaGroup}/${version}/namespaces/${namespace}/${plural}/${instanceName}`;

      const instance = await this.proxyKubernetesRequest(clusterName, instancePath);
      resources.push(instance);

      // Separate external refs from managed resources
      const externalRefs: any[] = [];
      const subResources: any[] = [];
      
      (rgd.spec?.resources || []).forEach((resource: any) => {
        if (resource.externalRef) {
          const extRef = resource.externalRef;
          const selector = extRef.metadata?.selector;
          if (selector) {
            externalRefs.push({
              apiVersion: extRef.apiVersion,
              kind: extRef.kind,
              namespace: extRef.metadata?.namespace || namespace,
              id: resource.id,
              isExternal: true,
              isCollection: true,
              selector,
            });
          } else {
            externalRefs.push({
              apiVersion: extRef.apiVersion,
              kind: extRef.kind,
              name: extRef.metadata?.name,
              namespace: extRef.metadata?.namespace || namespace,
              id: resource.id,
              isExternal: true,
              isCollection: false,
            });
          }
        } else if (resource.template) {
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

      // Fetch external references
      for (const extRef of externalRefs) {
        try {
          const apiVersionParts = extRef.apiVersion.split('/');
          const extGroup = apiVersionParts.length === 2 ? apiVersionParts[0] : extRef.apiVersion;
          const extVersion = apiVersionParts.length === 2 ? apiVersionParts[1] : extRef.apiVersion;
          const pluralKind = this.getPluralKind(extRef.kind);
          const isCoreAPI = extRef.apiVersion === 'v1';

          if (extRef.isCollection) {
            const matchLabels: Record<string, string> = extRef.selector?.matchLabels || {};
            const labelSelector = this.buildMatchLabelsSelector(matchLabels);
            const listPath = isCoreAPI
              ? `/api/v1/namespaces/${extRef.namespace}/${pluralKind}${labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : ''}`
              : `/apis/${extGroup}/${extVersion}/namespaces/${extRef.namespace}/${pluralKind}${labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : ''}`;

            const list = await this.proxyKubernetesRequest(clusterName, listPath);
            for (const item of list.items || []) {
              // Inject apiVersion/kind — omitted by Kubernetes on list items
              if (!item.apiVersion) item.apiVersion = extRef.apiVersion;
              if (!item.kind) item.kind = extRef.kind;
              resources.push(item);
            }
          } else {
            const resourcePath = isCoreAPI
              ? `/api/v1/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`
              : `/apis/${extGroup}/${extVersion}/namespaces/${extRef.namespace}/${pluralKind}/${extRef.name}`;

            const fullResource = await this.proxyKubernetesRequest(clusterName, resourcePath);
            resources.push(fullResource);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch external reference ${extRef.kind}: ${error}`);
        }
      }

      // Fetch all managed resources
      for (const resource of subResources) {
        const apiVersionParts = resource.apiVersion.split('/');
        const group = apiVersionParts.length === 2 ? apiVersionParts[0] : resource.apiVersion;
        const resVersion = apiVersionParts.length === 2 ? apiVersionParts[1] : resource.apiVersion;
        const pluralKind = this.getPluralKind(resource.kind);
        
        try {
          const isCoreAPI = resource.apiVersion === 'v1';
          // Same reasoning as getResources: omit kro.run/resource-graph-definition-id
          // because nested kro instances use their own RGD's ID in that label.
          const kroLabelSelector = encodeURIComponent([
            'kro.run/owned=true',
            `kro.run/instance-id=${instanceId}`,
          ].join(','));

          let path: string;

          if (resource.isCollection) {
            const basePath = this.resourceBasePath(isCoreAPI, group, resVersion, pluralKind, namespace, crdScope);
            path = `${basePath}?labelSelector=${kroLabelSelector}`;
          } else {
            let resourceName = resource.name || '';
            resourceName = resourceName
              .replace(/\$\{schema\.spec\.name\}/g, instance.spec?.name || '')
              .replace(/\$\{schema\.metadata\.name\}/g, instance.metadata?.name || '')
              .replace(/\$\{service\.metadata\.name\}/g, `${instance.spec?.name}-service`);

            const basePath = this.resourceBasePath(isCoreAPI, group, resVersion, pluralKind, namespace, crdScope);

            if (resourceName.includes('${') || resourceName.includes('+') || !resourceName) {
              path = `${basePath}?labelSelector=${kroLabelSelector}`;
            } else {
              path = `${basePath}?labelSelector=${kroLabelSelector}&fieldSelector=metadata.name=${resourceName}`;
            }
          }

          const resourceList = await this.proxyKubernetesRequest(clusterName, path);
          const items = resourceList.items || [];

          for (const item of items) {
            const itemBasePath = this.resourceBasePath(isCoreAPI, group, resVersion, pluralKind, item.metadata?.namespace || namespace, 'Namespaced');
            const fullResource = await this.proxyKubernetesRequest(clusterName, `${itemBasePath}/${item.metadata.name}`);
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
