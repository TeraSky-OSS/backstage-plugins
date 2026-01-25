import { kubernetesResourcesPlugin, KubernetesResourceGraph, KubernetesResourcesPage } from './plugin';

describe('kubernetesResourcesPlugin', () => {
  it('should be defined', () => {
    expect(kubernetesResourcesPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(kubernetesResourcesPlugin.getId()).toBe('kubernetes-resources');
  });

  it('should export KubernetesResourceGraph extension', () => {
    expect(KubernetesResourceGraph).toBeDefined();
  });

  it('should export KubernetesResourcesPage extension', () => {
    expect(KubernetesResourcesPage).toBeDefined();
  });
});

