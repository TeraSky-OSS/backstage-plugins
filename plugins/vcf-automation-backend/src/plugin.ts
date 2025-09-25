import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './router';
import { registerMcpActions } from './actions';
import { VcfAutomationService } from './services/VcfAutomationService';
import { vcfAutomationPermissions } from '@terasky/backstage-plugin-vcf-automation-common';
/**
 * The VCF Automation backend plugin provides API endpoints for managing VCF Automation resources.
 * @public
 */
export const vcfAutomationPlugin = createBackendPlugin({
  pluginId: 'vcf-automation',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        permissions: coreServices.permissions,
        config: coreServices.rootConfig,
        permissionsRegistry: coreServices.permissionsRegistry,
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        httpRouter,
        logger,
        permissions,
        config,
        permissionsRegistry,
        actionsRegistry,
      }) {
        permissionsRegistry.addPermissions(Object.values(vcfAutomationPermissions));
        
        // Create the service instance
        const service = new VcfAutomationService(config, logger);
        
        // Register MCP actions
        registerMcpActions(actionsRegistry, service);
        
        httpRouter.use(
          await createRouter({
            logger,
            permissions,
            config,
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