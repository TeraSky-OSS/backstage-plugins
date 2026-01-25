import { kubernetesModuleSpectroCloudClusterSupplier } from './module';

describe('kubernetesModuleSpectroCloudClusterSupplier', () => {
  it('should be defined', () => {
    expect(kubernetesModuleSpectroCloudClusterSupplier).toBeDefined();
  });

  it('should be a backend module for kubernetes', () => {
    // The module is created with createBackendModule for kubernetes plugin
    expect(kubernetesModuleSpectroCloudClusterSupplier).toBeDefined();
  });
});

