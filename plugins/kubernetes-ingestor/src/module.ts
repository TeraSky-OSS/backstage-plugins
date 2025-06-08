import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  catalogServiceRef,
  catalogProcessingExtensionPoint,
} from '@backstage/plugin-catalog-node/alpha';
import { KubernetesEntityProvider, XRDTemplateEntityProvider } from './provider/EntityProvider';

export const catalogModuleKubernetes = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'backstage-plugin-kubernetes-scaffolder',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        catalogApi: catalogServiceRef,
        permissions: coreServices.permissions,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        scheduler: coreServices.scheduler,
      },
      async init({
        catalog,
        logger,
        config,
        catalogApi,
        permissions,
        discovery,
        httpAuth,
        auth,
        scheduler,
      }) {
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.components.taskRunner.frequency',
            ),
          },
          timeout: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.components.taskRunner.timeout',
            ),
          },
        });

        const xrdTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.crossplane.xrds.taskRunner.frequency',
            ),
          },
          timeout: {
            seconds: config.getOptionalNumber(
              'kubernetesIngestor.crossplane.xrds.taskRunner.timeout',
            ),
          },
        });
        const templateEntityProvider = new KubernetesEntityProvider(
          taskRunner,
          logger,
          config,
          catalogApi,
          permissions,
          discovery,
          auth,
          httpAuth,
        );

        const xrdTemplateEntityProvider = new XRDTemplateEntityProvider(
          xrdTaskRunner,
          logger,
          config,
          catalogApi,
          discovery,
          permissions,
          auth,
          httpAuth,
        );

        await catalog.addEntityProvider(templateEntityProvider);
        await catalog.addEntityProvider(xrdTemplateEntityProvider);
      },
    });
  },
});
