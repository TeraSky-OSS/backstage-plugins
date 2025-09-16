import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { DefaultKubernetesResourceFetcher } from '../services';
import { XRDDataProvider } from './XRDDataProvider';
import { RGDDataProvider } from './RGDDataProvider';


export class KubernetesDataProvider {
  constructor(
    private readonly resourceFetcher: DefaultKubernetesResourceFetcher,
    private readonly config: Config,
    private readonly logger: LoggerService,
  ) {}

  private getAnnotationPrefix(): string {
    return (
      this.config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
      'terasky.backstage.io'
    );
  }

  async fetchKubernetesObjects(): Promise<any[]> {
    try {
      // Get allowed clusters from config or discover them
      const allowedClusters = this.config.getOptionalStringArray('kubernetesIngestor.allowedClusterNames');
      let clusters: string[] = [];
      
      if (allowedClusters) {
        clusters = allowedClusters;
      } else {
        try {
          clusters = await this.resourceFetcher.getClusters();
        } catch (error) {
          this.logger.error('Failed to discover clusters:', error instanceof Error ? error : { error: String(error) });
          return [];
        }
      }

      if (clusters.length === 0) {
        this.logger.warn('No clusters found.');
        return [];
      }

      const disableDefaultWorkloadTypes =
        this.config.getOptionalBoolean(
          'kubernetesIngestor.components.disableDefaultWorkloadTypes',
        ) ?? false;

      const defaultWorkloadTypes = [
        {
          group: 'apps',
          apiVersion: 'v1',
          plural: 'deployments',
        },
        {
          group: 'apps',
          apiVersion: 'v1',
          plural: 'statefulsets',
        },
        {
          group: 'apps',
          apiVersion: 'v1',
          plural: 'daemonsets',
        },
        {
          group: 'batch',
          apiVersion: 'v1',
          plural: 'cronjobs',
        },
      ];

      const customWorkloadTypes =
        this.config
          .getOptionalConfigArray(
            'kubernetesIngestor.components.customWorkloadTypes',
          )
          ?.map(type => ({
            group: type.getString('group'),
            apiVersion: type.getString('apiVersion'),
            plural: type.getString('plural'),
          })) || [];

      const workloadTypes = [
        ...(disableDefaultWorkloadTypes ? [] : defaultWorkloadTypes),
        ...customWorkloadTypes,
      ];

      const isCrossplaneEnabled = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.enabled') ?? true;
      const isKROEnabled = this.config.getOptionalBoolean('kubernetesIngestor.kro.enabled') ?? false;

      // Only add Crossplane-related objects if the feature is enabled
      if (isCrossplaneEnabled) {
        // --- BEGIN: Add all v2/Cluster and v2/Namespaced composite kinds (XRs) to workloadTypes ---
        try {
          const xrdDataProvider = new XRDDataProvider(
            this.resourceFetcher,
            this.config,
            this.logger,
          );
          const xrdObjects = await xrdDataProvider.fetchXRDObjects();
          for (const xrd of xrdObjects) {
            const isV2 = !!xrd.spec?.scope;
            const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
            if (isV2 && scope !== 'LegacyCluster') {
              for (const version of xrd.spec.versions || []) {
                workloadTypes.push({
                  group: xrd.spec.group,
                  apiVersion: version.name,
                  plural: xrd.spec.names.plural,
                });
              }
            }
          }
        } catch (error) {
          this.logger.error('Failed to fetch XRD objects:', error as Error);
        }
      }

      // Add KRO-related objects if the feature is enabled
      if (isKROEnabled) {
        try {
          const rgdDataProvider = new RGDDataProvider(
            this.resourceFetcher,
            this.config,
            this.logger,
          );
          const rgdObjects = await rgdDataProvider.fetchRGDObjects();
          for (const rgd of rgdObjects) {
            if (rgd.generatedCRD) {
              const crd = rgd.generatedCRD;
              for (const version of crd.spec.versions || []) {
                workloadTypes.push({
                  group: crd.spec.group,
                  apiVersion: version.name,
                  plural: crd.spec.names.plural,
                });
              }
            }
          }
        } catch (error) {
          this.logger.error('Failed to fetch RGD objects:', error as Error);
        }
      }

      const onlyIngestAnnotatedResources = this.config.getOptionalBoolean('kubernetesIngestor.components.onlyIngestAnnotatedResources') ?? false;
      const excludedNamespaces = new Set(this.config.getOptionalStringArray('kubernetesIngestor.components.excludedNamespaces') || []);
      const ingestAllCrossplaneClaims = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.claims.ingestAllClaims') ?? false;
      const ingestAllRGDInstances = this.config.getOptionalBoolean('kubernetesIngestor.kro.instances.ingestAllInstances') ?? false;

      const allObjects: any[] = [];

      for (const clusterName of clusters) {
        try {
          // Only fetch Crossplane claims if enabled
          if (isCrossplaneEnabled && ingestAllCrossplaneClaims) {
            const claimCRDs = await this.fetchCRDsForCluster(clusterName);
            claimCRDs.forEach(crd => {
              workloadTypes.push({
                group: crd.group,
                apiVersion: crd.version,
                plural: crd.plural,
              });
            });
          }

          // Only fetch KRO instances if enabled
          if (isKROEnabled && ingestAllRGDInstances) {
            const rgdDataProvider = new RGDDataProvider(
              this.resourceFetcher,
              this.config,
              this.logger,
            );
            const rgdObjects = await rgdDataProvider.fetchRGDObjects();
            for (const rgd of rgdObjects) {
              if (rgd.generatedCRD) {
                const crd = rgd.generatedCRD;
                for (const version of crd.spec.versions || []) {
                  workloadTypes.push({
                    group: crd.spec.group,
                    apiVersion: version.name,
                    plural: crd.spec.names.plural,
                  });
                }
              }
            }
          }

          if (
            this.config.getOptionalConfig(
              'kubernetesIngestor.genericCRDTemplates.crdLabelSelector',
            ) ||
            this.config.getOptionalStringArray(
              'kubernetesIngestor.genericCRDTemplates.crds',
            )
          ) {
            const genericCRDs = await this.fetchGenericCRDs(clusterName);
            genericCRDs.forEach(crd => {
              workloadTypes.push({
                group: crd.group,
                apiVersion: crd.version,
                plural: crd.plural,
              });
            });
          }

          const fetchedObjects = await Promise.all(
            workloadTypes.map(async (type) => {
              const resources = await this.resourceFetcher.fetchResources({
                clusterName,
                resourcePath: `${type.group}/${type.apiVersion}/${type.plural}`,
              });
              return resources.map((resource: any) => ({
                ...resource,
                apiVersion: `${type.group}/${type.apiVersion}`,
                kind: resource.kind || type.plural.charAt(0).toUpperCase() + type.plural.slice(1, -1),
              }));
            })
          );
          const prefix = this.getAnnotationPrefix();
          const allFetchedObjects = fetchedObjects.flat();
          const filteredObjects = allFetchedObjects
            .filter((resource: any) => {
              if (
                resource.metadata.annotations?.[
                  `${prefix}/exclude-from-catalog`
                ]
              ) {
                return false;
              }

              if (onlyIngestAnnotatedResources) {
                return resource.metadata.annotations?.[
                  `${prefix}/add-to-catalog`
                ];
              }

              return !excludedNamespaces.has(resource.metadata.namespace);
            })
            .map(async (resource: any) => {
              // Skip Crossplane-related resources if disabled
              if (!isCrossplaneEnabled) {
                // Check if it's a Crossplane resource
                if (resource.spec?.resourceRef || resource.spec?.crossplane) {
                  this.logger.debug(`Skipping Crossplane resource: ${resource.kind} ${resource.metadata?.name}`);
                  return {};
                }
              }

              // Skip KRO-related resources if disabled
              if (!isKROEnabled) {
                // Check if it's a KRO resource by looking for the RGD label
                if (resource.metadata?.labels?.['kro.run/resource-graph-definition-id']) {
                  this.logger.debug(`Skipping KRO resource: ${resource.kind} ${resource.metadata?.name}`);
                  return {};
                }
              }

              // Handle v2 composites: spec.crossplane.compositionRef.name
              if (isCrossplaneEnabled && resource.spec?.crossplane?.compositionRef?.name) {
                const composition = await this.fetchComposition(
                  clusterName,
                  resource.spec.crossplane.compositionRef.name,
                );
                const usedFunctions = this.extractUsedFunctions(composition);

                return {
                  ...resource,
                  clusterName,
                  clusterEndpoint: clusterName,
                  compositionData: {
                    name: resource.spec.crossplane.compositionRef.name,
                    usedFunctions,
                  },
                };
              }
              // Handle claims: spec.compositionRef.name
              if (isCrossplaneEnabled && resource.spec?.compositionRef?.name) {
                const composition = await this.fetchComposition(
                  clusterName,
                  resource.spec.compositionRef.name,
                );
                const usedFunctions = this.extractUsedFunctions(composition);

                return {
                  ...resource,
                  clusterName,
                  clusterEndpoint: clusterName,
                  compositionData: {
                    name: resource.spec.compositionRef.name,
                    usedFunctions,
                  },
                };
              }

              // Handle KRO instances
              if (isKROEnabled && resource.metadata?.labels?.['kro.run/resource-graph-definition-id']) {
                const rgdId = resource.metadata.labels['kro.run/resource-graph-definition-id'];

                // First get the RGD
                const rgds = await this.resourceFetcher.fetchResources({
                  clusterName,
                  resourcePath: 'kro.run/v1alpha1/resourcegraphdefinitions',
                });

                const rgd = (rgds as any[]).find((r: any) => r.metadata?.uid === rgdId);
                if (!rgd) {
                  return {
                    ...resource,
                    clusterName,
                    clusterEndpoint: clusterName,
                  };
                }

                if (rgd) {
                  // Check if this resource is an actual RGD instance (matches the RGD's schema)
                  // and not just a resource created by an RGD instance
                  const [resourceGroup] = (resource.apiVersion || '').toLowerCase().split('/');
                  const isRGDInstance = rgd.spec?.schema?.group?.toLowerCase() === resourceGroup && 
                                      rgd.spec?.schema?.kind?.toLowerCase() === resource.kind?.toLowerCase();


                  if (isRGDInstance) {
                    // Then get the CRD for this RGD
                    const crds = await this.resourceFetcher.fetchResources({
                      clusterName,
                      resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
                      query: {
                        labelSelector: `kro.run/resource-graph-definition-id=${rgdId}`,
                      },
                    });


                    // Just add the RGD and CRD info to the resource for use by EntityProvider
                    return {
                      ...resource,
                      clusterName,
                      clusterEndpoint: clusterName,
                      kroData: {
                        rgd,
                        crd: crds[0],
                      },
                    };
                  }
                  return {
                    ...resource,
                    clusterName,
                    clusterEndpoint: clusterName,
                  };
                }
                return {
                  ...resource,
                  clusterName,
                  clusterEndpoint: clusterName,
                };
              }

              return {
                ...resource,
                clusterName,
                clusterEndpoint: clusterName,
              };
            });

          allObjects.push(...(await Promise.all(filteredObjects)));
        } catch (error) {
          this.logger.error(
            `Failed to fetch objects for cluster ${clusterName}: ${error}`,
          );
        }
      }

      return allObjects.filter(obj => Object.keys(obj).length > 0);
    } catch (error) {
      this.logger.error('Error fetching Kubernetes objects:', error as Error);
      return [];
    }
  }

  private async fetchComposition(
    clusterName: string,
    compositionName: string,
  ): Promise<any> {
    const compositions = await this.resourceFetcher.fetchResources({
      clusterName,
      resourcePath: 'apiextensions.crossplane.io/v1/compositions',
    });

    return (compositions as any[]).find(
      composition => composition.metadata.name === compositionName,
    );
  }

  private extractUsedFunctions(composition: any): string[] {
    const usedFunctions = new Set<string>();
    if (composition?.spec?.pipeline) {
      composition.spec.pipeline.forEach(
        (item: { functionRef: { name: string } }) => {
          if (item.functionRef?.name) {
            usedFunctions.add(item.functionRef.name);
          }
        },
      );
    }
    return Array.from(usedFunctions);
  }

  async fetchCRDMapping(): Promise<Record<string, string>> {
    try {
      // Get allowed clusters from config or discover them
      const allowedClusters = this.config.getOptionalStringArray('kubernetesIngestor.allowedClusterNames');
      let clusters: string[] = [];
      
      if (allowedClusters) {
        clusters = allowedClusters;
      } else {
        try {
          clusters = await this.resourceFetcher.getClusters();
        } catch (error) {
          this.logger.error('Failed to discover clusters:', error instanceof Error ? error : { error: String(error) });
          return {};
        }
      }

      if (clusters.length === 0) {
        this.logger.warn('No clusters found for CRD mapping.');
        return {};
      }

      const crdMapping: Record<string, string> = {};

      for (const clusterName of clusters) {
        try {
          const crds = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
          });

          (crds as any[]).forEach(crd => {
            const kind = crd.spec?.names?.kind;
            const plural = crd.spec?.names?.plural;
            if (kind && plural) {
              crdMapping[kind] = plural;
            }
          });
        } catch (clusterError) {
          if (clusterError instanceof Error) {
            this.logger.error(
              `Failed to fetch objects for cluster ${clusterName}: ${clusterError.message}`,
              clusterError,
            );
          } else {
            this.logger.error(
              `Failed to fetch objects for cluster ${clusterName}:`,
              {
                error: String(clusterError),
              },
            );
          }
        }
      }

      return crdMapping;
    } catch (error) {
      this.logger.error('Error fetching Kubernetes objects:', error as Error);
      return {};
    }
  }

  private async fetchCRDsForCluster(
    clusterName: string,
  ): Promise<{ group: string; version: string; plural: string }[]> {
    const crds = await this.resourceFetcher.fetchResources({
      clusterName,
      resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
    });

    return (crds as any[])
      .filter(
        (resource: any) =>
          resource?.spec?.names?.categories?.includes('claim'),
      )
      .map(
        (crd: any) => ({
          group: crd.spec.group,
          version: crd.spec.versions[0]?.name || '',
          plural: crd.spec.names.plural,
        }),
      );
  }

  private async fetchGenericCRDs(
    clusterName: string,
  ): Promise<{ group: string; version: string; plural: string }[]> {
    const labelSelector = this.config.getOptionalConfig(
      'kubernetesIngestor.genericCRDTemplates.crdLabelSelector',
    );
    const specificCRDs =
      this.config.getOptionalStringArray(
        'kubernetesIngestor.genericCRDTemplates.crds',
      ) || [];

    const crds = await this.resourceFetcher.fetchResources({
      clusterName,
      resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
      query: labelSelector ? {
        labelSelector: `${labelSelector.getString('key')}=${labelSelector.getString('value')}`,
      } : undefined,
    });

    return (crds as any[])
      .filter((crd: any) => {
        if (specificCRDs.length > 0) {
          return specificCRDs.includes(crd.metadata.name);
        }
        return true;
      })
      .map(
        (crd: any) => {
          const storageVersion =
            crd.spec.versions.find((version: any) => version.storage) ||
            crd.spec.versions[0];
          return {
            group: crd.spec.group,
            version: storageVersion.name,
            plural: crd.spec.names.plural,
          };
        },
      );
  }
}
