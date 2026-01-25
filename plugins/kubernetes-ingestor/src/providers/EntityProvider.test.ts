import { KubernetesEntityProvider, XRDTemplateEntityProvider } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Suppress console during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('KubernetesEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    kubernetesIngestor: {
      components: {
        enabled: true,
        taskRunner: { frequency: 60, timeout: 600 },
      },
      crossplane: {
        enabled: true,
      },
      kro: {
        enabled: false,
      },
      annotationPrefix: 'terasky.backstage.io',
    },
    kubernetes: {
      clusterLocatorMethods: [
        {
          type: 'config',
          clusters: [
            { name: 'test-cluster', url: 'http://k8s.example.com' },
          ],
        },
      ],
    },
  });

  const mockResourceFetcher = {
    fetchResource: jest.fn(),
    fetchClusters: jest.fn().mockResolvedValue([
      { name: 'test-cluster', url: 'http://k8s.example.com' },
    ]),
    fetchAllNamespaces: jest.fn().mockResolvedValue([]),
    fetchAllNamespacesAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCRDs: jest.fn().mockResolvedValue([]),
    fetchAllCRDsAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCustomResourcesOfType: jest.fn().mockResolvedValue([]),
    fetchKubernetesResource: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider instance', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const name = provider.getProviderName();
      expect(name).toBe('KubernetesEntityProvider');
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should throw error when not connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should process resources when connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      // The task should have run and applyMutation should have been called
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle empty resource fetcher results', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      mockResourceFetcher.fetchClusters.mockResolvedValue([]);
      mockResourceFetcher.fetchAllNamespaces.mockResolvedValue([]);
      mockResourceFetcher.fetchAllCRDs.mockResolvedValue([]);

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should skip processing when components disabled', async () => {
      const disabledConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: false,
          },
        },
        kubernetes: {
          clusterLocatorMethods: [],
        },
      });

      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        disabledConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).not.toHaveBeenCalled();
    });
  });
});

describe('XRDTemplateEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    kubernetesIngestor: {
      crossplane: {
        enabled: true,
        xrdTemplateGeneration: {
          enabled: true,
        },
      },
      annotationPrefix: 'terasky.backstage.io',
    },
    kubernetes: {
      clusterLocatorMethods: [
        {
          type: 'config',
          clusters: [
            { name: 'test-cluster', url: 'http://k8s.example.com' },
          ],
        },
      ],
    },
  });

  const mockResourceFetcher = {
    fetchResource: jest.fn(),
    fetchClusters: jest.fn().mockResolvedValue([]),
    fetchAllNamespaces: jest.fn().mockResolvedValue([]),
    fetchAllNamespacesAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCRDs: jest.fn().mockResolvedValue([]),
    fetchAllCRDsAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCustomResourcesOfType: jest.fn().mockResolvedValue([]),
    fetchKubernetesResource: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider instance', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const name = provider.getProviderName();
      expect(name).toBe('XRDTemplateEntityProvider');
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should throw error when not connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should handle disabled XRD templates config', async () => {
      const disabledConfig = new ConfigReader({
        kubernetesIngestor: {
          crossplane: {
            enabled: false,
            xrdTemplateGeneration: {
              enabled: false,
            },
          },
        },
        kubernetes: {
          clusterLocatorMethods: [],
        },
      });

      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        disabledConfig,
        mockResourceFetcher as any,
      );

      // Should not throw when connecting
      await expect(provider.connect({
        applyMutation: jest.fn(),
      } as any)).resolves.not.toThrow();
    });
  });
});
