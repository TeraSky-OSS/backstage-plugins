import React from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi, configApiRef, ConfigApi } from '@backstage/core-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  viewClusterInfoPermission,
  downloadKubeconfigPermission,
  viewPackValuesPermission,
  viewPackManifestsPermission,
  viewProfileInfoPermission,
  viewProfileClustersPermission,
  hasSpectroCloudClusterAnnotation,
  hasSpectroCloudProfileAnnotation,
  DEFAULT_ANNOTATION_PREFIX,
} from '@terasky/backstage-plugin-spectrocloud-common';

/**
 * Get annotation prefix from config
 */
export const getAnnotationPrefix = (config: ConfigApi): string => {
  return config.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? DEFAULT_ANNOTATION_PREFIX;
};

/**
 * Check if entity is a SpectroCloud cluster
 */
export const isSpectroCloudCluster = (entity: Entity, annotationPrefix?: string): boolean => {
  return hasSpectroCloudClusterAnnotation(entity.metadata.annotations, annotationPrefix);
};

/**
 * Check if entity is a SpectroCloud profile
 */
export const isSpectroCloudProfile = (entity: Entity, annotationPrefix?: string): boolean => {
  return hasSpectroCloudProfileAnnotation(entity.metadata.annotations, annotationPrefix);
};

/**
 * Hook to check if permissions are enabled in config
 */
const usePermissionsEnabled = (): boolean => {
  const config = useApi(configApiRef);
  return config.getOptionalConfig('spectrocloud')?.getOptionalBoolean('enablePermissions') ?? false;
};

/**
 * Helper to compute final allowed state
 * When permissions are enabled, respect the permission result
 * When permissions are disabled, always allow
 */
const computeAllowed = (enablePermissions: boolean, allowed: boolean): boolean => {
  if (!enablePermissions) {
    return true; // Permissions disabled, allow all
  }
  return allowed === true; // Permissions enabled, only allow if explicitly true
};

// =====================
// Permission Guard Components
// =====================

interface PermissionGuardProps {
  children: React.ReactElement;
  fallback?: React.ReactNode;
}

/**
 * Guard component that renders children only if user has permission to view cluster info
 */
export const IfCanViewClusterInfo = ({ children, fallback = null }: PermissionGuardProps) => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewClusterInfoPermission });
  
  if (loading) return null;
  return computeAllowed(enablePermissions, allowed) ? children : <>{fallback}</>;
};

/**
 * Guard component that renders children only if user has permission to download kubeconfig
 */
export const IfCanDownloadKubeconfig = ({ children, fallback = null }: PermissionGuardProps) => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: downloadKubeconfigPermission });
  
  if (loading) return null;
  return computeAllowed(enablePermissions, allowed) ? children : <>{fallback}</>;
};

/**
 * Guard component that renders children only if user has permission to view pack values
 */
export const IfCanViewPackValues = ({ children, fallback = null }: PermissionGuardProps) => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewPackValuesPermission });
  
  if (loading) return null;
  return computeAllowed(enablePermissions, allowed) ? children : <>{fallback}</>;
};

/**
 * Guard component that renders children only if user has permission to view pack manifests
 */
export const IfCanViewPackManifests = ({ children, fallback = null }: PermissionGuardProps) => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewPackManifestsPermission });
  
  if (loading) return null;
  return computeAllowed(enablePermissions, allowed) ? children : <>{fallback}</>;
};

/**
 * Guard component that renders children only if user has permission to view profile info
 */
export const IfCanViewProfileInfo = ({ children, fallback = null }: PermissionGuardProps) => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewProfileInfoPermission });
  
  if (loading) return null;
  return computeAllowed(enablePermissions, allowed) ? children : <>{fallback}</>;
};

/**
 * Guard component that renders children only if user has permission to view profile clusters
 */
export const IfCanViewProfileClusters = ({ children, fallback = null }: PermissionGuardProps) => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewProfileClustersPermission });
  
  if (loading) return null;
  return computeAllowed(enablePermissions, allowed) ? children : <>{fallback}</>;
};

// =====================
// Permission Hooks
// =====================

/**
 * Hook to check if user can view cluster info
 */
export const useCanViewClusterInfo = (): { allowed: boolean; loading: boolean } => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewClusterInfoPermission });
  
  return { 
    allowed: computeAllowed(enablePermissions, allowed), 
    loading 
  };
};

/**
 * Hook to check if user can download kubeconfig
 */
export const useCanDownloadKubeconfig = (): { allowed: boolean; loading: boolean } => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: downloadKubeconfigPermission });
  
  return { 
    allowed: computeAllowed(enablePermissions, allowed), 
    loading 
  };
};

/**
 * Hook to check if user can view pack values
 */
export const useCanViewPackValues = (): { allowed: boolean; loading: boolean } => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewPackValuesPermission });
  
  return { 
    allowed: computeAllowed(enablePermissions, allowed), 
    loading 
  };
};

/**
 * Hook to check if user can view pack manifests
 */
export const useCanViewPackManifests = (): { allowed: boolean; loading: boolean } => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewPackManifestsPermission });
  
  return { 
    allowed: computeAllowed(enablePermissions, allowed), 
    loading 
  };
};

/**
 * Hook to check if user can view profile info
 */
export const useCanViewProfileInfo = (): { allowed: boolean; loading: boolean } => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewProfileInfoPermission });
  
  return { 
    allowed: computeAllowed(enablePermissions, allowed), 
    loading 
  };
};

/**
 * Hook to check if user can view profile clusters
 */
export const useCanViewProfileClusters = (): { allowed: boolean; loading: boolean } => {
  const enablePermissions = usePermissionsEnabled();
  const { allowed, loading } = usePermission({ permission: viewProfileClustersPermission });
  
  return { 
    allowed: computeAllowed(enablePermissions, allowed), 
    loading 
  };
};
