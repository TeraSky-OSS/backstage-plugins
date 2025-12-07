import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { createRouter } from './service/router';
import { educatesPermissions } from '@terasky/backstage-plugin-educates-common';
import { 
  educatesPortalPermissionResourceRef,
  educatesWorkshopPermissionResourceRef,
  rules 
} from './rules';
import { EducatesService } from './service/EducatesService';
import { registerMcpActions } from './actions';

/**
 * The Educates backend plugin provides API endpoints for managing Educates workshops.
 * @public
 */
export const educatesPlugin = createBackendPlugin({
  pluginId: 'educates',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        permissions: coreServices.permissions,
        permissionsRegistry: coreServices.permissionsRegistry,
        httpAuth: coreServices.httpAuth,
        auth: coreServices.auth,
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        httpRouter,
        logger,
        config,
        permissions,
        permissionsRegistry,
        httpAuth,
        auth,
        actionsRegistry,
      }) {
        // Create the service instance
        const educatesService = new EducatesService(config, logger);

        // Register MCP actions
        registerMcpActions(actionsRegistry, educatesService, permissions, auth);

        // Register permissions
        permissionsRegistry.addPermissions(educatesPermissions);
        
        // Register portal resource type
        permissionsRegistry.addResourceType({
          resourceRef: educatesPortalPermissionResourceRef,
          permissions: [educatesPermissions[0]], // portalViewPermission
          rules: Object.values(rules.portal),
          getResources: async (resourceRefs) => {
            // Convert resource refs to portal resources
            return resourceRefs.map(ref => ({
              portalName: ref,
            }));
          },
        });

        // Register workshop resource type  
        permissionsRegistry.addResourceType({
          resourceRef: educatesWorkshopPermissionResourceRef,
          permissions: [educatesPermissions[1]], // workshopStartPermission
          rules: Object.values(rules.workshop),
          getResources: async (resourceRefs) => {
            // Convert resource refs like "portal:workshop" to workshop resources
            return resourceRefs.map(ref => {
              const [portalName, workshopName] = ref.split(':');
              return {
                portalName,
                workshopName,
              };
            });
          },
        });
        
        httpRouter.use(
          await createRouter({
            logger,
            config,
            permissions,
            httpAuth,
          }),
        );
      },
    });
  },
}); 