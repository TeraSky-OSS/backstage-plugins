import { Entity } from '@backstage/catalog-model';

/**
 * Check if entity is a SpectroCloud cluster
 */
export const isSpectroCloudCluster = (entity: Entity): boolean => {
  return entity.spec?.type === 'spectrocloud-cluster';
};

/**
 * Check if entity is a SpectroCloud cluster profile
 */
export const isSpectroCloudClusterProfile = (entity: Entity): boolean => {
  return entity.spec?.type === 'spectrocloud-cluster-profile';
};

