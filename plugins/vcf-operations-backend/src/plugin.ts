import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './router';
import { vcfOperationsPermissions } from '@terasky/backstage-plugin-vcf-operations-common';
import { registerMcpActions } from './actions';
import { VcfOperationsService } from './services/VcfOperationsService';

/**
 * The VCF Operations backend plugin provides API endpoints for managing VCF Operations metrics.
 * @public
 */
export const vcfOperationsPlugin = createBackendPlugin({
  pluginId: 'vcf-operations',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        permissions: coreServices.permissions,
        config: coreServices.rootConfig,
        permissionsRegistry: coreServices.permissionsRegistry,
        httpAuth: coreServices.httpAuth,
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        httpRouter,
        logger,
        permissions,
        config,
        permissionsRegistry,
        httpAuth,
        actionsRegistry,
      }) {
        permissionsRegistry.addPermissions(Object.values(vcfOperationsPermissions));
        
        // Create the service instance
        const service = new VcfOperationsService(config, logger);
        
        // Register MCP actions
        registerMcpActions(actionsRegistry, service);
        
        httpRouter.use(
          await createRouter({
            logger,
            permissions,
            config,
            httpAuth,
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