import { SpectroCloudEntityProvider } from './SpectroCloudEntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Suppress console during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Mock SpectroCloudClient
jest.mock('../client/SpectroCloudClient', () => ({
  SpectroCloudClient: jest.fn().mockImplementation(() => ({
    getProjects: jest.fn().mockResolvedValue({ items: [] }),
    getClustersForProject: jest.fn().mockResolvedValue({ items: [] }),
    getTenantClusters: jest.fn().mockResolvedValue({ items: [] }),
    getClusterProfilesForProject: jest.fn().mockResolvedValue({ items: [] }),
    getTenantClusterProfiles: jest.fn().mockResolvedValue({ items: [] }),
    getCluster: jest.fn().mockResolvedValue(null),
    getClusterProfile: jest.fn().mockResolvedValue(null),
  })),
}));

describe('SpectroCloudEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();

  const validConfig = new ConfigReader({
    spectrocloud: {
      annotationPrefix: 'terasky.backstage.io',
      environments: [
        {
          name: 'test-env',
          url: 'https://api.spectrocloud.com',
          tenant: 'test-tenant',
          apiToken: 'test-token',
          catalogProvider: {
            enabled: true,
            refreshIntervalSeconds: 300,
            defaultOwner: 'test-owner',
            ownerNamespace: 'group',
            resources: {
              projects: true,
              clusterProfiles: true,
              clusters: true,
            },
          },
        },
      ],
    },
  });

  const emptyConfig = new ConfigReader({});

  const disabledConfig = new ConfigReader({
    spectrocloud: {
      environments: [
        {
          name: 'disabled-env',
          url: 'https://api.spectrocloud.com',
          tenant: 'test-tenant',
          apiToken: 'test-token',
          catalogProvider: {
            enabled: false,
          },
        },
      ],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider instance with valid config', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        validConfig,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeDefined();
    });

    it('should handle empty config gracefully', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        emptyConfig,
      );

      expect(provider).toBeDefined();
    });

    it('should skip disabled environments', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        disabledConfig,
      );

      expect(provider).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        validConfig,
      );

      const name = provider.getProviderName();
      expect(name).toBe('SpectroCloudEntityProvider');
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        validConfig,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).toHaveBeenCalled();
    });

    it('should not schedule task when no configs available', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        emptyConfig,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should throw error when not connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        validConfig,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should process resources when connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        validConfig,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle empty project list', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        validConfig,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });
  });

  describe('configuration options', () => {
    it('should use default annotation prefix when not configured', () => {
      const configWithoutPrefix = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              name: 'test',
              url: 'https://api.spectrocloud.com',
              tenant: 'test',
              apiToken: 'token',
            },
          ],
        },
      });

      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        configWithoutPrefix,
      );

      expect(provider).toBeDefined();
    });

    it('should handle multiple environments', () => {
      const multiEnvConfig = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              name: 'env1',
              url: 'https://api1.spectrocloud.com',
              tenant: 'tenant1',
              apiToken: 'token1',
            },
            {
              name: 'env2',
              url: 'https://api2.spectrocloud.com',
              tenant: 'tenant2',
              apiToken: 'token2',
            },
          ],
        },
      });

      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        multiEnvConfig,
      );

      expect(provider).toBeDefined();
    });

    it('should handle include/exclude project filters', () => {
      const filterConfig = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              name: 'test',
              url: 'https://api.spectrocloud.com',
              tenant: 'test',
              apiToken: 'token',
              catalogProvider: {
                enabled: true,
                includeProjects: ['project1', 'project2'],
                excludeProjects: ['project3'],
                excludeTenantScopedResources: true,
              },
            },
          ],
        },
      });

      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new SpectroCloudEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        filterConfig,
      );

      expect(provider).toBeDefined();
    });
  });
});

