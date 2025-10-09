import { createFormField } from '@backstage/plugin-scaffolder-react/alpha';
import { TerraformModuleForm } from './TerraformModuleForm';
import { JsonObject } from '@backstage/types';
import { makeFieldSchema } from '@backstage/plugin-scaffolder-react';

interface FieldValidation {
  addError: (message: string) => void;
}

/** @alpha */
export const TerraformModuleInputFieldSchema = makeFieldSchema({
  output: z => z.string(),
  uiOptions: z => z.object({}),
});

export const terraformFormField = createFormField({
  name: 'TerraformModule',
  component: TerraformModuleForm,
  schema: TerraformModuleInputFieldSchema,
  validation: (formData: JsonObject | undefined, validation: FieldValidation) => {
    if (!formData) {
      validation.addError('Spec is required');
    }
  },
})