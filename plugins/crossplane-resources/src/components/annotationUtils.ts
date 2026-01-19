import { ConfigApi } from '@backstage/core-plugin-api';
import {
  DEFAULT_ANNOTATION_PREFIX,
  getAnnotation,
  hasCrossplaneResourceAnnotation,
} from '@terasky/backstage-plugin-crossplane-common';

export const getAnnotationPrefix = (config: ConfigApi): string =>
  config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
  DEFAULT_ANNOTATION_PREFIX;

// Re-export from common for convenience
export { getAnnotation, hasCrossplaneResourceAnnotation, DEFAULT_ANNOTATION_PREFIX };
