import { CustomFieldExtensionSchema } from '@backstage/plugin-scaffolder-react';

export const TerraformModuleSchema: CustomFieldExtensionSchema = {
  uiOptions: {
    type: 'object',
    properties: {},
  },
  returnValue: {
    type: 'object',
  },
}; 