import { Entity } from '@backstage/catalog-model';

/**
 * Check if kubernetes resources are available for an entity.
 * @param entity - The entity to check
 * @param annotationPrefix - The annotation prefix to use (default: 'terasky.backstage.io')
 */
export const isKubernetesResourcesAvailable = (
  entity: Entity,
  annotationPrefix: string = 'terasky.backstage.io'
): boolean => {
  return Boolean(entity.metadata.annotations?.[`${annotationPrefix}/kubernetes-resource-name`]);
};