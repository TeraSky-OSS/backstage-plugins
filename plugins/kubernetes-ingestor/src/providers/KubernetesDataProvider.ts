import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { DefaultKubernetesResourceFetcher } from '../services';
import {
  KubernetesResourceFilter,
  KubernetesResourceFilterContext,
  KubernetesResourceFilterInput,
} from '../types';
import { XRDDataProvider } from './XRDDataProvider';

export interface WorkloadType {
  group: string;
  apiVersion: string;
  plural: string;
  defaultType?: string;
  ingestAsResources?: boolean;
}

export function createBuiltInResourceEligibilityChecker(
  config: Config,
): (resource: KubernetesResourceFilterInput | null | undefined) => boolean {
  const prefix =
    config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
    'terasky.backstage.io';
  const onlyIngestAnnotatedResources =
    config.getOptionalBoolean(
      'kubernetesIngestor.components.onlyIngestAnnotatedResources',
    ) ?? false;
  const excludedNamespaces = new Set(
    config.getOptionalStringArray(
      'kubernetesIngestor.components.excludedNamespaces',
    ) || [],
  );

  return resource => {
    if (!resource?.metadata) return false;
    if (resource.metadata.annotations?.[`${prefix}/exclude-from-catalog`]) {
      return false;
    }
    if (onlyIngestAnnotatedResources) {
      if (!resource.metadata.annotations?.[`${prefix}/add-to-catalog`]) {
        return false;
      }
    } else if (
      resource.metadata.namespace !== undefined &&
      excludedNamespaces.has(resource.metadata.namespace)
    ) {
      return false;
    }
    return true;
  };
}

export function getDisabledResourceType(
  resource: KubernetesResourceFilterInput,
  isCrossplaneEnabled: boolean,
  isKROEnabled: boolean,
): 'Crossplane' | 'KRO' | undefined {
  if (
    !isCrossplaneEnabled &&
    (resource.spec?.resourceRef || resource.spec?.crossplane)
  ) {
    return 'Crossplane';
  }
  if (
    !isKROEnabled &&
    resource.metadata?.labels?.['kro.run/resource-graph-definition-id']
  ) {
    return 'KRO';
  }
  return undefined;
}

export function passesResourceFilters(
  resource: KubernetesResourceFilterInput,
  context: KubernetesResourceFilterContext,
  resourceFilters: readonly KubernetesResourceFilter[],
): boolean {
  return resourceFilters.every(filter => filter(resource, context));
}

export class KubernetesDataProvider {
  constructor(
    private readonly resourceFetcher: DefaultKubernetesResourceFetcher,
    private readonly config: Config,
    private readonly logger: LoggerService,
    private readonly resourceFilters: KubernetesResourceFilter[] = [],
  ) {}

  /**
   * Builds the stable base workload-types list that is shared across all cluster iterations.
   * Includes defaults, custom types, and v2 XRD composite kinds.
   * Per-cluster dynamic types (claims, KRO, generic CRDs) are added only in fetchForCluster.
   */
  async buildBaseWorkloadTypes(): Promise<WorkloadType[]> {
    const disableDefaultWorkloadTypes =
      this.config.getOptionalBoolean(
        'kubernetesIngestor.components.disableDefaultWorkloadTypes',
      ) ?? false;

    const defaultWorkloadTypes: WorkloadType[] = [
      { group: 'apps', apiVersion: 'v1', plural: 'deployments' },
      { group: 'apps', apiVersion: 'v1', plural: 'statefulsets' },
      { group: 'apps', apiVersion: 'v1', plural: 'daemonsets' },
      { group: 'batch', apiVersion: 'v1', plural: 'cronjobs' },
    ];

    const customWorkloadTypes: WorkloadType[] =
      this.config
        .getOptionalConfigArray('kubernetesIngestor.components.customWorkloadTypes')
        ?.map(type => ({
          group: type.getString('group'),
          apiVersion: type.getString('apiVersion'),
          plural: type.getString('plural'),
          defaultType: type.getOptionalString('defaultType'),
          ingestAsResources: type.getOptionalBoolean('ingestAsResources'),
        })) || [];

    const baseWorkloadTypes: WorkloadType[] = [
      ...(disableDefaultWorkloadTypes ? [] : defaultWorkloadTypes),
      ...customWorkloadTypes,
    ];

    const isCrossplaneEnabled = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.enabled') ?? true;

    // Add v2 XRD composite kinds to the base list once, before the per-cluster loop
    if (isCrossplaneEnabled) {
      try {
        const xrdDataProvider = new XRDDataProvider(this.resourceFetcher, this.config, this.logger);
        const xrdObjects = await xrdDataProvider.fetchXRDObjects();
        for (const xrd of xrdObjects) {
          const isV2 = !!xrd.spec?.scope;
          const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
          if (isV2 && scope !== 'LegacyCluster') {
            for (const version of xrd.spec.versions || []) {
              baseWorkloadTypes.push({
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

    return baseWorkloadTypes;
  }

  /**
   * Fetches and enriches all Kubernetes objects for a single cluster.
   * Per-cluster dynamic types (claims, KRO instances, generic CRDs) are appended to a
   * local copy of baseWorkloadTypes so they never accumulate across calls.
   */
  async fetchForCluster(clusterName: string, baseWorkloadTypes: WorkloadType[]): Promise<any[]> {
    const isCrossplaneEnabled = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.enabled') ?? true;
    const isKROEnabled = this.config.getOptionalBoolean('kubernetesIngestor.kro.enabled') ?? false;
    const passesBuiltInEligibility =
      createBuiltInResourceEligibilityChecker(this.config);
    const ingestAllCrossplaneClaims = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.claims.ingestAllClaims') ?? false;
    const ingestAllRGDInstances = this.config.getOptionalBoolean('kubernetesIngestor.kro.instances.ingestAllInstances') ?? false;
    const hasGenericCRDConfig = !!(
      this.config.getOptionalConfig('kubernetesIngestor.genericCRDTemplates.crdLabelSelector') ||
      this.config.getOptionalStringArray('kubernetesIngestor.genericCRDTemplates.crds')
    );

    // Start from the stable base; per-cluster dynamic types appended to local copy only.
    const workloadTypes = [...baseWorkloadTypes];

    if (isCrossplaneEnabled && ingestAllCrossplaneClaims) {
      const claimCRDs = await this.fetchCRDsForCluster(clusterName);
      claimCRDs.forEach(crd => {
        workloadTypes.push({ group: crd.group, apiVersion: crd.version, plural: crd.plural });
      });
    }

    if (isKROEnabled && ingestAllRGDInstances) {
      try {
        const rgds = await this.resourceFetcher.fetchResources({
          clusterName,
          resourcePath: 'kro.run/v1alpha1/resourcegraphdefinitions',
        });

        for (const rgd of rgds as any[]) {
          if (rgd.status?.state !== 'Active') {
            this.logger.debug(`Skipping inactive RGD ${rgd.metadata.name}`);
            continue;
          }

          const crds = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
            query: { labelSelector: `kro.run/resource-graph-definition-id=${rgd.metadata.uid}` },
          });

          if (crds.length === 0) {
            this.logger.warn(`No CRD found for RGD ${rgd.metadata.name}`);
            continue;
          }

          const crd = crds[0] as any;
          for (const version of crd.spec.versions || []) {
            workloadTypes.push({
              group: crd.spec.group,
              apiVersion: version.name,
              plural: crd.spec.names.plural,
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch KRO RGDs for cluster ${clusterName}: ${error}`);
      }
    }

    if (hasGenericCRDConfig) {
      const genericCRDs = await this.fetchGenericCRDs(clusterName);
      genericCRDs.forEach(crd => {
        workloadTypes.push({ group: crd.group, apiVersion: crd.version, plural: crd.plural });
      });
    }

    const fetchedObjects = await Promise.allSettled(
      workloadTypes.map(async (type) => {
        try {
          const resources = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: `${type.group}/${type.apiVersion}/${type.plural}`,
          });
          return resources.map((resource: any) => ({
            ...resource,
            apiVersion: `${type.group}/${type.apiVersion}`,
            kind: resource.kind || type.plural.charAt(0).toUpperCase() + type.plural.slice(1, -1),
            ...(type.defaultType && { workloadType: type.defaultType }),
            ...(type.ingestAsResources !== undefined && { ingestAsResources: type.ingestAsResources }),
          }));
        } catch (error) {
          this.logger.debug(
            `Failed to fetch ${type.group}/${type.apiVersion}/${type.plural} from cluster ${clusterName}: ${error}`,
          );
          return [];
        }
      }),
    );

    const allFetchedObjects = fetchedObjects
      .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
      .map(result => result.value)
      .flat();

    const validObjects = allFetchedObjects.filter((resource: any) =>
      passesBuiltInEligibility(resource),
    );

    const filteredObjects = validObjects.map(async (resource: any) => {
      const disabledResourceType = getDisabledResourceType(
        resource,
        isCrossplaneEnabled,
        isKROEnabled,
      );
      if (disabledResourceType) {
        this.logger.debug(`Skipping ${disabledResourceType} resource: ${resource.kind} ${resource.metadata?.name}`);
        return {};
      }

      if (
        !passesResourceFilters(
          resource,
          { clusterName },
          this.resourceFilters,
        )
      ) {
        return {};
      }

      if (isCrossplaneEnabled && resource.spec?.crossplane?.compositionRef?.name) {
        const composition = await this.fetchComposition(clusterName, resource.spec.crossplane.compositionRef.name);
        const usedFunctions = this.extractUsedFunctions(composition);
        return {
          ...resource,
          clusterName,
          clusterEndpoint: clusterName,
          compositionData: { name: resource.spec.crossplane.compositionRef.name, usedFunctions },
        };
      }

      if (isCrossplaneEnabled && resource.spec?.compositionRef?.name) {
        const composition = await this.fetchComposition(clusterName, resource.spec.compositionRef.name);
        const usedFunctions = this.extractUsedFunctions(composition);
        return {
          ...resource,
          clusterName,
          clusterEndpoint: clusterName,
          compositionData: { name: resource.spec.compositionRef.name, usedFunctions },
        };
      }

      if (isKROEnabled && resource.metadata?.labels?.['kro.run/resource-graph-definition-id']) {
        const rgdId = resource.metadata.labels['kro.run/resource-graph-definition-id'];
        const rgds = await this.resourceFetcher.fetchResources({
          clusterName,
          resourcePath: 'kro.run/v1alpha1/resourcegraphdefinitions',
        });

        const rgd = (rgds as any[]).find((r: any) => r.metadata?.uid === rgdId);
        if (!rgd) {
          return { ...resource, clusterName, clusterEndpoint: clusterName };
        }

        const [resourceGroup] = (resource.apiVersion || '').toLowerCase().split('/');
        const isRGDInstance =
          rgd.spec?.schema?.group?.toLowerCase() === resourceGroup &&
          rgd.spec?.schema?.kind?.toLowerCase() === resource.kind?.toLowerCase();

        if (isRGDInstance) {
          const crds = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
            query: { labelSelector: `kro.run/resource-graph-definition-id=${rgdId}` },
          });
          return {
            ...resource,
            clusterName,
            clusterEndpoint: clusterName,
            kroData: { rgd, crd: crds[0] },
          };
        }
        return { ...resource, clusterName, clusterEndpoint: clusterName };
      }

      return { ...resource, clusterName, clusterEndpoint: clusterName };
    });

    const processedObjects = await Promise.all(filteredObjects);
    return processedObjects.filter(obj => obj && Object.keys(obj).length > 0);
  }

  async fetchKubernetesObjects(): Promise<any[]> {
    try {
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

      const baseWorkloadTypes = await this.buildBaseWorkloadTypes();
      const allObjects: any[] = [];

      for (const clusterName of clusters) {
        try {
          const objects = await this.fetchForCluster(clusterName, baseWorkloadTypes);
          allObjects.push(...objects);
        } catch (error) {
          this.logger.error(`Failed to fetch objects for cluster ${clusterName}: ${error}`);
        }
      }

      return allObjects;
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
            const group = crd.spec?.group;
            if (kind && plural && group) {
              crdMapping[`${group}|${kind}`] = plural;
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
