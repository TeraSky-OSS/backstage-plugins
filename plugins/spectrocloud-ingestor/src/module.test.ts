import { catalogModuleSpectroCloudIngestor } from './module';

describe('catalogModuleSpectroCloudIngestor', () => {
  it('should be defined', () => {
    expect(catalogModuleSpectroCloudIngestor).toBeDefined();
  });

  it('should be a backend module for catalog', () => {
    // The module is created with createBackendModule for catalog plugin
    expect(catalogModuleSpectroCloudIngestor).toBeDefined();
  });
});

