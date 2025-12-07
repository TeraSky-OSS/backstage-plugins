import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './service/router';
import { kyvernoPermissions } from '@terasky/backstage-plugin-kyverno-common';
import { KubernetesService } from './service/KubernetesService';
import { registerMcpActions } from './actions';

/**
 * kyvernoPolicyReportsPlugin backend plugin
 *
 * @public
 */
export const kyvernoPolicyReportsPlugin = createBackendPlugin({
  pluginId: 'kyverno',
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
        permissionsRegistry.addPermissions(Object.values(kyvernoPermissions));

        // Create the service instance
        const kubernetesService = new KubernetesService(logger, discovery, auth);
        
        // Register MCP actions
        registerMcpActions(actionsRegistry, kubernetesService, permissions, auth);
        
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