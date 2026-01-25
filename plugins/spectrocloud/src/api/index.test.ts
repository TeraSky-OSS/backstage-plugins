import { spectroCloudApiRef, SpectroCloudApiClient } from './index';

describe('spectrocloud api exports', () => {
  it('should export SpectroCloudApiClient', () => {
    expect(SpectroCloudApiClient).toBeDefined();
  });

  it('should export spectroCloudApiRef', () => {
    expect(spectroCloudApiRef).toBeDefined();
    expect(spectroCloudApiRef.id).toBe('plugin.spectrocloud.api');
  });
});

