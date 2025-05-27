import {
  KubernetesBuilder,
  KubernetesObjectTypes,
} from '@backstage/plugin-kubernetes-backend';
import { CatalogApi } from '@backstage/catalog-client';
import { PermissionEvaluator } from '@backstage/plugin-permission-common';
import { Config } from '@backstage/config';
import { LoggerService, DiscoveryService } from '@backstage/backend-plugin-api';
import { ANNOTATION_KUBERNETES_AUTH_PROVIDER } from '@backstage/plugin-kubernetes-common';
import { getAuthCredential } from '../auth';

export class CRDDataProvider {
  logger: LoggerService;
  config: Config;
  catalogApi: CatalogApi;
  permissions: PermissionEvaluator;
  discovery: DiscoveryService;

  constructor(
    logger: LoggerService,
    config: Config,
    catalogApi: CatalogApi,
    discovery: DiscoveryService,
    permissions: PermissionEvaluator,
  ) {
    this.logger = logger;
    this.config = config;
    this.catalogApi = catalogApi;
    this.permissions = permissions;
    this.discovery = discovery;
  }

  async fetchCRDObjects(): Promise<any[]> {
    try {
      const builder = KubernetesBuilder.createBuilder({
        logger: this.logger,
        config: this.config,
        catalogApi: this.catalogApi,
        permissions: this.permissions,
        discovery: this.discovery,
      });

      const globalAuthStrategies = (global as any).kubernetesAuthStrategies;
      if (globalAuthStrategies) {
        for (const [key, strategy] of globalAuthStrategies) {
          this.logger.debug(`Adding auth strategy: ${key}`);
          builder.addAuthStrategy(key, strategy);
        }
      }

      const { fetcher, clusterSupplier } = await builder.build();
      const credentials = {
        $$type: '@backstage/BackstageCredentials' as const,
        principal: 'anonymous',
      };

      const clusters = await clusterSupplier.getClusters({ credentials });
      if (clusters.length === 0) {
        this.logger.warn('No clusters found.');
        return [];
      }

      const crdTargets = this.config.getOptionalStringArray(
        'kubernetesIngestor.genericCRDTemplates.crds',
      );
      const labelSelector = this.config.getOptionalConfig(
        'kubernetesIngestor.genericCRDTemplates.crdLabelSelector',
      );
      if (!crdTargets && !labelSelector) {
        return [];
      }

      if (crdTargets && labelSelector) {
        this.logger.warn(
          'Both CRD targets and label selector are configured. Only one should be used. Using CRD targets.',
        );
        return [];
      }

      const crdMap = new Map<string, any>();
      const allowedClusters = this.config.getOptionalStringArray("kubernetesIngestor.allowedClusterNames");
      for (const cluster of clusters) {
        if (allowedClusters && !allowedClusters.includes(cluster.name)) {
          this.logger.debug(`Skipping cluster: ${cluster.name} as it is not included in the allowedClusterNames configuration.`);
          continue;
        }
        // Get the auth provider type from the cluster config
        const authProvider =
          cluster.authMetadata[ANNOTATION_KUBERNETES_AUTH_PROVIDER] ||
          'serviceAccount';

        // Get the auth credentials based on the provider type
        let credential;
        try {
          credential = await getAuthCredential(
            cluster,
            authProvider,
            this.config,
            this.logger,
          );
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(
              `Failed to get auth credentials for cluster ${cluster.name} with provider ${authProvider}:`,
              error,
            );
          } else {
            this.logger.error(
              `Failed to get auth credentials for cluster ${cluster.name} with provider ${authProvider}:`,
              {
                error: String(error),
              },
            );
          }
          continue;
        }

        try {
          const objectTypesToFetch: Set<ObjectToFetch> = new Set([
            {
              group: 'apiextensions.k8s.io',
              apiVersion: 'v1',
              plural: 'customresourcedefinitions',
              objectType: 'customresources' as KubernetesObjectTypes,
            },
          ]);

          let labelSelectorString = '';
          if (labelSelector) {
            const key = labelSelector.getString('key');
            const value = labelSelector.getString('value');
            labelSelectorString = `${key}=${value}`;
          }

          const fetchedObjects = await fetcher.fetchObjectsForService({
            serviceId: 'crdServiceId',
            clusterDetails: cluster,
            credential,
            objectTypesToFetch,
            labelSelector: labelSelectorString,
            customResources: [],
          });

          if (crdTargets) {
            // Process specific CRD targets
            for (const crdTarget of crdTargets) {
              const parts = crdTarget.split('.');
              const plural = parts[0];
              const group = parts.slice(1).join('.');

              const filteredCRDs = fetchedObjects.responses
                .flatMap(response => response.resources)
                .filter(
                  crd =>
                    crd.spec.group === group &&
                    crd.spec.names.plural === plural,
                )
                .map(crd => ({
                  ...crd,
                  clusterName: cluster.name,
                  clusterEndpoint: cluster.url,
                }));

              filteredCRDs.forEach(crd => {
                const crdKey = `${crd.spec.group}/${crd.spec.names.plural}`;
                if (!crdMap.has(crdKey)) {
                  crdMap.set(crdKey, {
                    ...crd,
                    clusters: [cluster.name],
                    clusterDetails: [{ name: cluster.name, url: cluster.url }],
                  });
                } else {
                  const existingCrd = crdMap.get(crdKey);
                  if (!existingCrd.clusters.includes(cluster.name)) {
                    existingCrd.clusters.push(cluster.name);
                    existingCrd.clusterDetails.push({
                      name: cluster.name,
                      url: cluster.url,
                    });
                  }
                }
              });
            }
          } else {
            // Process CRDs based on label selector
            const labeledCRDs = fetchedObjects.responses
              .flatMap(response => response.resources)
              .map(crd => ({
                ...crd,
                clusterName: cluster.name,
                clusterEndpoint: cluster.url,
              }));
            labeledCRDs.forEach(crd => {
              const crdKey = `${crd.spec.group}/${crd.spec.names.plural}`;
              if (!crdMap.has(crdKey)) {
                crdMap.set(crdKey, {
                  ...crd,
                  clusters: [cluster.name],
                  clusterDetails: [{ name: cluster.name, url: cluster.url }],
                });
              } else {
                const existingCrd = crdMap.get(crdKey);
                if (!existingCrd.clusters.includes(cluster.name)) {
                  existingCrd.clusters.push(cluster.name);
                  existingCrd.clusterDetails.push({
                    name: cluster.name,
                    url: cluster.url,
                  });
                }
              }
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch CRD objects for cluster ${cluster.name}: ${error}`,
          );
        }
      }
      return Array.from(crdMap.values());
    } catch (error) {
      this.logger.error('Error fetching CRD objects');
      throw error;
    }
  }
}

type ObjectToFetch = {
  group: string;
  apiVersion: string;
  plural: string;
  objectType: KubernetesObjectTypes;
};
