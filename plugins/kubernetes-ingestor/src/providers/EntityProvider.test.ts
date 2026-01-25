import { KubernetesEntityProvider } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

describe('KubernetesEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    kubernetesIngestor: {
      components: {
        enabled: true,
        taskRunner: { frequency: 60, timeout: 600 },
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

      // Constructor order: taskRunner, logger, config, resourceFetcher
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
});
