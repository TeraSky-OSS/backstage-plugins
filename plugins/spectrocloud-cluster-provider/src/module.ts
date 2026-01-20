import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import {
  kubernetesClusterSupplierExtensionPoint,
  KubernetesClustersSupplier,
  ClusterDetails,
} from '@backstage/plugin-kubernetes-node';
import {
  ANNOTATION_KUBERNETES_API_SERVER,
  ANNOTATION_KUBERNETES_API_SERVER_CA,
  ANNOTATION_KUBERNETES_AUTH_PROVIDER,
  ANNOTATION_KUBERNETES_SKIP_METRICS_LOOKUP,
  ANNOTATION_KUBERNETES_SKIP_TLS_VERIFY,
  ANNOTATION_KUBERNETES_DASHBOARD_URL,
  ANNOTATION_KUBERNETES_DASHBOARD_APP,
  ANNOTATION_KUBERNETES_DASHBOARD_PARAMETERS,
} from '@backstage/plugin-kubernetes-common';
import { CATALOG_FILTER_EXISTS } from '@backstage/catalog-client';
import { Config } from '@backstage/config';
import { Duration } from 'luxon';
import { SpectroCloudClusterSupplier } from './supplier/SpectroCloudClusterSupplier';
import { CombinedClustersSupplier } from './supplier/CombinedClustersSupplier';
import dns from 'node:dns';
import { JsonObject } from '@backstage/types';
import * as container from '@google-cloud/container';
import { runPeriodically } from './runPeriodically';

/**
 * Backend module for SpectroCloud Kubernetes cluster discovery.
 *
 * This module creates a combined cluster supplier that includes:
 * - All default cluster suppliers from kubernetes.clusterLocatorMethods (config, catalog, gke, etc.)
 * - SpectroCloud cluster supplier
 *
 * @public
 */
export const kubernetesModuleSpectroCloudClusterSupplier = createBackendModule({
  pluginId: 'kubernetes',
  moduleId: 'spectrocloud-cluster-supplier',
  register(reg) {
    reg.registerInit({
      deps: {
        clusterSupplier: kubernetesClusterSupplierExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        catalog: catalogServiceRef,
        auth: coreServices.auth,
      },
      async init({
        clusterSupplier: clusterSupplierExtPoint,
        logger,
        config,
        catalog,
        auth,
      }) {
        try {
          // Build list of all cluster suppliers
          const suppliers: KubernetesClustersSupplier[] = [];

          // Process kubernetes.clusterLocatorMethods
          const clusterLocatorMethods = config.getOptionalConfigArray('kubernetes.clusterLocatorMethods') ?? [];
          
          for (const method of clusterLocatorMethods) {
            const type = method.getString('type');
            
            if (type === 'config') {
              // Config-based clusters
              const configSupplier = createConfigClusterSupplier(method, logger);
              suppliers.push(configSupplier);
            } else if (type === 'spectrocloud') {
              // SpectroCloud clusters
              try {
                logger.info('Creating SpectroCloud cluster supplier...');
                const spectroSupplier = SpectroCloudClusterSupplier.fromConfig(method, logger);
                
                suppliers.push(spectroSupplier);
                logger.info('✓ Registered SpectroCloud cluster supplier');
                
                // Get configured refresh interval (default: 600 seconds = 10 minutes)
                const refreshIntervalSeconds = method.getOptionalNumber('refreshIntervalSeconds') ?? 600;
                const refreshInterval = Duration.fromObject({ seconds: refreshIntervalSeconds });
                
                // Do initial refresh in background
                spectroSupplier.refreshClusters().then(() => {
                  logger.info(`✓ Initial SpectroCloud refresh complete`);
                }).catch(err => {
                  logger.error(`✗ SpectroCloud refresh failed: ${err}`);
                });
                
                // Start periodic refresh
                setInterval(() => {
                  spectroSupplier.refreshClusters().catch(err => {
                    logger.error(`Periodic SpectroCloud refresh failed: ${err}`);
                  });
                }, refreshInterval.toMillis());
              } catch (error) {
                logger.warn(`Failed to register SpectroCloud supplier: ${error}`);
              }
            } else if (type === 'catalog') {
              // Catalog-based clusters
              const catalogSupplier = createCatalogClusterSupplier(catalog, auth, logger);
              suppliers.push(catalogSupplier);
              logger.info(`✓ Registered catalog cluster supplier`);
            } else if (type === 'localKubectlProxy') {
              // Local kubectl proxy
              const localSupplier = createLocalKubectlProxySupplier(logger);
              suppliers.push(localSupplier);
              logger.info(`✓ Registered localKubectlProxy cluster supplier`);
            } else if (type === 'gke') {
              // GKE clusters
              try {
                const gkeSupplier = createGkeClusterSupplier(method, logger);
                suppliers.push(gkeSupplier);
                logger.info(`✓ Registered GKE cluster supplier`);
              } catch (error) {
                logger.warn(`Failed to register GKE supplier: ${error}`);
              }
            } else {
              logger.warn(`Unknown cluster locator type: "${type}" - skipping`);
            }
          }

          // Create combined supplier
          const combined = new CombinedClustersSupplier(suppliers, logger);
          clusterSupplierExtPoint.addClusterSupplier(combined);
          
          logger.info(`Kubernetes cluster supplier registered with ${suppliers.length} supplier(s)`);
        } catch (error) {
          logger.error(`Failed to initialize SpectroCloud cluster supplier module: ${error}`);
          throw error;
        }
      },
    });
  },
});

/**
 * Create a cluster supplier from config
 */
function createConfigClusterSupplier(
  methodConfig: Config,
  logger: any,
): KubernetesClustersSupplier {
  const clusters: any[] = [];
  
  const clustersConfig = methodConfig.getConfigArray('clusters');
  for (const clusterConfig of clustersConfig) {
    const authProvider = clusterConfig.getString('authProvider');
    const serviceAccountToken = clusterConfig.getOptionalString('serviceAccountToken');
    const oidcTokenProvider = clusterConfig.getOptionalString('oidcTokenProvider');
    
    // Build auth metadata with proper annotation keys
    const authMetadata: Record<string, string> = {
      'kubernetes.io/auth-provider': authProvider,
    };

    // Add provider-specific metadata
    if (serviceAccountToken) {
      authMetadata.serviceAccountToken = serviceAccountToken;
    }
    if (oidcTokenProvider) {
      authMetadata['kubernetes.io/oidc-token-provider'] = oidcTokenProvider;
    }

    const cluster = {
      name: clusterConfig.getString('name'),
      url: clusterConfig.getString('url'),
      authMetadata,
      skipTLSVerify: clusterConfig.getOptionalBoolean('skipTLSVerify') ?? false,
      skipMetricsLookup: clusterConfig.getOptionalBoolean('skipMetricsLookup') ?? false,
      caData: clusterConfig.getOptionalString('caData'),
      caFile: clusterConfig.getOptionalString('caFile'),
    };

    clusters.push(cluster);
  }

  logger.info(`Loaded ${clusters.length} cluster(s) from config`);

  return {
    async getClusters(_options: any) {
      return clusters;
    },
  };
}

/**
 * Create a catalog cluster supplier
 * Replicates the logic from CatalogClusterLocator
 */
function createCatalogClusterSupplier(
  catalogService: any,
  auth: any,
  logger: any,
): KubernetesClustersSupplier {
  return {
    async getClusters(options?: { credentials: any }) {
      const apiServerKey = `metadata.annotations.${ANNOTATION_KUBERNETES_API_SERVER}`;
      const apiServerCaKey = `metadata.annotations.${ANNOTATION_KUBERNETES_API_SERVER_CA}`;
      const authProviderKey = `metadata.annotations.${ANNOTATION_KUBERNETES_AUTH_PROVIDER}`;

      const filter: Record<string, symbol | string> = {
        kind: 'Resource',
        'spec.type': 'kubernetes-cluster',
        [apiServerKey]: CATALOG_FILTER_EXISTS,
        [apiServerCaKey]: CATALOG_FILTER_EXISTS,
        [authProviderKey]: CATALOG_FILTER_EXISTS,
      };

      const clusters = await catalogService.getEntities(
        {
          filter: [filter],
        },
        {
          credentials: options?.credentials ?? (await auth.getNoneCredentials()),
        },
      );
      
      logger.info(`Loaded ${clusters.items.length} cluster(s) from catalog`);
      
      return clusters.items.map((entity: any) => {
        const annotations = entity.metadata.annotations!;
        
        // Parse dashboard parameters if present
        let dashboardParameters: JsonObject | undefined;
        const dashboardParamsRaw = annotations[ANNOTATION_KUBERNETES_DASHBOARD_PARAMETERS];
        if (dashboardParamsRaw) {
          try {
            const parsed = JSON.parse(dashboardParamsRaw);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              dashboardParameters = parsed as JsonObject;
            }
          } catch (e) {
            logger.warn(`Failed to parse dashboard parameters for cluster ${entity.metadata.name}: ${e}`);
          }
        }
        
        const clusterDetails: ClusterDetails = {
          name: entity.metadata.name,
          title: entity.metadata.title,
          url: annotations[ANNOTATION_KUBERNETES_API_SERVER],
          authMetadata: annotations,
          caData: annotations[ANNOTATION_KUBERNETES_API_SERVER_CA],
          skipMetricsLookup: annotations[ANNOTATION_KUBERNETES_SKIP_METRICS_LOOKUP] === 'true',
          skipTLSVerify: annotations[ANNOTATION_KUBERNETES_SKIP_TLS_VERIFY] === 'true',
          dashboardUrl: annotations[ANNOTATION_KUBERNETES_DASHBOARD_URL],
          dashboardApp: annotations[ANNOTATION_KUBERNETES_DASHBOARD_APP],
          dashboardParameters,
        };

        return clusterDetails;
      });
    },
  };
}

/**
 * Create a local kubectl proxy cluster supplier
 * Replicates the logic from LocalKubectlProxyClusterLocator
 */
function createLocalKubectlProxySupplier(logger: any): KubernetesClustersSupplier {
  // verbatim: when false, IPv4 addresses are placed before IPv6 addresses
  // By default kubectl proxy listens on 127.0.0.1 instead of [::1]
  const lookupPromise = dns.promises.lookup('localhost', { verbatim: false });

  const clusterDetails: ClusterDetails = {
    name: 'local',
    url: 'http://localhost:8001',
    authMetadata: {
      [ANNOTATION_KUBERNETES_AUTH_PROVIDER]: 'localKubectlProxy',
    },
    skipMetricsLookup: true,
  };

  logger.info(`Configured localKubectlProxy cluster`);

  return {
    async getClusters() {
      const lookupResolution = await lookupPromise;
      clusterDetails.url = `http://${lookupResolution.address}:8001`;
      return [clusterDetails];
    },
  };
}

/**
 * Create a GKE cluster supplier
 * Replicates the logic from GkeClusterLocator
 */
function createGkeClusterSupplier(
  methodConfig: Config,
  logger: any,
): KubernetesClustersSupplier {
  interface MatchResourceLabelEntry {
    key: string;
    value: string;
  }

  const matchingResourceLabels: MatchResourceLabelEntry[] =
    methodConfig.getOptionalConfigArray('matchingResourceLabels')?.map(mrl => {
      return { key: mrl.getString('key'), value: mrl.getString('value') };
    }) ?? [];

  const storeAuthProviderString =
    methodConfig.getOptionalString('authProvider') === 'googleServiceAccount'
      ? 'googleServiceAccount'
      : 'google';

  const options = {
    projectId: methodConfig.getString('projectId'),
    authProvider: storeAuthProviderString,
    region: methodConfig.getOptionalString('region') ?? '-',
    skipTLSVerify: methodConfig.getOptionalBoolean('skipTLSVerify') ?? false,
    skipMetricsLookup: methodConfig.getOptionalBoolean('skipMetricsLookup') ?? false,
    exposeDashboard: methodConfig.getOptionalBoolean('exposeDashboard') ?? false,
    matchingResourceLabels,
  };

  const client = new container.v1.ClusterManagerClient();
  let clusterDetails: ClusterDetails[] = [];

  const refreshClusters = async () => {
    const {
      projectId,
      region,
      authProvider,
      skipTLSVerify,
      skipMetricsLookup,
      exposeDashboard,
      matchingResourceLabels,
    } = options;
    
    const request = {
      parent: `projects/${projectId}/locations/${region}`,
    };

    try {
      const [response] = await client.listClusters(request);
      clusterDetails = (response.clusters ?? [])
        .filter(r => {
          return matchingResourceLabels?.every(mrl => {
            if (!r.resourceLabels) {
              return false;
            }
            return r.resourceLabels[mrl.key] === mrl.value;
          });
        })
        .map(r => ({
          name: r.name ?? 'unknown',
          url: `https://${r.endpoint ?? ''}`,
          authMetadata: { [ANNOTATION_KUBERNETES_AUTH_PROVIDER]: authProvider },
          skipTLSVerify,
          skipMetricsLookup,
          ...(exposeDashboard
            ? {
                dashboardApp: 'gke',
                dashboardParameters: {
                  projectId,
                  region,
                  clusterName: r.name,
                },
              }
            : {}),
        }));
      logger.info(`Loaded ${clusterDetails.length} cluster(s) from GKE`);
    } catch (e) {
      logger.error(`Failed to retrieve clusters from GKE for projectId=${projectId} region=${region}: ${e}`);
    }
  };

  // Setup periodic refresh
  const refreshInterval = methodConfig.getOptionalString('refreshInterval');
  if (refreshInterval) {
    const duration = Duration.fromISO(refreshInterval);
    runPeriodically(refreshClusters, duration.toMillis());
  } else {
    // Default: refresh once on startup
    refreshClusters().catch(err => {
      logger.error(`Failed initial GKE cluster refresh: ${err}`);
    });
  }

  return {
    async getClusters() {
      return clusterDetails;
    },
  };
}

