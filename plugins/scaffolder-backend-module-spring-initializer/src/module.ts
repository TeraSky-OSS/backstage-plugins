import { coreServices, createBackendModule } from "@backstage/backend-plugin-api";
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createSpringInitializerAction } from "./actions/spring-initializer";

/**
 * A backend module that registers the Spring Initializer action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'spring-initializer-action',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolderActions, config }) {
        scaffolderActions.addActions(createSpringInitializerAction({ config }));
      }
    });
  },
})
