import { isKubernetesResourcesAvailable } from './isKubernetesResourcesAvailable';
import { Entity } from '@backstage/catalog-model';

describe('isKubernetesResourcesAvailable', () => {
  it('should return true when entity has kubernetes-resource-name annotation with default prefix', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'terasky.backstage.io/kubernetes-resource-name': 'my-deployment',
        },
      },
    };

    expect(isKubernetesResourcesAvailable(entity)).toBe(true);
  });

  it('should return true with custom annotation prefix', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'custom.prefix/kubernetes-resource-name': 'my-deployment',
        },
      },
    };

    expect(isKubernetesResourcesAvailable(entity, 'custom.prefix')).toBe(true);
  });

  it('should return false when annotation is missing', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {},
      },
    };

    expect(isKubernetesResourcesAvailable(entity)).toBe(false);
  });

  it('should return false when entity has no annotations', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
      },
    };

    expect(isKubernetesResourcesAvailable(entity)).toBe(false);
  });

  it('should return false when annotation value is empty string', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'terasky.backstage.io/kubernetes-resource-name': '',
        },
      },
    };

    expect(isKubernetesResourcesAvailable(entity)).toBe(false);
  });
});

