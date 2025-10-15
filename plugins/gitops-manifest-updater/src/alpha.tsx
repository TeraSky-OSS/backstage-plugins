import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint, formFieldsApi } from '@backstage/plugin-scaffolder-react/alpha';

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
  extensions: [formFieldsApi, gitopsManifestUpdaterExtension],
});

export default gitopsManifestUpdaterPlugin;