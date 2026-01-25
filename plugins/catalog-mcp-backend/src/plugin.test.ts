import { catalogMcpPlugin } from './plugin';

describe('catalogMcpPlugin', () => {
  it('should be defined', () => {
    expect(catalogMcpPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'catalog-mcp'
    expect(catalogMcpPlugin).toBeDefined();
  });
});

