import { spectroCloudPlugin, SpectroCloudClusterCard, SpectroCloudClusterProfileCard } from './plugin';

describe('spectroCloudPlugin', () => {
  it('should be defined', () => {
    expect(spectroCloudPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(spectroCloudPlugin.getId()).toBe('spectrocloud');
  });

  it('should export SpectroCloudClusterCard extension', () => {
    expect(SpectroCloudClusterCard).toBeDefined();
  });

  it('should export SpectroCloudClusterProfileCard extension', () => {
    expect(SpectroCloudClusterProfileCard).toBeDefined();
  });
});

