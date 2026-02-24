import {
  createFrontendPlugin,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';

/** @alpha */
export const gitopsManifestUpdaterExtension: ExtensionDefinition =
  FormFieldBlueprint.make({
  name: 'GitOpsManifestUpdater',
  params: {
    field: () =>
      import('./components/GitOpsManifestUpdaterField').then(m => m.gitopsManifestUpdaterField),
  },
});

/** @alpha */
export const gitopsManifestUpdaterPlugin: FrontendPlugin =
  createFrontendPlugin({
  pluginId: 'gitops-manifest-updater',
  extensions: [gitopsManifestUpdaterExtension],
});

export default gitopsManifestUpdaterPlugin;