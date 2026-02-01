import { z } from 'zod';

export const SpringInitializerFieldSchema = z.object({
  type: z.string().optional(),
  language: z.string().optional(),
  bootVersion: z.string().optional(),
  groupId: z.string().optional(),
  artifactId: z.string().optional(),
  version: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  packageName: z.string().optional(),
  packaging: z.string().optional(),
  javaVersion: z.string().optional(),
  dependencies: z.string().optional(),
});
