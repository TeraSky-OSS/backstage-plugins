import { createPermission } from '@backstage/plugin-permission-common';

// Annotation utilities
export const DEFAULT_ANNOTATION_PREFIX = 'terasky.backstage.io';

export const getAnnotation = (
  annotations: Record<string, string> | undefined,
  prefix: string,
  key: string,
): string | undefined =>
  annotations?.[`${prefix}/${key}`] ||
  (prefix !== DEFAULT_ANNOTATION_PREFIX
    ? annotations?.[`${DEFAULT_ANNOTATION_PREFIX}/${key}`]
    : undefined);

export const hasSpectroCloudClusterAnnotation = (
  annotations: Record<string, string> | undefined,
  annotationPrefix: string = DEFAULT_ANNOTATION_PREFIX,
): boolean =>
  Boolean(annotations?.[`${annotationPrefix}/cluster-id`]) ||
  (annotationPrefix !== DEFAULT_ANNOTATION_PREFIX
    ? Boolean(annotations?.[`${DEFAULT_ANNOTATION_PREFIX}/cluster-id`])
    : false);

export const hasSpectroCloudProfileAnnotation = (
  annotations: Record<string, string> | undefined,
  annotationPrefix: string = DEFAULT_ANNOTATION_PREFIX,
): boolean =>
  Boolean(annotations?.[`${annotationPrefix}/profile-id`]) ||
  (annotationPrefix !== DEFAULT_ANNOTATION_PREFIX
    ? Boolean(annotations?.[`${DEFAULT_ANNOTATION_PREFIX}/profile-id`])
    : false);

// =====================
// Cluster Permissions
// =====================

/**
 * Permission to view basic cluster information
 */
export const viewClusterInfoPermission = createPermission({
  name: 'spectrocloud.cluster.view-info',
  attributes: { action: 'read' },
});

/**
 * Permission to download kubeconfig for a cluster
 */
export const downloadKubeconfigPermission = createPermission({
  name: 'spectrocloud.cluster.download-kubeconfig',
  attributes: { action: 'read' },
});

/**
 * Permission to view pack values/configuration for a cluster
 */
export const viewPackValuesPermission = createPermission({
  name: 'spectrocloud.cluster.view-pack-values',
  attributes: { action: 'read' },
});

/**
 * Permission to view pack manifests for a cluster
 */
export const viewPackManifestsPermission = createPermission({
  name: 'spectrocloud.cluster.view-pack-manifests',
  attributes: { action: 'read' },
});

/**
 * Permission to create/deploy new clusters
 */
export const createClusterPermission = createPermission({
  name: 'spectrocloud.cluster.create',
  attributes: { action: 'create' },
});

// =====================
// Profile Permissions
// =====================

/**
 * Permission to view basic profile information
 */
export const viewProfileInfoPermission = createPermission({
  name: 'spectrocloud.profile.view-info',
  attributes: { action: 'read' },
});

/**
 * Permission to view which clusters use a profile
 */
export const viewProfileClustersPermission = createPermission({
  name: 'spectrocloud.profile.view-clusters',
  attributes: { action: 'read' },
});

/**
 * All SpectroCloud permissions grouped for easy registration
 */
export const spectroCloudPermissions = [
  viewClusterInfoPermission,
  downloadKubeconfigPermission,
  viewPackValuesPermission,
  viewPackManifestsPermission,
  createClusterPermission,
  viewProfileInfoPermission,
  viewProfileClustersPermission,
];

// Export permission names as constants for reference
export const SPECTROCLOUD_PERMISSION_NAMES = {
  VIEW_CLUSTER_INFO: 'spectrocloud.cluster.view-info',
  DOWNLOAD_KUBECONFIG: 'spectrocloud.cluster.download-kubeconfig',
  VIEW_PACK_VALUES: 'spectrocloud.cluster.view-pack-values',
  VIEW_PACK_MANIFESTS: 'spectrocloud.cluster.view-pack-manifests',
  CREATE_CLUSTER: 'spectrocloud.cluster.create',
  VIEW_PROFILE_INFO: 'spectrocloud.profile.view-info',
  VIEW_PROFILE_CLUSTERS: 'spectrocloud.profile.view-clusters',
} as const;

