import { createCatalogInfoCleanerAction } from './catalog-info-cleaner';

describe('createCatalogInfoCleanerAction', () => {
  it('should create an action with correct id', () => {
    const action = createCatalogInfoCleanerAction();
    expect(action.id).toBe('terasky:catalog-info-cleaner');
  });

  it('should have correct schema', () => {
    const action = createCatalogInfoCleanerAction();
    expect(action.schema?.input).toBeDefined();
  });

  it('should have output schema', () => {
    const action = createCatalogInfoCleanerAction();
    expect(action.schema?.output).toBeDefined();
  });
});
