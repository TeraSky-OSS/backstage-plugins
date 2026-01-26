import { RGDDataProvider } from './RGDDataProvider';

describe('RGDDataProvider', () => {
  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
  };

  const mockConfig = {
    getOptionalBoolean: jest.fn(),
    getOptionalStringArray: jest.fn(),
    getOptionalString: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  let provider: RGDDataProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new RGDDataProvider(
      mockResourceFetcher as any,
      mockConfig as any,
      mockLogger as any,
    );
  });

  describe('fetchRGDObjects', () => {
    it('should return empty array when KRO is disabled', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(false);

      const result = await provider.fetchRGDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('KRO integration is disabled');
    });

    it('should return empty array when no clusters found', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockResolvedValue([]);

      const result = await provider.fetchRGDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No clusters found.');
    });

    it('should return empty array when cluster discovery fails', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockRejectedValue(new Error('Discovery failed'));

      const result = await provider.fetchRGDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use allowed clusters from config', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1', 'cluster2']);
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      await provider.fetchRGDObjects();

      expect(mockResourceFetcher.getClusters).not.toHaveBeenCalled();
    });

    it('should fetch RGD resources from clusters', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);

      const mockRGD = {
        metadata: { name: 'test-rgd', uid: '123' },
        spec: {
          schema: {
            apiVersion: 'v1',
            kind: 'Test',
            spec: {
              type: 'object',
              properties: {
                replicas: { type: 'integer' },
              },
            },
          },
        },
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
        },
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([mockRGD]);

      const result = await provider.fetchRGDObjects();

      expect(Array.isArray(result)).toBe(true);
      expect(mockResourceFetcher.fetchResources).toHaveBeenCalledWith(
        expect.objectContaining({
          clusterName: 'cluster1',
          resourcePath: 'kro.run/v1alpha1/resourcegraphdefinitions',
        }),
      );
    });

    it('should handle fetch errors for individual clusters', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockResourceFetcher.fetchResources.mockRejectedValue(new Error('Cluster error'));

      const result = await provider.fetchRGDObjects();

      expect(result).toEqual([]);
      // Error may be logged or silently handled depending on implementation
    });

    it('should aggregate RGDs across multiple clusters', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1', 'cluster2']);

      const mockRGD = {
        metadata: { name: 'test-rgd', uid: '123' },
        spec: {
          schema: {
            apiVersion: 'v1',
            kind: 'Test',
          },
        },
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
        },
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([mockRGD]);

      const result = await provider.fetchRGDObjects();

      expect(Array.isArray(result)).toBe(true);
      // Should have called fetch for both clusters
      expect(mockResourceFetcher.fetchResources).toHaveBeenCalledTimes(2);
    });

    it('should handle clusters without KRO API', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockResourceFetcher.fetchResources.mockRejectedValue(new Error('API not available'));

      const result = await provider.fetchRGDObjects();

      expect(result).toEqual([]);
      // Error handling depends on implementation
    });

    it('should skip inactive RGDs', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);

      const inactiveRGD = {
        metadata: { name: 'inactive-rgd', uid: '123' },
        spec: {
          schema: { apiVersion: 'v1', kind: 'Test' },
        },
        status: {
          state: 'Inactive',
        },
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([inactiveRGD]);

      const result = await provider.fetchRGDObjects();

      expect(result).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipping inactive RGD'));
    });

    it('should skip RGDs without CRD', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);

      const activeRGD = {
        metadata: { name: 'test-rgd', uid: '123' },
        spec: {
          schema: { apiVersion: 'v1', kind: 'Test' },
        },
        status: {
          state: 'Active',
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([activeRGD]) // RGDs
        .mockResolvedValueOnce([]); // No CRDs

      const result = await provider.fetchRGDObjects();

      expect(result).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No CRD found for RGD'));
    });

    it('should enrich active RGDs with CRD data', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);

      const activeRGD = {
        metadata: { name: 'test-rgd', uid: '123' },
        spec: {
          schema: { apiVersion: 'v1', kind: 'Test' },
        },
        status: {
          state: 'Active',
        },
      };

      const mockCRD = {
        metadata: { name: 'tests.test.io' },
        spec: {
          group: 'test.io',
          names: { kind: 'Test', plural: 'tests' },
          versions: [{ name: 'v1' }],
          scope: 'Namespaced',
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([activeRGD]) // RGDs
        .mockResolvedValueOnce([mockCRD]); // CRDs

      const result = await provider.fetchRGDObjects();

      expect(result).toHaveLength(1);
      expect(result[0].generatedCRD).toEqual(mockCRD);
      expect(result[0].clusterName).toBe('cluster1');
      expect(result[0].clusters).toContain('cluster1');
    });

    it('should aggregate same RGD from multiple clusters', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1', 'cluster2']);

      const activeRGD = {
        metadata: { name: 'test-rgd', uid: '123' },
        spec: {
          schema: { apiVersion: 'v1', kind: 'Test' },
        },
        status: {
          state: 'Active',
        },
      };

      const mockCRD = {
        metadata: { name: 'tests.test.io' },
        spec: {
          group: 'test.io',
          names: { kind: 'Test', plural: 'tests' },
          versions: [{ name: 'v1' }],
          scope: 'Namespaced',
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([activeRGD]) // cluster1 RGDs
        .mockResolvedValueOnce([mockCRD]) // cluster1 CRDs
        .mockResolvedValueOnce([activeRGD]) // cluster2 RGDs
        .mockResolvedValueOnce([mockCRD]); // cluster2 CRDs

      const result = await provider.fetchRGDObjects();

      expect(result).toHaveLength(1);
      expect(result[0].clusters).toContain('cluster1');
      expect(result[0].clusters).toContain('cluster2');
    });
  });

  describe('buildRGDLookup', () => {
    it('should return empty lookup when no RGDs', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(false);

      const result = await provider.buildRGDLookup();

      expect(result).toEqual({});
    });

    it('should build lookup from RGDs with CRDs', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);

      const activeRGD = {
        metadata: { name: 'test-rgd', uid: '123' },
        spec: {
          schema: { apiVersion: 'v1', kind: 'Test' },
        },
        status: {
          state: 'Active',
        },
      };

      const mockCRD = {
        metadata: { name: 'tests.test.io' },
        spec: {
          group: 'test.io',
          names: { kind: 'Test', plural: 'tests' },
          versions: [{ name: 'v1' }, { name: 'v2' }],
          scope: 'Namespaced',
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([activeRGD])
        .mockResolvedValueOnce([mockCRD]);

      const result = await provider.buildRGDLookup();

      expect(result['Test|test.io|v1']).toBeDefined();
      expect(result['Test|test.io|v2']).toBeDefined();
      expect(result['Test|test.io|v1'].spec.group).toBe('test.io');
    });
  });
});

