import { isAIRulesAvailable } from './AiRulesComponent';
import { Entity } from '@backstage/catalog-model';

describe('isAIRulesAvailable', () => {
  it('should return true when entity has source-location annotation starting with url:', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'backstage.io/source-location': 'url:https://github.com/org/repo',
        },
      },
    };

    expect(isAIRulesAvailable(entity)).toBe(true);
  });

  it('should return false when source-location does not start with url:', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          'backstage.io/source-location': 'file:///local/path',
        },
      },
    };

    expect(isAIRulesAvailable(entity)).toBe(false);
  });

  it('should return false when entity has no annotations', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
      },
    };

    expect(isAIRulesAvailable(entity)).toBe(false);
  });

  it('should return false when entity has empty annotations', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {},
      },
    };

    expect(isAIRulesAvailable(entity)).toBe(false);
  });
});

