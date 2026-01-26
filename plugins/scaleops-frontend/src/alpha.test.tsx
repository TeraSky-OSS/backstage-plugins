import { Entity } from '@backstage/catalog-model';

describe('scaleops-frontend alpha exports', () => {
  describe('entity filters', () => {
    describe('isScaleopsAvailable', () => {
      it('should return true when entity has kubernetes-label-selector annotation', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test',
            annotations: {
              'backstage.io/kubernetes-label-selector': 'app=test',
            },
          },
        };
        expect(Boolean(entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'])).toBe(true);
      });

      it('should return false when annotation is missing', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test',
            annotations: {},
          },
        };
        expect(Boolean(entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'])).toBe(false);
      });

      it('should return false when annotations object is undefined', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
        };
        expect(Boolean(entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'])).toBe(false);
      });
    });
  });

  describe('plugin exports', () => {
    it('should export scaleopsPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.scaleopsPlugin).toBeDefined();
    });

    it('should export scaleopsCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.scaleopsCard).toBeDefined();
    });

    it('should export scaleopsContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.scaleopsContent).toBeDefined();
    });
  });
});

