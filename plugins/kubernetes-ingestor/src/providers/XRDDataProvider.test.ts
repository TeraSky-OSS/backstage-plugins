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
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

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
    it('should return empty array when crossplane disabled', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(false);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toEqual([]);
    });

    it('should return empty array when no clusters found', async () => {
      mockConfig.getOptionalBoolean.mockReturnValue(true);
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockResolvedValue([]);

      const provider = new XRDDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchXRDObjects();

      expect(result).toEqual([]);
    });
  });
});

