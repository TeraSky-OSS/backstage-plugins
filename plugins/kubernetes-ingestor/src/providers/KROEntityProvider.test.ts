import { KROEntityProvider } from './KROEntityProvider';

describe('KROEntityProvider', () => {
  const mockTaskRunner = {
    run: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfig = {
    getOptionalString: jest.fn().mockReturnValue(undefined),
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalStringArray: jest.fn().mockReturnValue(undefined),
  };

  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
  };

  describe('constructor', () => {
    it('should create an instance', () => {
      const provider = new KROEntityProvider(
        mockTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      expect(provider).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const provider = new KROEntityProvider(
        mockTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      expect(provider.getProviderName()).toBe('KROEntityProvider');
    });
  });
});

