import { ApiBlueprint, configApiRef, createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';
import { TerraformModuleForm } from './components/TerraformModuleForm';
import { TerraformModuleSchema } from './components/TerraformModuleSchema';
import { JsonObject } from '@backstage/types';
import { TerraformScaffolderClient } from './api/TerraformScaffolderClient';
import { terraformScaffolderApiRef } from './api/TerraformScaffolderApi';

interface FieldValidation {
  addError: (message: string) => void;
}

/** @alpha */
export const terraformModuleExtension = FormFieldBlueprint.make({
  name: 'TerraformModule',
  params: {
    field: async () => ({
      $$type: '@backstage/scaffolder/FormField',
      name: 'TerraformModule',
      component: TerraformModuleForm,
      schema: TerraformModuleSchema,
      validation: (formData: JsonObject | undefined, validation: FieldValidation) => {
        if (!formData) {
          validation.addError('Spec is required');
        }
      },
    }),
  },
  disabled: false,
});

/** @alpha */
export const terraformModuleApi = ApiBlueprint.make({
    name: 'terraformScaffolderApi',
    params: defineParams => defineParams({
      api: terraformScaffolderApiRef,
      deps: {
        configApi: configApiRef,
      },
      factory: ({ configApi }) => new TerraformScaffolderClient({ configApi }),
    }),
    disabled: false,
  })

/** @alpha */
export const terraformScaffolderPlugin = createFrontendPlugin({
  pluginId: 'terraform-scaffolder',
  extensions: [terraformModuleExtension, terraformModuleApi],
});