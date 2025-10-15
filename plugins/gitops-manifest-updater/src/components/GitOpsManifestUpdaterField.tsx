import { createFormField } from '@backstage/plugin-scaffolder-react/alpha';
import { GitOpsManifestUpdaterForm } from './GitOpsManifestUpdaterForm/GitOpsManifestUpdaterForm';
import { GitOpsManifestUpdaterFieldSchema } from './GitOpsManifestUpdaterForm/GitOpsManifestUpdaterSchema';
import { JsonObject } from '@backstage/types';

interface FieldValidation {
  addError: (message: string) => void;
}

/** @alpha */
export const gitopsManifestUpdaterField = createFormField({
  name: 'GitOpsManifestUpdater',
  component: GitOpsManifestUpdaterForm,
  schema: GitOpsManifestUpdaterFieldSchema,
  validation: (formData: JsonObject | undefined, validation: FieldValidation) => {
    if (!formData) {
      validation.addError('Spec is required');
    }
  },
});

