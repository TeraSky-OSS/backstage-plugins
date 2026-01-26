import { XRDDataProvider } from './XRDDataProvider';

describe('XRDDataProvider', () => {
  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
  };

  const mockConfig = {
    getOptionalStringArray: jest.fn().mockReturnValue(undefined),
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalString: jest.fn().mockReturnValue(undefined),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      expect(provider).toBeDefined();
    });
  });

  describe('fetchXRDObjects', () => {
    it('should return empty array when no clusters found', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockResolvedValue([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No clusters found.');
    });

    it('should use allowed clusters from config', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      await provider.fetchXRDObjects();

      expect(mockResourceFetcher.getClusters).not.toHaveBeenCalled();
    });

    it('should handle cluster discovery errors', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockRejectedValue(new Error('Discovery failed'));

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle clusters without Crossplane API', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockResourceFetcher.fetchResources.mockRejectedValue(new Error('API not found'));

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('no Crossplane APIs available'));
    });

    it('should fetch and process XRDs with v1 API', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.xrds.ingestAllXRDs') return true;
        return false;
      });

      const mockXRD = {
        apiVersion: 'apiextensions.crossplane.io/v1',
        metadata: { name: 'test-xrd' },
        spec: {
          group: 'test.example.com',
          claimNames: { kind: 'TestClaim' },
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([mockXRD]) // v1 XRDs
        .mockRejectedValueOnce(new Error('v2 not available')) // v2 XRDs
        .mockResolvedValueOnce([]) // CRDs
        .mockResolvedValueOnce([]); // Compositions

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('test-xrd');
      expect(result[0].clusters).toContain('cluster1');
    });

    it('should aggregate XRDs across multiple clusters', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1', 'cluster2']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);

      const mockXRD = {
        apiVersion: 'apiextensions.crossplane.io/v1',
        metadata: { name: 'test-xrd' },
        spec: {
          group: 'test.example.com',
          claimNames: { kind: 'TestClaim' },
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([mockXRD]) // v1 XRDs cluster1
        .mockRejectedValueOnce(new Error('v2 not available'))
        .mockResolvedValueOnce([]) // CRDs cluster1
        .mockResolvedValueOnce([]) // Compositions cluster1
        .mockResolvedValueOnce([mockXRD]) // v1 XRDs cluster2
        .mockRejectedValueOnce(new Error('v2 not available'))
        .mockResolvedValueOnce([]) // CRDs cluster2
        .mockResolvedValueOnce([]); // Compositions cluster2

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(1);
      expect(result[0].clusters).toContain('cluster1');
      expect(result[0].clusters).toContain('cluster2');
    });

    it('should skip XRDs without valid compositeResourceType', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);

      const mockXRD = {
        apiVersion: 'apiextensions.crossplane.io/v1',
        metadata: { name: 'test-xrd' },
        spec: {
          group: 'test.example.com',
          claimNames: { kind: 'TestClaim' },
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: '', // Invalid
              apiVersion: '',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([mockXRD])
        .mockRejectedValueOnce(new Error('v2 not available'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('invalid or missing compositeResourceType'));
    });

    it('should filter out XRDs with exclude-from-catalog annotation', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalString.mockReturnValue('terasky.backstage.io');

      const excludedXRD = {
        apiVersion: 'apiextensions.crossplane.io/v1',
        metadata: {
          name: 'excluded-xrd',
          annotations: {
            'terasky.backstage.io/exclude-from-catalog': 'true',
          },
        },
        spec: {
          group: 'test.example.com',
          claimNames: { kind: 'TestClaim' },
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([excludedXRD])
        .mockRejectedValueOnce(new Error('v2 not available'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(0);
    });

    it('should skip XRDs without add-to-catalog annotation when ingestAllXRDs is false', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.xrds.ingestAllXRDs') return false;
        return false;
      });
      mockConfig.getOptionalString.mockReturnValue('terasky.backstage.io');

      const xrdWithoutAnnotation = {
        apiVersion: 'apiextensions.crossplane.io/v1',
        metadata: { name: 'no-annotation-xrd' },
        spec: {
          group: 'test.example.com',
          claimNames: { kind: 'TestClaim' },
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([xrdWithoutAnnotation])
        .mockRejectedValueOnce(new Error('v2 not available'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(0);
    });

    it('should skip v1 XRDs without claimNames.kind', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);

      const xrdWithoutClaim = {
        apiVersion: 'apiextensions.crossplane.io/v1',
        metadata: { name: 'no-claim-xrd' },
        spec: {
          group: 'test.example.com',
          // Missing claimNames
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockResolvedValueOnce([xrdWithoutClaim])
        .mockRejectedValueOnce(new Error('v2 not available'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(0);
    });

    it('should skip v2 LegacyCluster XRDs without claimNames.kind', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);

      const v2LegacyXRD = {
        apiVersion: 'apiextensions.crossplane.io/v2',
        metadata: { name: 'legacy-xrd' },
        spec: {
          scope: 'LegacyCluster',
          group: 'test.example.com',
          names: { kind: 'TestKind' },
          versions: [{ name: 'v1' }],
          // Missing claimNames
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockRejectedValueOnce(new Error('v1 not available'))
        .mockResolvedValueOnce([v2LegacyXRD])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toHaveLength(0);
    });
  });

  describe('buildCompositeKindLookup', () => {
    it('should return empty object when no XRDs', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue([]);
      mockResourceFetcher.getClusters.mockResolvedValue([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.buildCompositeKindLookup();

      expect(result).toEqual({});
    });

    it('should build lookup for v2 XRDs', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(['cluster1']);
      mockConfig.getOptionalBoolean.mockReturnValue(true);

      const mockXRD = {
        apiVersion: 'apiextensions.crossplane.io/v2',
        metadata: { name: 'test-xrd' },
        spec: {
          scope: 'Namespaced',
          group: 'test.example.com',
          names: { kind: 'TestKind' },
          versions: [{ name: 'v1' }],
          claimNames: { kind: 'TestClaim' },
        },
        status: {
          controllers: {
            compositeResourceType: {
              kind: 'TestComposite',
              apiVersion: 'test.example.com/v1',
            },
          },
        },
      };

      mockResourceFetcher.fetchResources
        .mockRejectedValueOnce(new Error('v1 not available'))
        .mockResolvedValueOnce([mockXRD])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.buildCompositeKindLookup();

      expect(result['TestKind|test.example.com|v1']).toBeDefined();
      expect(result['testkind|test.example.com|v1']).toBeDefined();
    });
  });
});

