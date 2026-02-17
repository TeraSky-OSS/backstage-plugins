import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';
import { VcfAutomationEntityProvider } from './provider/EntityProvider';

/**
 * @public
 * The VCF Automation ingestion module.
 */
export const vcfAutomationIngestorModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'vcf-automation-ingestor',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
      },
      async init({ catalog, config, scheduler, logger }) {
        try {
          // Create and register the provider
          const provider = new VcfAutomationEntityProvider(config, scheduler, logger);
          catalog.addEntityProvider(provider);
          logger.info('VCF Automation Entity Provider registered successfully');
        } catch (error) {
          logger.error('Failed to initialize VCF Automation Entity Provider', {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    });
  },
});
