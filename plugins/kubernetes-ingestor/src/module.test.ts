import { catalogModuleKubernetesIngestor } from './module';

describe('catalogModuleKubernetesIngestor', () => {
  it('should be defined', () => {
    expect(catalogModuleKubernetesIngestor).toBeDefined();
  });

  it('should have the correct $$type', () => {
    expect(catalogModuleKubernetesIngestor.$$type).toBe('@backstage/BackendFeature');
  });
});



