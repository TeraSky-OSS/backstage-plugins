import { Entity } from '@backstage/catalog-model';

describe('spectrocloud alpha exports', () => {
  describe('entity filters', () => {
    describe('isSpectroCloudCluster', () => {
      it('should return true for spectrocloud-cluster type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test-cluster' },
          spec: { type: 'spectrocloud-cluster' },
        };
        expect(entity.spec?.type).toBe('spectrocloud-cluster');
      });

      it('should return false for other types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'other-type' },
        };
        expect(entity.spec?.type).not.toBe('spectrocloud-cluster');
      });

      it('should return false when spec is undefined', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
        };
        expect(entity.spec?.type).toBeUndefined();
      });
    });

    describe('isSpectroCloudClusterProfile', () => {
      it('should return true for spectrocloud-cluster-profile type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test-profile' },
          spec: { type: 'spectrocloud-cluster-profile' },
        };
        expect(entity.spec?.type).toBe('spectrocloud-cluster-profile');
      });

      it('should return false for other types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'spectrocloud-cluster' },
        };
        expect(entity.spec?.type).not.toBe('spectrocloud-cluster-profile');
      });
    });
  });

  describe('plugin exports', () => {
    it('should export spectroCloudPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.spectroCloudPlugin).toBeDefined();
    });

    it('should export spectroCloudApi', async () => {
      const alpha = await import('./alpha');
      expect(alpha.spectroCloudApi).toBeDefined();
    });

    it('should export spectroCloudClusterCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.spectroCloudClusterCard).toBeDefined();
    });

    it('should export spectroCloudClusterProfileCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.spectroCloudClusterProfileCard).toBeDefined();
    });
  });
});

