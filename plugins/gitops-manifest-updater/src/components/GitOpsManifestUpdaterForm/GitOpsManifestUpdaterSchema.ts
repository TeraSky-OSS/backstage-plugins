import { makeFieldSchema } from '@backstage/plugin-scaffolder-react';

/** @alpha */
export const GitOpsManifestUpdaterSchema = makeFieldSchema({
  output: z => z.object({}),
  uiOptions: z => z.object({}),
}); 