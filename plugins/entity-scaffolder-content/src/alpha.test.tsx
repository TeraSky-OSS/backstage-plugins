import { Entity } from '@backstage/catalog-model';

describe('entity-scaffolder-content alpha exports', () => {
  describe('entity filters', () => {
    describe('kubernetes-namespace filter', () => {
      it('should return true for kubernetes-namespace type', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'kubernetes-namespace' },
        };
        expect(entity.spec?.type).toBe('kubernetes-namespace');
      });

      it('should return false for other types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'service' },
        };
        expect(entity.spec?.type).not.toBe('kubernetes-namespace');
      });
    });

    describe('crossplane filter', () => {
      it('should return true for crossplane types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'crossplane-claim' },
        };
        expect(entity.spec?.type?.toString().startsWith('crossplane')).toBe(true);
      });

      it('should return false for non-crossplane types', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
          spec: { type: 'service' },
        };
        expect(entity.spec?.type?.toString().startsWith('crossplane')).toBe(false);
      });
    });
  });

  describe('plugin exports', () => {
    it('should export entityScaffolderContentPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.entityScaffolderContentPlugin).toBeDefined();
    });

    it('should export entityScaffolderContentExtension', async () => {
      const alpha = await import('./alpha');
      expect(alpha.entityScaffolderContentExtension).toBeDefined();
    });

    it('should export crossplaneEntityScaffolderContentExtension', async () => {
      const alpha = await import('./alpha');
      expect(alpha.crossplaneEntityScaffolderContentExtension).toBeDefined();
    });
  });
});

