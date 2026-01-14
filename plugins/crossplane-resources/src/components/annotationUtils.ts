import { ConfigApi } from '@backstage/core-plugin-api';

const DEFAULT_ANNOTATION_PREFIX = 'terasky.backstage.io';

export const getAnnotationPrefix = (config: ConfigApi): string =>
  config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
  DEFAULT_ANNOTATION_PREFIX;

export const getAnnotation = (
  annotations: Record<string, string> | undefined,
  prefix: string,
  key: string,
): string | undefined =>
  annotations?.[`${prefix}/${key}`] ||
  (prefix !== DEFAULT_ANNOTATION_PREFIX
    ? annotations?.[`${DEFAULT_ANNOTATION_PREFIX}/${key}`]
    : undefined);

export const hasCrossplaneResourceAnnotation = (
  annotations: Record<string, string> | undefined,
): boolean =>
  Boolean(annotations?.[`${DEFAULT_ANNOTATION_PREFIX}/crossplane-resource`]) ||
  Object.keys(annotations ?? {}).some(key =>
    key.endsWith('/crossplane-resource'),
  );
