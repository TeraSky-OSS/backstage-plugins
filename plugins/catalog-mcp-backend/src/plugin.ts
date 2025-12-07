import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { registerMcpActions } from './actions';

/**
 * catalogMcpPlugin backend plugin
 *
 * @public
 */
export const catalogMcpPlugin = createBackendPlugin({
  pluginId: 'catalog-mcp',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ actionsRegistry, discovery, auth }) {
        // Register MCP actions for Catalog management
        registerMcpActions(actionsRegistry, discovery, auth);
      },
    });
  },
});
