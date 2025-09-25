import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './service/router';
import { registerMcpActions } from './service/actions';
import { AiRulesService } from './service/AiRulesService';
import { MCPService } from './service/MCPService';

/**
 * AI Rules backend plugin
 *
 * @public
 */
export const aiRulesPlugin = createBackendPlugin({
  pluginId: 'ai-rules',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        urlReader: coreServices.urlReader,
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        httpRouter,
        logger,
        config,
        discovery,
        urlReader,
        actionsRegistry,
      }) {
        // Create service instances
        const aiRulesService = new AiRulesService({
          logger,
          config,
          discovery,
          urlReader,
        });

        const mcpService = new MCPService({
          logger,
          urlReader,
        });
        
        // Register MCP actions
        registerMcpActions(actionsRegistry, aiRulesService, mcpService);
        
        httpRouter.use(
          (await createRouter({
            logger,
            config,
            discovery,
            urlReader,
          })) as any,
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
}); 