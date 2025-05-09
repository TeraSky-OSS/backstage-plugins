import {
  KubernetesBuilder,
  KubernetesObjectTypes,
} from '@backstage/plugin-kubernetes-backend';
import { CatalogApi } from '@backstage/catalog-client';
import { PermissionEvaluator } from '@backstage/plugin-permission-common';
import { Config } from '@backstage/config';
import {
  LoggerService,
  DiscoveryService,
  HttpAuthService,
  AuthService,
} from '@backstage/backend-plugin-api';
import { ANNOTATION_KUBERNETES_AUTH_PROVIDER } from '@backstage/plugin-kubernetes-common';
import { getAuthCredential } from '../auth';

type ObjectToFetch = {
  group: string;
  apiVersion: string;
  plural: string;
  objectType: KubernetesObjectTypes;
};

export class XrdDataProvider {
  logger: LoggerService;
  config: Config;
  catalogApi: CatalogApi;
  permissions: PermissionEvaluator;
  discovery: DiscoveryService;
  auth: AuthService;
  httpAuth: HttpAuthService;

  private getAnnotationPrefix(): string {
    return (
      this.config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
      'terasky.backstage.io'
    );
  }

  constructor(
    logger: LoggerService,
    config: Config,
    catalogApi: CatalogApi,
    discovery: DiscoveryService,
    permissions: PermissionEvaluator,
    auth: AuthService,
    httpAuth: HttpAuthService,
  ) {
    this.logger = logger;
    this.config = config;
    this.catalogApi = catalogApi;
    this.permissions = permissions;
    this.discovery = discovery;
    this.auth = auth;
    this.httpAuth = httpAuth;
  }

  async fetchXRDObjects(): Promise<any[]> {
    try {
      const builder = KubernetesBuilder.createBuilder({
        logger: this.logger,
        config: this.config,
        catalogApi: this.catalogApi,
        permissions: this.permissions,
        discovery: this.discovery,
      });

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

      const ingestAllXRDs =
        this.config.getOptionalBoolean(
          'kubernetesIngestor.crossplane.xrds.ingestAllXRDs',
        ) ?? false;

      let allFetchedObjects: any[] = [];
      const xrdMap = new Map<string, any>();
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
              group: 'apiextensions.crossplane.io',
              apiVersion: 'v1',
              plural: 'compositeresourcedefinitions',
              objectType: 'customresources' as KubernetesObjectTypes,
            },
          ]);

          const fetchedObjects = await fetcher.fetchObjectsForService({
            serviceId: 'xrdServiceId',
            clusterDetails: cluster,
            credential,
            objectTypesToFetch,
            labelSelector: '',
            customResources: [],
          });

          const fetchedResources = fetchedObjects.responses.flatMap(response =>
            response.resources.map(resource => ({
              ...resource,
              clusterName: cluster.name,
              clusterEndpoint: cluster.url,
            })),
          );
          const prefix = this.getAnnotationPrefix();
          const filteredObjects = fetchedResources
            .filter(resource => {
              if (
                resource.metadata.annotations?.[
                `${prefix}/exclude-from-catalog`
                ]
              ) {
                return false;
              }

              if (
                !ingestAllXRDs &&
                !resource.metadata.annotations?.[`${prefix}/add-to-catalog`]
              ) {
                return false;
              }

              if (!resource.spec?.claimNames?.kind) {
                return false;
              }

              return true;
            })
            .map(resource => ({
              ...resource,
              clusterName: cluster.name, // Attach the cluster name to the resource
              clusterEndpoint: cluster.url, // Attach the cluster endpoint to the resource
            }));

          allFetchedObjects = allFetchedObjects.concat(filteredObjects);

          this.logger.debug(
            `Fetched ${filteredObjects.length} objects from cluster: ${cluster.name}`,
          );

          // Fetch all compositions from the cluster
          const compositions = await fetcher.fetchObjectsForService({
            serviceId: 'compositionServiceId',
            clusterDetails: cluster,
            credential,
            objectTypesToFetch: new Set([
              {
                group: 'apiextensions.crossplane.io',
                apiVersion: 'v1',
                plural: 'compositions',
                objectType: 'customresources' as KubernetesObjectTypes,
              },
            ]),
            labelSelector: '',
            customResources: [],
          });

          const fetchedCompositions = compositions.responses.flatMap(response =>
            response.resources.map(resource => ({
              ...resource,
              clusterName: cluster.name,
              clusterEndpoint: cluster.url,
            })),
          );

          // Group XRDs by their name and add clusters and compositions information
          allFetchedObjects.forEach(xrd => {
            const xrdName = xrd.metadata.name;
            if (!xrdMap.has(xrdName)) {
              xrdMap.set(xrdName, {
                ...xrd,
                clusters: [xrd.clusterName],
                clusterDetails: [
                  { name: xrd.clusterName, url: xrd.clusterEndpoint },
                ],
                compositions: [],
              });
            } else {
              const existingXrd = xrdMap.get(xrdName);
              if (!existingXrd.clusters.includes(xrd.clusterName)) {
                existingXrd.clusters.push(xrd.clusterName);
                existingXrd.clusterDetails.push({
                  name: xrd.clusterName,
                  url: xrd.clusterEndpoint,
                });
              }
            }
          });

          // Add compositions to the corresponding XRDs
          fetchedCompositions.forEach(composition => {
            const { apiVersion, kind } = composition.spec.compositeTypeRef;
            xrdMap.forEach(xrd => {
              const { apiVersion: xrdApiVersion, kind: xrdKind } =
                xrd.status.controllers.compositeResourceType;
              if (apiVersion === xrdApiVersion && kind === xrdKind) {
                if (!xrd.compositions.includes(composition.metadata.name)) {
                  xrd.compositions.push(composition.metadata.name);
                }
              }
            });
          });
        } catch (clusterError) {
          if (clusterError instanceof Error) {
            this.logger.error(
              `Failed to fetch XRD objects for cluster ${cluster.name}: ${clusterError.message}`,
              clusterError,
            );
          } else {
            this.logger.error(
              `Failed to fetch XRD objects for cluster ${cluster.name}:`,
              {
                error: String(clusterError),
              },
            );
          }
        }
      }

      this.logger.debug(
        `Total fetched XRD objects: ${allFetchedObjects.length}`,
      );

      return Array.from(xrdMap.values());
    } catch (error) {
      this.logger.error('Error fetching XRD objects');
      throw error;
    }
  }
}
