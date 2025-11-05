import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { registerMcpActions } from './actions';

/**
 * rbacMcpPlugin backend plugin
 *
 * @public
 */
export const rbacMcpPlugin = createBackendPlugin({
  pluginId: 'rbac-mcp',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ actionsRegistry, discovery, auth }) {
        // Register MCP actions for RBAC management
        registerMcpActions(actionsRegistry, discovery, auth);
      },
    });
  },
});
