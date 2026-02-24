import {
  ApiBlueprint,
  configApiRef,
  createFrontendPlugin,
  identityApiRef,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';
import { TerraformScaffolderClient } from './api/TerraformScaffolderClient';
import { terraformScaffolderApiRef } from './api/TerraformScaffolderApi';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

export const terraformModuleExtension: ExtensionDefinition =
  FormFieldBlueprint.make({
  name: 'TerraformModule',
  params: {
    field: () => import('./components/FormField').then(m => m.terraformFormField),
  },
});

/** @alpha */
export const terraformModuleApi: ExtensionDefinition = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: terraformScaffolderApiRef,
      deps: {
        configApi: configApiRef,
        catalogApi: catalogApiRef,
        identityApi: identityApiRef,
      },
      factory: ({ configApi, catalogApi, identityApi }) =>
        new TerraformScaffolderClient({ configApi, catalogApi, identityApi }),
    }),
})

/** @alpha */
export const terraformScaffolderPlugin: FrontendPlugin =
  createFrontendPlugin({
  pluginId: 'terraform-scaffolder',
  extensions: [terraformModuleApi, terraformModuleExtension],
});

export default terraformScaffolderPlugin;