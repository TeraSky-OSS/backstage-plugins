import { makeFieldSchema } from '@backstage/plugin-scaffolder-react';

/** @alpha - Schema for the alpha API (createFormField) */
export const GitOpsManifestUpdaterFieldSchema = makeFieldSchema({
  output: z => z.object({}),
  uiOptions: z => z.object({}),
});

/** @alpha - Schema for the legacy API (createScaffolderFieldExtension) */
export const GitOpsManifestUpdaterSchema = {
  uiSchema: {
    'ui:field': 'GitOpsManifestUpdater',
  },
  schema: {
    type: 'object' as const,
    properties: {},
  },
  returnValue: {
    type: 'object' as const,
    properties: {},
    additionalProperties: true,
  },
}; 