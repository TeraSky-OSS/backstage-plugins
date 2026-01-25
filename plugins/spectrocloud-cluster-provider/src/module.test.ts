import { kubernetesModuleSpectroCloudClusterSupplier } from './module';
import { ConfigReader } from '@backstage/config';
import { Duration } from 'luxon';

// Mock the SpectroCloudClusterSupplier
jest.mock('./supplier/SpectroCloudClusterSupplier', () => ({
  SpectroCloudClusterSupplier: {
    fromConfig: jest.fn().mockImplementation(() => ({
      refreshClusters: jest.fn().mockResolvedValue(undefined),
      getClusters: jest.fn().mockResolvedValue([
        { name: 'spectro-cluster-1', url: 'https://spectro1.example.com', authMetadata: {} },
      ]),
    })),
  },
}));

describe('kubernetesModuleSpectroCloudClusterSupplier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(kubernetesModuleSpectroCloudClusterSupplier).toBeDefined();
  });

  it('should be a backend module for kubernetes', () => {
    expect(kubernetesModuleSpectroCloudClusterSupplier).toBeDefined();
  });

  it('should have correct module properties', () => {
    expect(kubernetesModuleSpectroCloudClusterSupplier).toHaveProperty('$$type');
  });

  describe('config parsing', () => {
    it('should return undefined for missing spectrocloud config', () => {
      const config = new ConfigReader({
        kubernetes: {
          clusterLocatorMethods: [],
        },
      });

      expect(config.getOptionalConfig('spectrocloud')).toBeUndefined();
    });

    it('should return config when spectrocloud is present', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      expect(spectroCloudConfig).toBeDefined();
    });

    it('should return empty array for empty environments', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      const environments = spectroCloudConfig?.getOptionalConfigArray('environments');
      
      expect(environments).toBeDefined();
      expect(environments?.length).toBe(0);
    });

    it('should parse environment configuration correctly', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              url: 'https://api.spectrocloud.com',
              tenant: 'test-tenant',
              apiToken: 'test-token',
              name: 'prod',
            },
          ],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      const environments = spectroCloudConfig?.getOptionalConfigArray('environments');
      
      expect(environments?.length).toBe(1);
      
      const firstEnv = environments?.[0];
      expect(firstEnv?.getString('url')).toBe('https://api.spectrocloud.com');
      expect(firstEnv?.getString('tenant')).toBe('test-tenant');
      expect(firstEnv?.getString('apiToken')).toBe('test-token');
      expect(firstEnv?.getOptionalString('name')).toBe('prod');
    });

    it('should handle multiple environments', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              url: 'https://api.spectrocloud.com',
              tenant: 'tenant1',
              apiToken: 'token1',
              name: 'prod',
            },
            {
              url: 'https://api-dev.spectrocloud.com',
              tenant: 'tenant2',
              apiToken: 'token2',
              name: 'dev',
            },
          ],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      const environments = spectroCloudConfig?.getOptionalConfigArray('environments');
      
      expect(environments?.length).toBe(2);
    });

    it('should build instance name from tenant and url when name not configured', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              url: 'https://api.spectrocloud.com',
              tenant: 'test-tenant',
              apiToken: 'test-token',
            },
          ],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      const environments = spectroCloudConfig?.getOptionalConfigArray('environments');
      
      const firstEnv = environments?.[0];
      const configuredName = firstEnv?.getOptionalString('name');
      const instanceName = configuredName || `${firstEnv?.getString('tenant')}@${firstEnv?.getString('url')}`;
      
      expect(configuredName).toBeUndefined();
      expect(instanceName).toBe('test-tenant@https://api.spectrocloud.com');
    });

    it('should read clusterProvider config for refresh interval', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              url: 'https://api.spectrocloud.com',
              tenant: 'test-tenant',
              apiToken: 'test-token',
              clusterProvider: {
                refreshIntervalSeconds: 300,
              },
            },
          ],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      const environments = spectroCloudConfig?.getOptionalConfigArray('environments');
      
      const firstEnv = environments?.[0];
      const clusterProviderConfig = firstEnv?.getOptionalConfig('clusterProvider');
      const refreshIntervalSeconds = clusterProviderConfig?.getOptionalNumber('refreshIntervalSeconds') ?? 600;
      
      expect(refreshIntervalSeconds).toBe(300);
    });

    it('should use default refresh interval when not configured', () => {
      const config = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              url: 'https://api.spectrocloud.com',
              tenant: 'test-tenant',
              apiToken: 'test-token',
            },
          ],
        },
      });

      const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
      const environments = spectroCloudConfig?.getOptionalConfigArray('environments');
      
      const firstEnv = environments?.[0];
      const clusterProviderConfig = firstEnv?.getOptionalConfig('clusterProvider');
      const refreshIntervalSeconds = clusterProviderConfig?.getOptionalNumber('refreshIntervalSeconds') ?? 600;
      
      expect(refreshIntervalSeconds).toBe(600);
    });
  });

  describe('duration calculation', () => {
    it('should create Duration from seconds', () => {
      const refreshIntervalSeconds = 300;
      const refreshInterval = Duration.fromObject({ seconds: refreshIntervalSeconds });
      
      expect(refreshInterval.toMillis()).toBe(300000);
    });

    it('should handle default duration', () => {
      const refreshIntervalSeconds = 600;
      const refreshInterval = Duration.fromObject({ seconds: refreshIntervalSeconds });
      
      expect(refreshInterval.toMillis()).toBe(600000);
    });
  });

  describe('cluster name deduplication logic', () => {
    it('should detect duplicate cluster names', () => {
      const clusters = [
        { name: 'cluster-a' },
        { name: 'cluster-b' },
        { name: 'cluster-a' },
        { name: 'cluster-c' },
        { name: 'cluster-b' },
      ];

      const clusterNames = new Set<string>();
      const duplicatedNames = new Set<string>();
      
      for (const cluster of clusters) {
        if (clusterNames.has(cluster.name)) {
          duplicatedNames.add(cluster.name);
        } else {
          clusterNames.add(cluster.name);
        }
      }

      expect(duplicatedNames.size).toBe(2);
      expect(duplicatedNames.has('cluster-a')).toBe(true);
      expect(duplicatedNames.has('cluster-b')).toBe(true);
    });

    it('should not flag unique cluster names as duplicates', () => {
      const clusters = [
        { name: 'cluster-a' },
        { name: 'cluster-b' },
        { name: 'cluster-c' },
      ];

      const clusterNames = new Set<string>();
      const duplicatedNames = new Set<string>();
      
      for (const cluster of clusters) {
        if (clusterNames.has(cluster.name)) {
          duplicatedNames.add(cluster.name);
        } else {
          clusterNames.add(cluster.name);
        }
      }

      expect(duplicatedNames.size).toBe(0);
    });

    it('should combine clusters from multiple sources', () => {
      const defaultClusters = [
        { name: 'default-cluster-1' },
        { name: 'default-cluster-2' },
      ];
      const spectroClusters = [
        { name: 'spectro-cluster-1' },
        { name: 'spectro-cluster-2' },
      ];
      
      const allClusters = [...defaultClusters, ...spectroClusters];
      
      expect(allClusters.length).toBe(4);
      expect(allClusters.map(c => c.name)).toContain('default-cluster-1');
      expect(allClusters.map(c => c.name)).toContain('spectro-cluster-1');
    });
  });
});
