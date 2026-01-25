import { CRDDataProvider } from './CRDDataProvider';

describe('CRDDataProvider', () => {
  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResource: jest.fn(),
  };

  const mockConfig = {
    getOptionalStringArray: jest.fn(),
    getOptionalConfig: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  let provider: CRDDataProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new CRDDataProvider(
      mockResourceFetcher as any,
      mockConfig as any,
      mockLogger as any,
    );
  });

  describe('fetchCRDObjects', () => {
    it('should return empty array when no clusters found', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockResolvedValue([]);

      const result = await provider.fetchCRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No clusters found.');
    });

    it('should return empty array when cluster discovery fails', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockRejectedValue(new Error('Discovery failed'));

      const result = await provider.fetchCRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return empty array when no CRD targets or label selector configured', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue(undefined);

      const result = await provider.fetchCRDObjects();

      expect(result).toEqual([]);
    });

    it('should warn and return empty when both targets and selector configured', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        if (key === 'kubernetesIngestor.genericCRDTemplates.crds') return ['mycrd.example.com'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue({
        getString: jest.fn().mockReturnValue('test'),
      });

      const result = await provider.fetchCRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Both CRD targets and label selector'),
      );
    });

    it('should use allowed clusters from config', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1', 'cluster2'];
        if (key === 'kubernetesIngestor.genericCRDTemplates.crds') return ['mycrd.example.com'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue(undefined);
      mockResourceFetcher.fetchResource.mockResolvedValue({ items: [] });

      await provider.fetchCRDObjects();

      expect(mockResourceFetcher.getClusters).not.toHaveBeenCalled();
    });
  });
});

