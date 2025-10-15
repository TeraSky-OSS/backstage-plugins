import { coreServices, createBackendModule } from "@backstage/backend-plugin-api";
import { scaffolderActionsExtensionPoint  } from '@backstage/plugin-scaffolder-node';
import { createCrossplaneClaimAction } from "./actions/claim-templating";
import { createCatalogInfoCleanerAction } from "./actions/catalog-info-cleaner";
import { createCrdTemplateAction } from "./actions/crd-templating";
/**
 * A backend module that registers the action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'crossplane-claim-action',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolderActions, config}) {
        scaffolderActions.addActions(createCrossplaneClaimAction({config: config}));
        scaffolderActions.addActions(createCatalogInfoCleanerAction());
        scaffolderActions.addActions(createCrdTemplateAction({config: config}));
      }
    });
  },
})
