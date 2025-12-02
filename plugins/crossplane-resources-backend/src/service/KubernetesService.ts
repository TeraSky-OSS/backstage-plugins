import { LoggerService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import {
  CrossplaneResource,
  CrossplaneResourceTableRow,
  GetResourcesRequest,
  GetEventsRequest,
  GetResourceGraphRequest,
  GetV2ResourceGraphRequest,
  CrossplaneResourceListResponse,
  CrossplaneEventsResponse,
  CrossplaneResourceGraphResponse,
} from '@terasky/backstage-plugin-crossplane-common';
import fetch from 'node-fetch';
import pluralize from 'pluralize';

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

    this.logger.info(`Making Kubernetes request to: ${path}`);
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

  private getApiGroup(apiVersion?: string): string {
    if (!apiVersion) return 'Unknown';
    
    if (apiVersion.includes('/')) {
      const [group] = apiVersion.split('/');
      return group;
    } else {
      return apiVersion === 'v1' ? 'core' : apiVersion;
    }
  }

  async getResources(request: GetResourcesRequest): Promise<CrossplaneResourceListResponse> {
      const {
        clusterName,
        namespace,
        group,
        version,
        plural,
        name,
        kind,
      } = request;

    const resources: CrossplaneResourceTableRow[] = [];
    const supportingResources: CrossplaneResource[] = [];

    try {
      // Fetch the resource
      let url: string;
      // Special handling for V1 composite resources - they are always cluster-scoped
      if (kind?.startsWith('Composite') || kind?.endsWith('Composite')) {
        url = `/apis/${group}/${version}/${plural}/${name}`;
      } else if (!group || group === 'v1') {
        // Core API group
        if (namespace) {
          url = `/api/v1/namespaces/${namespace}/${plural}/${name}`;
        } else {
          url = `/api/v1/${plural}/${name}`;
        }
      } else {
        // Other API groups
        if (namespace) {
          url = `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${name}`;
        } else {
          url = `/apis/${group}/${version}/${plural}/${name}`;
        }
      }

      const resource = await this.proxyKubernetesRequest(clusterName, url);
      this.logger.info('Fetched resource:', resource);

      // Determine resource type based on kind and spec
      let type: 'Claim' | 'Resource' | 'XRD';
      if (resource.kind?.endsWith('Claim')) {
        type = 'Claim';
      } else if (resource.kind === 'CompositeResourceDefinition') {
        type = 'XRD';
      } else {
        type = 'Resource';
      }

      resources.push({
        type,
        name: resource.metadata?.name || 'Unknown',
        namespace: resource.metadata?.namespace,
        group: this.getApiGroup(resource.apiVersion),
        kind: resource.kind || 'Unknown',
        status: {
          ready: resource.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True' || false,
          synced: resource.status?.conditions?.find((c: any) => c.type === 'Synced')?.status === 'True' || false,
          conditions: resource.status?.conditions || []
        },
        createdAt: resource.metadata?.creationTimestamp || '',
        resource: resource,
        level: 0,
        parentId: undefined
      });

      // If this is a claim, fetch supporting resources
      if (type === 'Claim') {
        // Get the composite resource if it exists
        // Check both status.compositeResourceRef (newer Crossplane) and spec.resourceRef (older Crossplane)
        const compositeRef = resource.status?.compositeResourceRef || resource.spec?.resourceRef;
        if (compositeRef) {
          const { name, apiVersion, kind } = compositeRef;
          const [group, version] = apiVersion.split('/');
          const pluralKind = pluralize(kind.toLowerCase());

          try {
            const composite = await this.proxyKubernetesRequest(
              clusterName,
              `/apis/${group}/${version}/${pluralKind}/${name}`,
            );
            this.logger.info('Composite resource fetched:', composite);
            resources.push({
              type: 'Resource',
              name: composite.metadata?.name || 'Unknown',
              namespace: composite.metadata?.namespace,
              group: this.getApiGroup(composite.apiVersion),
              kind: composite.kind || 'Unknown',
              status: {
                ready: composite.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True' || false,
                synced: composite.status?.conditions?.find((c: any) => c.type === 'Synced')?.status === 'True' || false,
                conditions: composite.status?.conditions || []
              },
              createdAt: composite.metadata?.creationTimestamp || '',
              resource: composite,
              level: 1,
              parentId: resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`
            });

            // Get managed resources - check both status.resourceRefs and spec.resourceRefs
            const resourceRefs = composite.status?.resourceRefs || composite.spec?.resourceRefs;
            if (resourceRefs) {
              for (const ref of resourceRefs) {
                const { name, apiVersion, kind, namespace: refNamespace } = ref;
                this.logger.info('Processing managed resource ref:', { name, apiVersion, kind, namespace: refNamespace });
                
                let group: string;
                let version: string;
                if (apiVersion.includes('/')) {
                  [group, version] = apiVersion.split('/');
                } else {
                  group = '';
                  version = apiVersion;
                }
                this.logger.info('Parsed API version:', { group, version });

                const pluralKind = pluralize(kind.toLowerCase());
                const targetNamespace = refNamespace || namespace;

                try {
                  // Try namespaced first, if it fails try cluster-scoped
                  let managed;
                  try {
                    // Handle core API group resources (like Service, Pod, etc.)
                    if (!group && version === 'v1') {
                      this.logger.info(`Trying core API group namespaced resource: /api/v1/namespaces/${targetNamespace}/${pluralKind}/${name}`);
                      managed = await this.proxyKubernetesRequest(
                        clusterName,
                        `/api/v1/namespaces/${targetNamespace}/${pluralKind}/${name}`,
                      );
                    } else {
                      this.logger.info(`Trying namespaced managed resource: /apis/${group}/${version}/namespaces/${targetNamespace}/${pluralKind}/${name}`);
                      managed = await this.proxyKubernetesRequest(
                        clusterName,
                        `/apis/${group}/${version}/namespaces/${targetNamespace}/${pluralKind}/${name}`,
                      );
                    }
                  } catch (error) {
                    // If not found in namespace, try cluster-scoped
                    if (!group && version === 'v1') {
                      this.logger.info(`Trying core API group cluster-scoped resource: /api/v1/${pluralKind}/${name}`);
                      managed = await this.proxyKubernetesRequest(
                        clusterName,
                        `/api/v1/${pluralKind}/${name}`,
                      );
                    } else {
                      this.logger.info(`Trying cluster-scoped managed resource: /apis/${group}/${version}/${pluralKind}/${name}`);
                      managed = await this.proxyKubernetesRequest(
                        clusterName,
                        `/apis/${group}/${version}/${pluralKind}/${name}`,
                      );
                    }
                  }
                  this.logger.info('Managed resource fetched:', managed);
                  resources.push({
                    type: 'Resource',
                    name: managed.metadata?.name || 'Unknown',
                    namespace: managed.metadata?.namespace,
                    group: this.getApiGroup(managed.apiVersion),
                    kind: managed.kind || 'Unknown',
                    status: {
                      ready: managed.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True' || false,
                      synced: managed.status?.conditions?.find((c: any) => c.type === 'Synced')?.status === 'True' || false,
                      conditions: managed.status?.conditions || []
                    },
                    createdAt: managed.metadata?.creationTimestamp || '',
                    resource: managed,
                    level: 2,
                    parentId: composite.metadata?.uid || `${composite.kind}-${composite.metadata?.name}`
                  });
                } catch (error) {
                  this.logger.error(`Failed to fetch managed resource ${name}: ${error}`);
                }
              }
            }
          } catch (error) {
            this.logger.error(`Failed to fetch composite resource: ${error}`);
          }
        }
      }

      return { resources, supportingResources };
    } catch (error) {
      this.logger.error(`Failed to fetch resources: ${error}`);
      throw error;
    }
  }

  async getEvents(request: GetEventsRequest): Promise<CrossplaneEventsResponse> {
    const { clusterName, namespace, resourceName, resourceKind } = request;

    try {
      const path = `/api/v1/namespaces/${namespace}/events?fieldSelector=${encodeURIComponent(
        `involvedObject.name=${resourceName},involvedObject.kind=${resourceKind}`,
      )}`;

      const response = await this.proxyKubernetesRequest(clusterName, path);
      return { events: response.items || [] };
    } catch (error) {
      this.logger.error(`Failed to fetch events: ${error}`);
      throw error;
    }
  }

  async getResourceGraph(request: GetResourceGraphRequest): Promise<CrossplaneResourceGraphResponse> {
    const {
      clusterName,
      namespace,
      claimName,
      claimGroup,
      claimVersion,
      claimPlural,
    } = request;

    const resources: CrossplaneResource[] = [];

    try {
      // Fetch the claim directly using the provided group, version, and plural
      this.logger.info(`Fetching claim: /apis/${claimGroup}/${claimVersion}/namespaces/${namespace}/${claimPlural}/${claimName}`);
      const claim = await this.proxyKubernetesRequest(
        clusterName,
        `/apis/${claimGroup}/${claimVersion}/namespaces/${namespace}/${claimPlural}/${claimName}`,
      );
      this.logger.info('Claim fetched:', claim);
      resources.push(claim);

      // Get the composite resource if it exists
      // Check both status.compositeResourceRef (newer Crossplane) and spec.resourceRef (older Crossplane)
      const compositeRef = claim.status?.compositeResourceRef || claim.spec?.resourceRef;
      this.logger.info('Found composite ref:', compositeRef);
      if (compositeRef) {
        const { name, apiVersion, kind } = compositeRef;
        const [group, version] = apiVersion.split('/');
        const pluralKind = pluralize(kind.toLowerCase());

        // Composite resources are cluster-scoped, so we don't include namespace in the path
        this.logger.info(`Fetching composite resource: /apis/${group}/${version}/${pluralKind}/${name}`);
        const composite = await this.proxyKubernetesRequest(
          clusterName,
          `/apis/${group}/${version}/${pluralKind}/${name}`,
        );
        this.logger.info('Composite resource fetched:', composite);
        resources.push(composite);

        // Get managed resources - check both status.resourceRefs and spec.resourceRefs
        const resourceRefs = composite.status?.resourceRefs || composite.spec?.resourceRefs;
        this.logger.info('Found resource refs:', resourceRefs);
        if (resourceRefs) {
          for (const ref of resourceRefs) {
            const { name, apiVersion, kind } = ref;
            this.logger.info('Processing managed resource ref:', { name, apiVersion, kind });
            
            let group: string;
            let version: string;
            if (apiVersion.includes('/')) {
              [group, version] = apiVersion.split('/');
            } else {
              group = '';
              version = apiVersion;
            }
            this.logger.info('Parsed API version:', { group, version });

            const pluralKind = pluralize(kind.toLowerCase());

            try {
              // Try namespaced first, if it fails try cluster-scoped
              let managed;
              try {
              // Handle core API group resources (like Service, Pod, etc.)
              if (!group && version === 'v1') {
                this.logger.info(`Trying core API group namespaced resource: /api/v1/namespaces/${namespace}/${pluralKind}/${name}`);
                managed = await this.proxyKubernetesRequest(
                  clusterName,
                  `/api/v1/namespaces/${namespace}/${pluralKind}/${name}`,
                );
              } else {
                this.logger.info(`Trying namespaced managed resource: /apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${name}`);
                managed = await this.proxyKubernetesRequest(
                  clusterName,
                  `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${name}`,
                );
              }
              } catch (error) {
                // If not found in namespace, try cluster-scoped
                if (!group && version === 'v1') {
                  this.logger.info(`Trying core API group cluster-scoped resource: /api/v1/${pluralKind}/${name}`);
                  managed = await this.proxyKubernetesRequest(
                    clusterName,
                    `/api/v1/${pluralKind}/${name}`,
                  );
                } else {
                  this.logger.info(`Trying cluster-scoped managed resource: /apis/${group}/${version}/${pluralKind}/${name}`);
                  managed = await this.proxyKubernetesRequest(
                    clusterName,
                    `/apis/${group}/${version}/${pluralKind}/${name}`,
                  );
                }
              }
              this.logger.info('Managed resource fetched:', managed);
              resources.push(managed);
            } catch (error) {
              this.logger.error(`Failed to fetch managed resource ${name}: ${error}`);
            }
          }
        }
      }

      this.logger.info(`Returning resource graph with ${resources.length} resources`);
      return { resources };
    } catch (error) {
      this.logger.error(`Failed to fetch resources for graph: ${error}`);
      throw error;
    }
  }

  async getV2ResourceGraph(request: GetV2ResourceGraphRequest): Promise<CrossplaneResourceGraphResponse> {
    const {
      clusterName,
      namespace,
      name,
      group,
      version,
      plural,
      scope,
    } = request;

    const resources: CrossplaneResource[] = [];

    try {
      // Fetch the composite resource
      const url = scope === 'Namespaced'
        ? `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${name}`
        : `/apis/${group}/${version}/${plural}/${name}`;

      this.logger.info(`Fetching composite resource: ${url}`);
      const composite = await this.proxyKubernetesRequest(clusterName, url);
      this.logger.info('Composite resource fetched:', composite);
      resources.push(composite);

      // Get managed resources from spec.crossplane.resourceRefs
      const resourceRefs = composite.spec?.crossplane?.resourceRefs;
      this.logger.info('Found resource refs:', resourceRefs);
      if (resourceRefs) {
        for (const ref of resourceRefs) {
          const { name, apiVersion, kind, namespace: refNamespace } = ref;
          this.logger.info('Processing managed resource ref:', { name, apiVersion, kind, namespace: refNamespace });
            
          let group: string;
          let version: string;
          if (apiVersion.includes('/')) {
            [group, version] = apiVersion.split('/');
          } else {
            group = '';
            version = apiVersion;
          }
          this.logger.info('Parsed API version:', { group, version });

          const pluralKind = pluralize(kind.toLowerCase());

          try {
            // Try namespaced first, if it fails try cluster-scoped
            let managed;
            try {
              // Handle core API group resources (like Service, Pod, etc.)
              const mrNamespace = refNamespace || namespace;
              if (!group && version === 'v1') {
                this.logger.info(`Trying core API group namespaced resource: /api/v1/namespaces/${mrNamespace}/${pluralKind}/${name}`);
                managed = await this.proxyKubernetesRequest(
                  clusterName,
                  `/api/v1/namespaces/${mrNamespace}/${pluralKind}/${name}`,
                );
              } else {
                this.logger.info(`Trying namespaced managed resource: /apis/${group}/${version}/namespaces/${mrNamespace}/${pluralKind}/${name}`);
                managed = await this.proxyKubernetesRequest(
                  clusterName,
                  `/apis/${group}/${version}/namespaces/${mrNamespace}/${pluralKind}/${name}`,
                );
              }
            } catch (error) {
              // If not found in namespace, try cluster-scoped
              if (!group && version === 'v1') {
                this.logger.info(`Trying core API group cluster-scoped resource: /api/v1/${pluralKind}/${name}`);
                managed = await this.proxyKubernetesRequest(
                  clusterName,
                  `/api/v1/${pluralKind}/${name}`,
                );
              } else {
                this.logger.info(`Trying cluster-scoped managed resource: /apis/${group}/${version}/${pluralKind}/${name}`);
                managed = await this.proxyKubernetesRequest(
                  clusterName,
                  `/apis/${group}/${version}/${pluralKind}/${name}`,
                );
              }
            }
            this.logger.info('Managed resource fetched:', managed);
            resources.push(managed);

            // For each managed resource, check if it has its own resourceRefs (nested composition)
            const nestedRefs = managed.spec?.crossplane?.resourceRefs;
            this.logger.info('Found nested resource refs:', nestedRefs);
            if (nestedRefs) {
              for (const nestedRef of nestedRefs) {
                const { name, apiVersion, kind, namespace: nestedNamespace } = nestedRef;
                this.logger.info('Processing nested managed resource ref:', { name, apiVersion, kind, namespace: nestedNamespace });
            
                let group: string;
                let version: string;
                if (apiVersion.includes('/')) {
                  [group, version] = apiVersion.split('/');
                } else {
                  group = '';
                  version = apiVersion;
                }
                this.logger.info('Parsed API version:', { group, version });

                const pluralKind = pluralize(kind.toLowerCase());

                try {
                  // Try namespaced first, if it fails try cluster-scoped
                  let nestedManaged;
                  try {
                    // Handle core API group resources (like Service, Pod, etc.)
                    const mrNamespace = nestedNamespace || namespace;
                    if (!group || group === 'v1' || version === 'v1') {
                      this.logger.info(`Trying core API group namespaced resource: /api/v1/namespaces/${mrNamespace}/${pluralKind}/${name}`);
                      nestedManaged = await this.proxyKubernetesRequest(
                        clusterName,
                        `/api/v1/namespaces/${mrNamespace}/${pluralKind}/${name}`,
                      );
                    } else {
                      this.logger.info(`Trying namespaced nested managed resource: /apis/${group}/${version}/namespaces/${mrNamespace}/${pluralKind}/${name}`);
                      nestedManaged = await this.proxyKubernetesRequest(
                        clusterName,
                        `/apis/${group}/${version}/namespaces/${mrNamespace}/${pluralKind}/${name}`,
                      );
                    }
                  } catch (error) {
                    // If not found in namespace, try cluster-scoped
                    if (!group || group === 'v1' || version === 'v1') {
                      this.logger.info(`Trying core API group cluster-scoped resource: /api/v1/${pluralKind}/${name}`);
                      nestedManaged = await this.proxyKubernetesRequest(
                        clusterName,
                        `/api/v1/${pluralKind}/${name}`,
                      );
                    } else {
                      this.logger.info(`Trying cluster-scoped nested managed resource: /apis/${group}/${version}/${pluralKind}/${name}`);
                      nestedManaged = await this.proxyKubernetesRequest(
                        clusterName,
                        `/apis/${group}/${version}/${pluralKind}/${name}`,
                      );
                    }
                  }
                  this.logger.info('Nested managed resource fetched:', nestedManaged);
                  resources.push(nestedManaged);
                } catch (error) {
                  this.logger.error(`Failed to fetch nested managed resource ${name}: ${error}`);
                }
              }
            }
          } catch (error) {
            this.logger.error(`Failed to fetch managed resource ${name}: ${error}`);
          }
        }
      }

      this.logger.info(`Returning resource graph with ${resources.length} resources`);
      return { resources };
    } catch (error) {
      this.logger.error(`Failed to fetch resources for graph: ${error}`);
      throw error;
    }
  }
}