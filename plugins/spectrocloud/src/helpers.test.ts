import { isSpectroCloudCluster, isSpectroCloudClusterProfile } from './helpers';

describe('spectrocloud helpers', () => {
  describe('isSpectroCloudCluster', () => {
    it('should return true for spectrocloud-cluster type', () => {
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: { name: 'test-cluster' },
        spec: { type: 'spectrocloud-cluster' },
      } as any;

      expect(isSpectroCloudCluster(entity)).toBe(true);
    });

    it('should return false for other types', () => {
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: { name: 'test' },
        spec: { type: 'kubernetes-cluster' },
      } as any;

      expect(isSpectroCloudCluster(entity)).toBe(false);
    });

    it('should return false when no spec', () => {
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: { name: 'test' },
      } as any;

      expect(isSpectroCloudCluster(entity)).toBe(false);
    });
  });

  describe('isSpectroCloudClusterProfile', () => {
    it('should return true for spectrocloud-cluster-profile type', () => {
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: { name: 'test-profile' },
        spec: { type: 'spectrocloud-cluster-profile' },
      } as any;

      expect(isSpectroCloudClusterProfile(entity)).toBe(true);
    });

    it('should return false for other types', () => {
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: { name: 'test' },
        spec: { type: 'spectrocloud-cluster' },
      } as any;

      expect(isSpectroCloudClusterProfile(entity)).toBe(false);
    });

    it('should return false when no spec', () => {
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: { name: 'test' },
      } as any;

      expect(isSpectroCloudClusterProfile(entity)).toBe(false);
    });
  });
});

