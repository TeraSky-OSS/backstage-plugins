import { KubernetesEntityProvider, XRDTemplateEntityProvider, resolveOwnerRef } from './EntityProvider';
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

describe('resolveOwnerRef', () => {
  it('should return default owner when annotation is undefined', () => {
    const result = resolveOwnerRef(undefined, 'group:default', 'kubernetes-auto-ingested');
    expect(result).toBe('group:default/kubernetes-auto-ingested');
  });

  it('should return annotation as-is when it contains a colon (full entity ref)', () => {
    const result = resolveOwnerRef('group:myteam/my-owner', 'group:default', 'kubernetes-auto-ingested');
    expect(result).toBe('group:myteam/my-owner');
  });

  it('should prefix with namespace when annotation does not contain colon', () => {
    const result = resolveOwnerRef('my-owner', 'group:default', 'kubernetes-auto-ingested');
    expect(result).toBe('group:default/my-owner');
  });
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

    it('should handle disabled components config', async () => {
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
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        disabledConfig,
        mockResourceFetcher as any,
      );

      // Should not throw when connecting with disabled config
      await expect(provider.connect({
        applyMutation: jest.fn(),
      } as any)).resolves.not.toThrow();
    });

    it('should process regular Kubernetes resources when Crossplane is disabled', async () => {
      const noCrossplaneConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: true,
            taskRunner: { frequency: 60, timeout: 600 },
          },
          crossplane: {
            enabled: false,
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

      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        noCrossplaneConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should process Crossplane claims when Crossplane is enabled', async () => {
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
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle run errors gracefully', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      // Make resource fetcher throw an error
      const errorResourceFetcher = {
        ...mockResourceFetcher,
        fetchResources: jest.fn().mockRejectedValue(new Error('Fetch failed')),
        getClusters: jest.fn().mockRejectedValue(new Error('Clusters failed')),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        errorResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      // Should not throw even when internal errors occur
      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
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
