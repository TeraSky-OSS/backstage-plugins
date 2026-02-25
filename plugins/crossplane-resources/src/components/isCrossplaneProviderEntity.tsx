import { Entity } from '@backstage/catalog-model';
import { DEFAULT_ANNOTATION_PREFIX, getAnnotation } from '@terasky/backstage-plugin-crossplane-common';

export const isCrossplaneProviderEntity = (
  entity: Entity,
  annotationPrefix: string = DEFAULT_ANNOTATION_PREFIX,
): boolean => {
  const annotations = entity.metadata.annotations;
  if (!annotations) return false;

  const kind = getAnnotation(annotations, annotationPrefix, 'kubernetes-resource-kind');
  const apiVersion = getAnnotation(annotations, annotationPrefix, 'kubernetes-resource-api-version');

  return kind === 'Provider' && Boolean(apiVersion?.includes('pkg.crossplane.io'));
};

export const getProviderClusterName = (entity: Entity): string | undefined => {
  const annotations = entity.metadata.annotations;
  if (!annotations) return undefined;

  return (
    annotations['backstage.io/kubernetes-cluster'] ||
    annotations['backstage.io/managed-by-location']?.split(': ')[1]
  );
};

export const getProviderName = (
  entity: Entity,
  annotationPrefix: string = DEFAULT_ANNOTATION_PREFIX,
): string | undefined => {
  const annotations = entity.metadata.annotations;
  if (!annotations) return undefined;
  return getAnnotation(annotations, annotationPrefix, 'kubernetes-resource-name');
};
