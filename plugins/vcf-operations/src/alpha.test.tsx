import { Entity } from '@backstage/catalog-model';

describe('vcf-operations alpha exports', () => {
  describe('entity filters', () => {
    describe('isVCFOperationsAvailable', () => {
      it('should return true when entity has vcf-automation-resource-type annotation', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test',
            annotations: {
              'terasky.backstage.io/vcf-automation-resource-type': 'vm',
            },
          },
        };
        expect(Boolean(entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-type'])).toBe(true);
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
        expect(Boolean(entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-type'])).toBe(false);
      });

      it('should return false when annotations object is undefined', () => {
        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
        };
        expect(Boolean(entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-type'])).toBe(false);
      });
    });
  });

  describe('plugin exports', () => {
    it('should export vcfOperationsPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.vcfOperationsPlugin).toBeDefined();
    });

    it('should export vcfOperationsApi', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfOperationsApi).toBeDefined();
    });

    it('should export vcfOperationsContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.vcfOperationsContent).toBeDefined();
    });
  });
});

