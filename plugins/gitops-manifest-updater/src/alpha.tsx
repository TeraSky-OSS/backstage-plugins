import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';

/** @alpha */
export const gitopsManifestUpdaterExtension = FormFieldBlueprint.make({
  name: 'GitOpsManifestUpdater',
  params: {
    field: () =>
      import('./components/GitOpsManifestUpdaterField').then(m => m.gitopsManifestUpdaterField),
  },
});

/** @alpha */
export const gitopsManifestUpdaterPlugin = createFrontendPlugin({
  pluginId: 'gitops-manifest-updater',
  extensions: [gitopsManifestUpdaterExtension],
});

export default gitopsManifestUpdaterPlugin;