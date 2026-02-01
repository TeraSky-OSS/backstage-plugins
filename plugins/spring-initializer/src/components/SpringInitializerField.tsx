import { createFormField } from '@backstage/plugin-scaffolder-react/alpha';
import { SpringInitializerForm } from './SpringInitializerForm';
import type { JsonObject } from '@backstage/types';

interface FieldValidation {
  addError: (message: string) => void;
}

/** @alpha */
export const springInitializerField = createFormField({
  name: 'SpringInitializer',
  component: SpringInitializerForm,
  validation: (formData: JsonObject | undefined, validation: FieldValidation) => {
    if (!formData) {
      validation.addError('Spring configuration is required');
    }
    if (formData && !formData.groupId) {
      validation.addError('Group ID is required');
    }
    if (formData && !formData.artifactId) {
      validation.addError('Artifact ID is required');
    }
  },
});
