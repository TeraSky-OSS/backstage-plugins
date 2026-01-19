import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './service/router';
import { crossplanePermissions } from '@terasky/backstage-plugin-crossplane-common';
import { KubernetesService } from './service/KubernetesService';
import { registerMcpActions } from './actions';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
/**
 * crossplaneResourcesPlugin backend plugin
 *
 * @public
 */
export const crossplaneResourcesBackendPlugin = createBackendPlugin({
  pluginId: 'crossplane',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        permissions: coreServices.permissions,
        permissionsRegistry: coreServices.permissionsRegistry,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        actionsRegistry: actionsRegistryServiceRef,
        catalogService: catalogServiceRef,
      },
      async init({
        httpRouter,
        logger,
        permissions,
        permissionsRegistry,
        discovery,
        auth,
        config,
        actionsRegistry,
        catalogService,
      }) {
        permissionsRegistry.addPermissions(Object.values(crossplanePermissions));

        // Create the service instance
        const kubernetesService = new KubernetesService(logger, discovery, auth);
        
        // Register MCP actions
        registerMcpActions(
          actionsRegistry,
          kubernetesService,
          catalogService,
          permissions,
          auth,
          config,
        );
        
        httpRouter.use(
          await createRouter({
            logger,
            permissions,
            discovery,
            auth,
            kubernetesService,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
