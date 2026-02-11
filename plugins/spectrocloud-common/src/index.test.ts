import {
  DEFAULT_ANNOTATION_PREFIX,
  getAnnotation,
  hasSpectroCloudClusterAnnotation,
  hasSpectroCloudProfileAnnotation,
  viewClusterInfoPermission,
  downloadKubeconfigPermission,
  viewPackValuesPermission,
  viewPackManifestsPermission,
  viewProfileInfoPermission,
  viewProfileClustersPermission,
  spectroCloudPermissions,
  SPECTROCLOUD_PERMISSION_NAMES,
} from './index';

describe('spectrocloud-common', () => {
  describe('annotation utilities', () => {
    it('should export DEFAULT_ANNOTATION_PREFIX', () => {
      expect(DEFAULT_ANNOTATION_PREFIX).toBe('terasky.backstage.io');
    });

    describe('getAnnotation', () => {
      it('should return annotation value when present', () => {
        const annotations = { 'terasky.backstage.io/test': 'value' };
        expect(getAnnotation(annotations, 'terasky.backstage.io', 'test')).toBe('value');
      });

      it('should return undefined when annotation is not present', () => {
        const annotations = {};
        expect(getAnnotation(annotations, 'terasky.backstage.io', 'test')).toBeUndefined();
      });

      it('should fallback to default prefix when custom prefix annotation not found', () => {
        const annotations = { 'terasky.backstage.io/test': 'fallback' };
        expect(getAnnotation(annotations, 'custom.prefix', 'test')).toBe('fallback');
      });
    });

    describe('hasSpectroCloudClusterAnnotation', () => {
      it('should return true when cluster-id annotation exists', () => {
        const annotations = { 'terasky.backstage.io/cluster-id': 'cluster-123' };
        expect(hasSpectroCloudClusterAnnotation(annotations)).toBe(true);
      });

      it('should return false when cluster-id annotation does not exist', () => {
        const annotations = {};
        expect(hasSpectroCloudClusterAnnotation(annotations)).toBe(false);
      });
    });

    describe('hasSpectroCloudProfileAnnotation', () => {
      it('should return true when profile-id annotation exists', () => {
        const annotations = { 'terasky.backstage.io/profile-id': 'profile-123' };
        expect(hasSpectroCloudProfileAnnotation(annotations)).toBe(true);
      });

      it('should return false when profile-id annotation does not exist', () => {
        const annotations = {};
        expect(hasSpectroCloudProfileAnnotation(annotations)).toBe(false);
      });
    });
  });

  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(viewClusterInfoPermission).toBeDefined();
      expect(downloadKubeconfigPermission).toBeDefined();
      expect(viewPackValuesPermission).toBeDefined();
      expect(viewPackManifestsPermission).toBeDefined();
      expect(viewProfileInfoPermission).toBeDefined();
      expect(viewProfileClustersPermission).toBeDefined();
    });

    it('should export spectroCloudPermissions array with all permissions', () => {
      expect(spectroCloudPermissions).toHaveLength(7);
      expect(spectroCloudPermissions).toContain(viewClusterInfoPermission);
      expect(spectroCloudPermissions).toContain(downloadKubeconfigPermission);
    });

    it('should export SPECTROCLOUD_PERMISSION_NAMES', () => {
      expect(SPECTROCLOUD_PERMISSION_NAMES.VIEW_CLUSTER_INFO).toBe('spectrocloud.cluster.view-info');
      expect(SPECTROCLOUD_PERMISSION_NAMES.DOWNLOAD_KUBECONFIG).toBe('spectrocloud.cluster.download-kubeconfig');
    });
  });
});

