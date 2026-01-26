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

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.getOptionalBoolean.mockReturnValue(false);
    mockConfig.getOptionalString.mockReturnValue(undefined);
    mockConfig.getOptionalStringArray.mockReturnValue(undefined);
  });

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

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const localTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KROEntityProvider(
        localTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(localTaskRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'KROEntityProvider',
        }),
      );
    });
  });

  describe('run', () => {
    it('should throw error when not connected', async () => {
      const provider = new KROEntityProvider(
        mockTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should apply empty mutation when KRO is disabled', async () => {
      const localTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return false;
        return false;
      });

      const provider = new KROEntityProvider(
        localTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockConnection.applyMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'full',
          entities: [],
        }),
      );
    });

    it('should process RGDs when KRO is enabled', async () => {
      const localTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return true;
        return false;
      });
      mockConfig.getOptionalStringArray.mockReturnValue([]);
      mockResourceFetcher.getClusters.mockResolvedValue([]);

      const provider = new KROEntityProvider(
        localTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      const localTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return true;
        return false;
      });
      mockResourceFetcher.getClusters.mockRejectedValue(new Error('Cluster error'));

      const provider = new KROEntityProvider(
        localTaskRunner as any,
        mockLogger as any,
        mockConfig as any,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      // Should not throw, but handle errors gracefully
      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });
  });
});

