import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './service/router';
import { kroPermissions } from '@terasky/backstage-plugin-kro-common';
import { registerMcpActions } from './actions';
import { KubernetesService } from './service/KubernetesService';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

/**
 * kroPermissionsPlugin backend plugin
 *
 * @public
 */
export const kroResourcesBackendPlugin = createBackendPlugin({
  pluginId: 'kro',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        permissions: coreServices.permissions,
        permissionsRegistry: coreServices.permissionsRegistry,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
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
        actionsRegistry,
        catalogService,
      }) {
        permissionsRegistry.addPermissions(Object.values(kroPermissions));

        // Create the service instance
        const service = new KubernetesService(logger, discovery, auth);

        // Register MCP actions
        registerMcpActions(actionsRegistry, service, catalogService, permissions, auth);

        httpRouter.use(
          await createRouter({
            logger,
            permissions,
            discovery,
            auth,
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