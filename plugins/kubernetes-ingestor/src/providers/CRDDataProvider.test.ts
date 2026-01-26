import { CRDDataProvider } from './CRDDataProvider';

describe('CRDDataProvider', () => {
  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResources: jest.fn(),
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
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      await provider.fetchCRDObjects();

      expect(mockResourceFetcher.getClusters).not.toHaveBeenCalled();
    });

    it('should fetch CRDs with targets and return matching CRDs', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        if (key === 'kubernetesIngestor.genericCRDTemplates.crds') return ['mycrd.example.com'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue(undefined);
      
      const mockCRD = {
        metadata: { name: 'mycrd.example.com' },
        spec: {
          group: 'example.com',
          names: { plural: 'mycrd' },
        },
      };
      mockResourceFetcher.fetchResources.mockResolvedValue([mockCRD]);

      const result = await provider.fetchCRDObjects();

      expect(result).toHaveLength(1);
      expect(result[0].spec.group).toBe('example.com');
      expect(result[0].clusters).toContain('cluster1');
    });

    it('should fetch CRDs with label selector', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue({
        getString: jest.fn((k: string) => k === 'key' ? 'app' : 'test'),
      });
      
      const mockCRD = {
        metadata: { name: 'mycrd.example.com', labels: { app: 'test' } },
        spec: {
          group: 'example.com',
          names: { plural: 'mycrd' },
        },
      };
      mockResourceFetcher.fetchResources.mockResolvedValue([mockCRD]);

      const result = await provider.fetchCRDObjects();

      expect(result).toHaveLength(1);
      expect(mockResourceFetcher.fetchResources).toHaveBeenCalledWith(expect.objectContaining({
        query: { labelSelector: 'app=test' },
      }));
    });

    it('should handle fetch errors for individual clusters', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        if (key === 'kubernetesIngestor.genericCRDTemplates.crds') return ['mycrd.example.com'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue(undefined);
      mockResourceFetcher.fetchResources.mockRejectedValue(new Error('Cluster error'));

      const result = await provider.fetchCRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should aggregate CRDs across multiple clusters', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1', 'cluster2'];
        if (key === 'kubernetesIngestor.genericCRDTemplates.crds') return ['mycrd.example.com'];
        return undefined;
      });
      mockConfig.getOptionalConfig.mockReturnValue(undefined);
      
      const mockCRD = {
        metadata: { name: 'mycrd.example.com' },
        spec: {
          group: 'example.com',
          names: { plural: 'mycrd' },
        },
      };
      mockResourceFetcher.fetchResources.mockResolvedValue([mockCRD]);

      const result = await provider.fetchCRDObjects();

      expect(result).toHaveLength(1);
      expect(result[0].clusters).toContain('cluster1');
      expect(result[0].clusters).toContain('cluster2');
    });
  });
});

