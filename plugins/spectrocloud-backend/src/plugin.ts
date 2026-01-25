import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { CatalogClient } from '@backstage/catalog-client';
import { createRouter } from './router';
import { registerMcpActions } from './actions';
import { spectroCloudPermissions } from '@terasky/backstage-plugin-spectrocloud-common';

/**
 * SpectroCloud backend plugin that provides:
 * - HTTP API endpoints for frontend communication (kubeconfig download, etc.)
 * - MCP actions for AI agents
 * - Permission definitions for access control
 * 
 * For catalog entity ingestion, add the separate ingestor module:
 * backend.add(import('@terasky/backstage-plugin-spectrocloud-ingestor'));
 * 
 * @public
 */
export const spectroCloudPlugin = createBackendPlugin({
  pluginId: 'spectrocloud',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        actionsRegistry: actionsRegistryServiceRef,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
        permissions: coreServices.permissions,
        permissionsRegistry: coreServices.permissionsRegistry,
      },
      async init({ 
        httpRouter, 
        logger, 
        config, 
        actionsRegistry, 
        auth, 
        discovery,
        permissions,
        permissionsRegistry,
      }) {
        // Register all SpectroCloud permissions
        permissionsRegistry.addPermissions(spectroCloudPermissions);
        logger.info('SpectroCloud permissions registered');

        // Register HTTP router for frontend API
        httpRouter.use(
          await createRouter({ logger, config, permissions, auth }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        logger.info('SpectroCloud API router registered');

        // Register MCP actions with permissions
        const catalogClient = new CatalogClient({ discoveryApi: discovery });
        registerMcpActions(actionsRegistry, config, catalogClient, auth, permissions);
        logger.info('SpectroCloud MCP actions registered');
      },
    });
  },
});

export default spectroCloudPlugin;
