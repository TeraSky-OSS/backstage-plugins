import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './service/router';
import { crossplanePermissions } from '@terasky/backstage-plugin-crossplane-common';
import { KubernetesService } from './service/KubernetesService';
import { registerMcpActions } from './actions';

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
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        httpRouter,
        logger,
        permissions,
        permissionsRegistry,
        discovery,
        auth,
        actionsRegistry,
      }) {
        permissionsRegistry.addPermissions(Object.values(crossplanePermissions));

        // Create the service instance
        const kubernetesService = new KubernetesService(logger, discovery, auth);
        
        // Register MCP actions
        registerMcpActions(actionsRegistry, kubernetesService);
        
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