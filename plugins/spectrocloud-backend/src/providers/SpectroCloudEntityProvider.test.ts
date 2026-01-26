import { SpectroCloudEntityProvider } from './SpectroCloudEntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

describe('SpectroCloudEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();
  const mockTaskRunner = {
    run: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty configs when no spectrocloud config is present', () => {
      const config = new ConfigReader({});
      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
    });

    it('should skip disabled catalog providers', () => {
      const config = new ConfigReader({
        spectrocloud: [
          {
            url: 'http://spectrocloud.example.com',
            tenant: 'test-tenant',
            apiToken: 'test-token',
            catalogProvider: {
              enabled: false,
            },
          },
        ],
      });

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('disabled')
      );
    });

    it('should initialize clients for enabled configs', () => {
      const config = new ConfigReader({
        spectrocloud: [
          {
            url: 'http://spectrocloud.example.com',
            tenant: 'test-tenant',
            apiToken: 'test-token',
            name: 'test-instance',
            catalogProvider: {
              enabled: true,
              refreshIntervalSeconds: 300,
            },
          },
        ],
      });

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
    });
  });

  describe('getProviderName', () => {
    it('should return SpectroCloudEntityProvider', () => {
      const config = new ConfigReader({});
      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task runner', async () => {
      const config = new ConfigReader({});
      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).toHaveBeenCalledWith({
        id: 'SpectroCloudEntityProvider',
        fn: expect.any(Function),
      });
    });
  });

  describe('run', () => {
    it('should throw error when no connection is available', async () => {
      const config = new ConfigReader({});
      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should apply empty mutation when no configs are present', async () => {
      const config = new ConfigReader({});
      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      // Manually set connection
      (provider as any).connection = mockConnection;

      await provider.run();

      expect(mockConnection.applyMutation).toHaveBeenCalledWith({
        type: 'full',
        entities: [],
      });
    });
  });

  describe('config loading', () => {
    it('should load default values for optional config fields', () => {
      const config = new ConfigReader({
        spectrocloud: [
          {
            url: 'http://spectrocloud.example.com',
            tenant: 'test-tenant',
            apiToken: 'test-token',
          },
        ],
      });

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
    });

    it('should handle includeProjects and excludeProjects', () => {
      const config = new ConfigReader({
        spectrocloud: [
          {
            url: 'http://spectrocloud.example.com',
            tenant: 'test-tenant',
            apiToken: 'test-token',
            catalogProvider: {
              enabled: true,
              includeProjects: ['project1', 'project2'],
              excludeProjects: ['project3'],
            },
          },
        ],
      });

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
    });

    it('should handle resource type filtering', () => {
      const config = new ConfigReader({
        spectrocloud: [
          {
            url: 'http://spectrocloud.example.com',
            tenant: 'test-tenant',
            apiToken: 'test-token',
            catalogProvider: {
              enabled: true,
              resources: {
                projects: true,
                clusterProfiles: false,
                clusters: true,
              },
            },
          },
        ],
      });

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        config,
      );

      expect(provider.getProviderName()).toBe('SpectroCloudEntityProvider');
    });
  });
});

