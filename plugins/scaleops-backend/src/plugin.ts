import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { CatalogClient } from '@backstage/catalog-client';
import { createRouter } from './service/router';
import { ScaleOpsService } from './service/ScaleOpsService';
import { registerMcpActions } from './actions';

/**
 * The ScaleOps backend plugin provides API endpoints for proxying ScaleOps API calls with authentication.
 * @public
 */
export const scaleopsPlugin = createBackendPlugin({
  pluginId: 'scaleops',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        actionsRegistry: actionsRegistryServiceRef,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
      },
      async init({
        httpRouter,
        logger,
        config,
        actionsRegistry,
        auth,
        discovery,
      }) {
        // Create the service instance
        const scaleopsService = new ScaleOpsService(config, logger);

        // Create catalog client for MCP actions
        const catalogClient = new CatalogClient({ discoveryApi: discovery });

        // Register MCP actions
        registerMcpActions(actionsRegistry, scaleopsService, catalogClient, auth);

        httpRouter.use(
          await createRouter({
            logger,
            config,
          }),
        );
      },
    });
  },
});

