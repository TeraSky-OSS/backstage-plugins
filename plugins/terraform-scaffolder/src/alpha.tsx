import { ApiBlueprint, configApiRef, createFrontendPlugin, identityApiRef } from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint, formFieldsApi } from '@backstage/plugin-scaffolder-react/alpha';
import { TerraformScaffolderClient } from './api/TerraformScaffolderClient';
import { terraformScaffolderApiRef } from './api/TerraformScaffolderApi';
import { catalogApiRef } from '@backstage/plugin-catalog-react';


export const terraformModuleExtension = FormFieldBlueprint.make({
  name: 'TerraformModule',
  params: {
    field: () => import('./components/FormField').then(m => m.terraformFormField),
  },
});

/** @alpha */
export const terraformModuleApi = ApiBlueprint.make({
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
export const terraformScaffolderPlugin = createFrontendPlugin({
  pluginId: 'terraform-scaffolder',
  extensions: [formFieldsApi, terraformModuleApi, terraformModuleExtension],
});

export default terraformScaffolderPlugin;