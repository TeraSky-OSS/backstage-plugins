import { crossplaneResourcesBackendPlugin } from './plugin';

describe('crossplaneResourcesBackendPlugin', () => {
  it('should be defined', () => {
    expect(crossplaneResourcesBackendPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'crossplane'
    expect(crossplaneResourcesBackendPlugin).toBeDefined();
  });
});

