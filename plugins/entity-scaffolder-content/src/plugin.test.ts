import { entityScaffolderContentPlugin, EntityScaffolderContent } from './plugin';

describe('entityScaffolderContentPlugin', () => {
  it('should be defined', () => {
    expect(entityScaffolderContentPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(entityScaffolderContentPlugin.getId()).toBe('entity-scaffolder-content');
  });

  it('should export EntityScaffolderContent extension', () => {
    expect(EntityScaffolderContent).toBeDefined();
  });
});

