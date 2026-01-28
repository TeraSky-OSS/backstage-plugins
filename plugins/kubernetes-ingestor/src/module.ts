import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  catalogProcessingExtensionPoint,
} from '@backstage/plugin-catalog-node/alpha';
import { KubernetesEntityProvider, RGDTemplateEntityProvider, XRDTemplateEntityProvider } from './providers';
import { DefaultKubernetesResourceFetcher } from './services';

export const catalogModuleKubernetesIngestor = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'kubernetes-ingestor',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        scheduler: coreServices.scheduler,
        auth: coreServices.auth,
        urlReader: coreServices.urlReader,
      },
      async init({
        catalog,
        logger,
        config,
        discovery,
        scheduler,
        auth,
        urlReader,
      }) {
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.components.taskRunner.frequency',
            ) ?? 600,
          },
          timeout: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.components.taskRunner.timeout',
            ) ?? 600,
          },
        });

        const xrdTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.crossplane.xrds.taskRunner.frequency',
            ) ?? 600,
          },
          timeout: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.crossplane.xrds.taskRunner.timeout',
            ) ?? 600,
          },
        });

        const resourceFetcher = new DefaultKubernetesResourceFetcher(discovery, auth);

        const templateEntityProvider = new KubernetesEntityProvider(
          taskRunner,
          logger,
          config,
          resourceFetcher,
          urlReader,
        );

        const xrdTemplateEntityProvider = new XRDTemplateEntityProvider(
          xrdTaskRunner,
          logger,
          config,
          resourceFetcher,
        );

        const rgdTemplateEntityProvider = new RGDTemplateEntityProvider(
          taskRunner,
          logger,
          config,
          resourceFetcher,
        );
        const kroEnabled = config.getOptionalBoolean('kubernetesIngestor.kro.enabled');
        if (kroEnabled === true) {
          const kroRGDEnabled = config.getOptionalBoolean('kubernetesIngestor.kro.rgds.enabled');
          if (kroRGDEnabled === true) {
            await catalog.addEntityProvider(rgdTemplateEntityProvider);
          }
        }
        const xrdEnabled = config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.enabled');
        await catalog.addEntityProvider(templateEntityProvider);
        // Only disable if explicitly set to false; default is enabled
        if (xrdEnabled !== false) {
          await catalog.addEntityProvider(xrdTemplateEntityProvider);
        }
      },
    });
  },
});
