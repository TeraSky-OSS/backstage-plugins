import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  kubernetesClusterSupplierExtensionPoint,
} from '@backstage/plugin-kubernetes-node';
import { Duration } from 'luxon';
import { SpectroCloudClusterSupplier } from './supplier/SpectroCloudClusterSupplier';

/**
 * Backend module for SpectroCloud Kubernetes cluster discovery.
 *
 * This module extends the default Kubernetes cluster supplier to add SpectroCloud clusters.
 * It uses the factory pattern to get the OOTB combined supplier (which handles config, catalog, 
 * gke, localKubectlProxy, etc.) and wraps it to add SpectroCloud cluster discovery.
 * 
 * Configuration is read from the 'spectrocloud' config section (not kubernetes.clusterLocatorMethods)
 * to avoid conflicts with the default Kubernetes plugin processing.
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
      },
      async init({ clusterSupplier: clusterSupplierExtPoint, logger, config }) {
        // Check for SpectroCloud configuration (array of instances)
        const spectroConfigs = config.getOptionalConfigArray('spectrocloud');
        
        // If no SpectroCloud config, don't register anything - let default plugin handle it
        if (!spectroConfigs || spectroConfigs.length === 0) {
          logger.info('No SpectroCloud configuration found, using only default suppliers');
          return;
        }

        logger.info(`Found ${spectroConfigs.length} SpectroCloud instance(s) configured`);

        // Use factory pattern to extend the default cluster supplier
        clusterSupplierExtPoint.addClusterSupplier(async ({ getDefault }) => {
          try {
            // Get the OOTB combined supplier (handles config, catalog, gke, localKubectlProxy, etc.)
            const defaultSupplier = await getDefault();
            logger.info('✓ Loaded default Kubernetes cluster suppliers');

            // Create SpectroCloud suppliers for each instance
            const spectroSuppliers: Array<{ supplier: SpectroCloudClusterSupplier; name: string }> = [];
            
            for (let i = 0; i < spectroConfigs.length; i++) {
              const instanceConfig = spectroConfigs[i];
              const configuredName = instanceConfig.getOptionalString('name');
              const instanceName = configuredName || `${instanceConfig.getString('tenant')}@${instanceConfig.getString('url')}`;
              
              try {
                logger.info(`Creating SpectroCloud cluster supplier for instance: ${instanceName}${configuredName ? ' (name: ' + configuredName + ')' : ''}`);
                const spectroSupplier = SpectroCloudClusterSupplier.fromConfig(instanceConfig, logger);
                spectroSuppliers.push({ supplier: spectroSupplier, name: instanceName });
                logger.info(`✓ Created SpectroCloud cluster supplier for ${instanceName}`);

                // Get configured refresh interval from clusterProvider section (default: 600 seconds = 10 minutes)
                const clusterProviderConfig = instanceConfig.getOptionalConfig('clusterProvider');
                const refreshIntervalSeconds = clusterProviderConfig?.getOptionalNumber('refreshIntervalSeconds') ?? 600;
                const refreshInterval = Duration.fromObject({ seconds: refreshIntervalSeconds });

                // Do initial refresh in background
                spectroSupplier.refreshClusters().then(() => {
                  logger.info(`✓ Initial cluster refresh complete for ${instanceName}`);
                }).catch(err => {
                  logger.error(`✗ Initial cluster refresh failed for ${instanceName}: ${err}`);
                });

                // Start periodic refresh
                setInterval(() => {
                  spectroSupplier.refreshClusters().catch(err => {
                    logger.error(`Periodic cluster refresh failed for ${instanceName}: ${err}`);
                  });
                }, refreshInterval.toMillis());
              } catch (error) {
                logger.error(`Failed to initialize SpectroCloud supplier for ${instanceName}: ${error}`);
              }
            }

            if (spectroSuppliers.length === 0) {
              logger.warn('No SpectroCloud suppliers were successfully created');
              return defaultSupplier;
            }

            logger.info(`✓ Successfully created ${spectroSuppliers.length} SpectroCloud cluster supplier(s)`);

            // Return a wrapper that combines all suppliers
            return {
              async getClusters(options) {
                // Get clusters from all sources in parallel
                const allResults = await Promise.all([
                  defaultSupplier.getClusters(options),
                  ...spectroSuppliers.map(s => s.supplier.getClusters(options)),
                ]);

                const defaultClusters = allResults[0];
                const spectroClusters = allResults.slice(1).flat();
                const allClusters = [...defaultClusters, ...spectroClusters];
                
                // Warn about duplicates
                const clusterNames = new Set<string>();
                const duplicatedNames = new Set<string>();
                for (const clusterName of allClusters.map(c => c.name)) {
                  if (clusterNames.has(clusterName)) {
                    duplicatedNames.add(clusterName);
                  } else {
                    clusterNames.add(clusterName);
                  }
                }
                for (const clusterName of duplicatedNames) {
                  logger.warn(`Duplicate cluster name '${clusterName}'`);
                }

                logger.debug(
                  `Combined cluster supplier returning ${allClusters.length} clusters ` +
                  `(${defaultClusters.length} default + ${spectroClusters.length} SpectroCloud)`
                );

                return allClusters;
              },
            };
          } catch (error) {
            logger.error(`Failed to initialize SpectroCloud cluster supplier: ${error}`);
            // On error, return default supplier so we don't break the entire Kubernetes plugin
            return await getDefault();
          }
        });
      },
    });
  },
});
