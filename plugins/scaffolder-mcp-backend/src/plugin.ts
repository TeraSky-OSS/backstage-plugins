import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { registerMcpActions } from './actions';

/**
 * scaffolderMcpPlugin backend plugin
 *
 * @public
 */
export const scaffolderMcpPlugin = createBackendPlugin({
  pluginId: 'scaffolder-mcp',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        catalogService: catalogServiceRef,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ actionsRegistry, catalogService, discovery, auth }) {
        // Register MCP actions for scaffolder templates
        registerMcpActions(actionsRegistry, catalogService, discovery, auth);
      },
    });
  },
});
