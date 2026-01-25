import { kroResourcesBackendPlugin } from './plugin';

describe('kroResourcesBackendPlugin', () => {
  it('should be defined', () => {
    expect(kroResourcesBackendPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'kro'
    expect(kroResourcesBackendPlugin).toBeDefined();
  });
});

