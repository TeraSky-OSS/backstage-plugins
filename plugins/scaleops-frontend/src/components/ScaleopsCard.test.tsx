import { isScaleopsAvailable } from './ScaleopsCard';
import { Entity } from '@backstage/catalog-model';

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
    expect(isScaleopsAvailable(entity)).toBe(true);
  });

  it('should return false when entity has no annotation', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
        annotations: {},
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(false);
  });

  it('should return false when entity has no annotations object', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test',
      },
    };
    expect(isScaleopsAvailable(entity)).toBe(false);
  });
});

