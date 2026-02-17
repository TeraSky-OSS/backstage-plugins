import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  catalogProcessingExtensionPoint,
} from '@backstage/plugin-catalog-node';
import { SpectroCloudEntityProvider } from './providers/SpectroCloudEntityProvider';

/**
 * Catalog module that ingests SpectroCloud resources into the Backstage catalog.
 * 
 * Discovers and creates:
 * - Projects as System entities
 * - Cluster Profiles as Resource entities  
 * - Clusters as Resource entities
 */
export const catalogModuleSpectroCloudIngestor = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'spectrocloud-ingestor',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
      },
      async init({ catalog, logger, config, scheduler }) {
        const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
        
        if (!spectroCloudConfig) {
          logger.info('No SpectroCloud configuration found, skipping ingestor');
          return;
        }

        const spectroCloudEnvironments = spectroCloudConfig.getOptionalConfigArray('environments');
        
        if (!spectroCloudEnvironments || spectroCloudEnvironments.length === 0) {
          logger.info('No SpectroCloud environments configured, skipping ingestor');
          return;
        }

        // Check if any instance has catalog provider enabled
        const hasEnabledProvider = spectroCloudEnvironments.some(cfg => 
          cfg.getOptionalBoolean('catalogProvider.enabled') !== false
        );

        if (!hasEnabledProvider) {
          logger.info('SpectroCloud catalog provider is disabled for all instances');
          return;
        }

        // Get refresh interval from the first enabled instance
        const firstEnabledConfig = spectroCloudEnvironments.find(cfg =>
          cfg.getOptionalBoolean('catalogProvider.enabled') !== false
        );

        const refreshIntervalSeconds = firstEnabledConfig?.getOptionalNumber(
          'catalogProvider.refreshIntervalSeconds'
        ) ?? 600;
        
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: refreshIntervalSeconds },
          timeout: { seconds: refreshIntervalSeconds },
        });
        
        const provider = new SpectroCloudEntityProvider(
          taskRunner,
          logger,
          config,
        );
        
        await catalog.addEntityProvider(provider);
        logger.info('SpectroCloud ingestor registered successfully');
      },
    });
  },
});

export default catalogModuleSpectroCloudIngestor;
