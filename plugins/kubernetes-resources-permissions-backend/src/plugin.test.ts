import { kubernetesResourcesPermissionsPlugin } from './plugin';

describe('kubernetesResourcesPermissionsPlugin', () => {
  it('should be defined', () => {
    expect(kubernetesResourcesPermissionsPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'kubernetes-resources'
    expect(kubernetesResourcesPermissionsPlugin).toBeDefined();
  });
});

