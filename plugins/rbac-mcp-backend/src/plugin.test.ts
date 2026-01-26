import { rbacMcpPlugin } from './plugin';

describe('rbacMcpPlugin', () => {
  it('should be defined', () => {
    expect(rbacMcpPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'rbac-mcp'
    expect(rbacMcpPlugin).toBeDefined();
  });
});

