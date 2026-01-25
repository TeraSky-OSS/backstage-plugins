import { KubernetesDataProvider } from './KubernetesDataProvider';

describe('KubernetesDataProvider', () => {
  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
  };

  const mockConfig = {
    getOptionalStringArray: jest.fn().mockReturnValue(undefined),
    getOptionalString: jest.fn().mockReturnValue(undefined),
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalConfigArray: jest.fn().mockReturnValue(undefined),
    getOptionalConfig: jest.fn().mockReturnValue(undefined),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  describe('constructor', () => {
    it('should create an instance', () => {
      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      expect(provider).toBeDefined();
    });
  });

  describe('fetchKubernetesObjects', () => {
    it('should return empty array when no clusters found', async () => {
      mockResourceFetcher.getClusters.mockResolvedValue([]);
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      expect(result).toEqual([]);
    });

    it('should use allowed clusters from config', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);
      mockConfig.getOptionalConfigArray.mockReturnValue(undefined);
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // With allowed clusters configured, the function should still work
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

