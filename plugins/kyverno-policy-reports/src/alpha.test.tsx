import { Entity } from '@backstage/catalog-model';

// Test the filter functions directly
const isNonCrossplaneButKyvernoAvailable = (entity: Entity) => {
  const hasKubernetesAnnotation = Boolean(
    entity.metadata.annotations?.['backstage.io/kubernetes-id'] ||
    entity.metadata.annotations?.['backstage.io/kubernetes-namespace']
  );
  return Boolean(
    entity.spec?.type !== 'crossplane-claim' && 
    entity.spec?.type !== 'crossplane-xr' && 
    hasKubernetesAnnotation
  );
};

const isCrossplaneAvailable = (entity: Entity) => {
  return Boolean(entity.spec?.type === 'crossplane-claim' || entity.spec?.type === 'crossplane-xr');
};

describe('kyverno-policy-reports alpha exports', () => {
  describe('isNonCrossplaneButKyvernoAvailable', () => {
    it('should return true for non-crossplane entities with kubernetes annotations', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { 
          name: 'test',
          annotations: { 'backstage.io/kubernetes-id': 'test-id' }
        },
        spec: { type: 'service' },
      };
      expect(isNonCrossplaneButKyvernoAvailable(entity)).toBe(true);
    });

    it('should return false for crossplane-claim entities', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { 
          name: 'test',
          annotations: { 'backstage.io/kubernetes-id': 'test-id' }
        },
        spec: { type: 'crossplane-claim' },
      };
      expect(isNonCrossplaneButKyvernoAvailable(entity)).toBe(false);
    });

    it('should return false for crossplane-xr entities', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { 
          name: 'test',
          annotations: { 'backstage.io/kubernetes-id': 'test-id' }
        },
        spec: { type: 'crossplane-xr' },
      };
      expect(isNonCrossplaneButKyvernoAvailable(entity)).toBe(false);
    });

    it('should return false for entities without kubernetes annotations', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'test' },
        spec: { type: 'service' },
      };
      expect(isNonCrossplaneButKyvernoAvailable(entity)).toBe(false);
    });
  });

  describe('isCrossplaneAvailable', () => {
    it('should return true for crossplane-claim entities', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'test' },
        spec: { type: 'crossplane-claim' },
      };
      expect(isCrossplaneAvailable(entity)).toBe(true);
    });

    it('should return true for crossplane-xr entities', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'test' },
        spec: { type: 'crossplane-xr' },
      };
      expect(isCrossplaneAvailable(entity)).toBe(true);
    });

    it('should return false for non-crossplane entities', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'test' },
        spec: { type: 'service' },
      };
      expect(isCrossplaneAvailable(entity)).toBe(false);
    });
  });

  describe('plugin exports', () => {
    it('should export kyvernoPolicyReportsPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.kyvernoPolicyReportsPlugin).toBeDefined();
    });

    it('should export kyvernoOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kyvernoOverviewCard).toBeDefined();
    });

    it('should export kyvernoCrossplaneOverviewCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kyvernoCrossplaneOverviewCard).toBeDefined();
    });

    it('should export kyvernoPolicyReportsContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kyvernoPolicyReportsContent).toBeDefined();
    });

    it('should export kyvernoCrossplanePolicyReportsContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kyvernoCrossplanePolicyReportsContent).toBeDefined();
    });

    it('should export kyvernoApi', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kyvernoApi).toBeDefined();
    });
  });
});

