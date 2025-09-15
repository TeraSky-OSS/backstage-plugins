import { createPlugin } from '@backstage/core-plugin-api';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { TerraformModuleForm } from './components/TerraformModuleForm';

export type TerraformModuleData = {
  module?: string;
  moduleUrl?: string;
  moduleRef?: string;
  variables?: Record<string, unknown>;
  variableDefinitions?: string;
};

const schema = {
  uiSchema: {
    module: {
      'ui:field': 'TerraformModule',
    },
  },
  schema: {
    type: 'object' as const,
    properties: {
      module: {
        type: 'string' as const,
        title: 'Terraform Module',
        description: 'Select a Terraform module to use',
      },
      variables: {
        type: 'object' as const,
        title: 'Module Variables',
      },
    },
    required: ['module', 'variables'],
  },
  returnValue: {
    type: 'object' as const,
    properties: {
      module: {
        type: 'string' as const,
      },
      moduleUrl: {
        type: 'string' as const,
      },
      moduleRef: {
        type: 'string' as const,
      },
      variables: {
        type: 'object' as const,
        additionalProperties: true,
      },
      variableDefinitions: {
        type: 'string' as const,
      },
    },
  },
};

export const terraformScaffolderPlugin = createPlugin({
  id: 'terraform-scaffolder',
});

export const TerraformModuleExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension<TerraformModuleData>({
    name: 'TerraformModule',
    component: TerraformModuleForm,
    schema,
    validation: (formData, validation) => {
      if (!formData?.module) {
        validation.addError('Module selection is required');
      }
      if (!formData?.variables) {
        validation.addError('Module variables are required');
      }
    },
  }),
);