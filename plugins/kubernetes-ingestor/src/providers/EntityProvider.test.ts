import { KubernetesEntityProvider } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

describe('KubernetesEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();
  const mockDiscovery = mockServices.discovery.mock();
  const mockScheduler = mockServices.scheduler.mock();
  const mockAuth = mockServices.auth.mock();

  const mockConfig = new ConfigReader({
    kubernetesIngestor: {
      components: {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://kubernetes-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
  });

  describe('constructor', () => {
    it('should create provider instance', () => {
      const provider = new KubernetesEntityProvider(
        mockConfig,
        mockLogger,
        mockDiscovery,
        mockScheduler as any,
        mockAuth,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const provider = new KubernetesEntityProvider(
        mockConfig,
        mockLogger,
        mockDiscovery,
        mockScheduler as any,
        mockAuth,
      );

      const name = provider.getProviderName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const provider = new KubernetesEntityProvider(
        mockConfig,
        mockLogger,
        mockDiscovery,
        mockScheduler as any,
        mockAuth,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      mockScheduler.createScheduledTaskRunner.mockReturnValue({
        run: jest.fn(),
      });

      await provider.connect(mockConnection as any);

      expect(mockScheduler.createScheduledTaskRunner).toHaveBeenCalled();
    });
  });
});
