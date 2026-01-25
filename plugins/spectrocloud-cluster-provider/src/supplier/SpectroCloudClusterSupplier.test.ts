import { SpectroCloudClusterSupplier } from './SpectroCloudClusterSupplier';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Mock the SpectroCloudClient
jest.mock('../client/SpectroCloudClient', () => ({
  SpectroCloudClient: jest.fn().mockImplementation(() => ({
    getAllClusters: jest.fn().mockResolvedValue([]),
    getProject: jest.fn().mockResolvedValue(undefined),
    getAdminKubeConfig: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the kubernetes client-node
jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromString: jest.fn(),
    clusters: [{ server: 'https://api.test.com', caData: 'test-ca' }],
    makeApiClient: jest.fn().mockReturnValue({
      readNamespace: jest.fn().mockRejectedValue({ statusCode: 404 }),
      createNamespace: jest.fn().mockResolvedValue({}),
      readNamespacedServiceAccount: jest.fn().mockRejectedValue({ statusCode: 404 }),
      createNamespacedServiceAccount: jest.fn().mockResolvedValue({}),
      readNamespacedSecret: jest.fn().mockResolvedValue({
        data: {
          token: Buffer.from('test-token').toString('base64'),
          'ca.crt': Buffer.from('test-ca').toString('base64'),
        },
      }),
      createNamespacedSecret: jest.fn().mockResolvedValue({}),
    }),
  })),
  CoreV1Api: jest.fn(),
  RbacAuthorizationV1Api: jest.fn(),
}));

describe('SpectroCloudClusterSupplier', () => {
  const mockLogger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fromConfig', () => {
    it('should create supplier from config', () => {
      const config = new ConfigReader({
        url: 'https://spectrocloud.example.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        name: 'test-instance',
        clusterProvider: {
          excludeProjects: ['excluded-project'],
          includeProjects: ['included-project'],
          skipMetricsLookup: true,
          excludeTenantScopedClusters: false,
          refreshIntervalSeconds: 300,
          clusterTimeoutSeconds: 10,
          rbac: {
            namespace: 'backstage-system',
            serviceAccountName: 'backstage-sa',
            secretName: 'backstage-sa-token',
            clusterRoleName: 'backstage-read-only',
            clusterRoleBindingName: 'backstage-read-only-binding',
          },
        },
      });

      const supplier = SpectroCloudClusterSupplier.fromConfig(config, mockLogger);

      expect(supplier).toBeDefined();
    });

    it('should use default values for optional config', () => {
      const config = new ConfigReader({
        url: 'https://spectrocloud.example.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
      });

      const supplier = SpectroCloudClusterSupplier.fromConfig(config, mockLogger);

      expect(supplier).toBeDefined();
    });

    it('should parse custom RBAC rules', () => {
      const config = new ConfigReader({
        url: 'https://spectrocloud.example.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        clusterProvider: {
          rbac: {
            clusterRoleRules: [
              {
                apiGroups: ['core'],
                resources: ['pods'],
                verbs: ['get', 'list'],
              },
              {
                apiGroups: ['apps'],
                resources: ['deployments'],
                verbs: ['get', 'list', 'watch'],
              },
            ],
          },
        },
      });

      const supplier = SpectroCloudClusterSupplier.fromConfig(config, mockLogger);

      expect(supplier).toBeDefined();
    });
  });

  describe('getClusters', () => {
    it('should return empty array initially', async () => {
      const config = {
        url: 'https://spectrocloud.example.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: false,
        refreshIntervalSeconds: 600,
        clusterTimeoutSeconds: 15,
        rbac: {
          namespace: 'backstage-system',
          serviceAccountName: 'backstage-sa',
          secretName: 'backstage-sa-token',
          clusterRoleName: 'backstage-read-only',
          clusterRoleBindingName: 'backstage-read-only-binding',
        },
      };

      const supplier = new SpectroCloudClusterSupplier(config, mockLogger);

      const clusters = await supplier.getClusters({ credentials: {} });

      expect(clusters).toEqual([]);
    });
  });

  describe('refreshClusters', () => {
    it('should handle empty clusters array', async () => {
      const config = {
        url: 'https://spectrocloud.example.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: false,
        refreshIntervalSeconds: 600,
        clusterTimeoutSeconds: 15,
        rbac: {
          namespace: 'backstage-system',
          serviceAccountName: 'backstage-sa',
          secretName: 'backstage-sa-token',
          clusterRoleName: 'backstage-read-only',
          clusterRoleBindingName: 'backstage-read-only-binding',
        },
      };

      const supplier = new SpectroCloudClusterSupplier(config, mockLogger);

      await supplier.refreshClusters();

      const clusters = await supplier.getClusters({ credentials: {} });
      expect(clusters).toEqual([]);
    });

    it('should log error when getAllClusters returns non-array', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      SpectroCloudClient.mockImplementationOnce(() => ({
        getAllClusters: jest.fn().mockResolvedValue('not-an-array'),
      }));

      const config = {
        url: 'https://spectrocloud.example.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: false,
        refreshIntervalSeconds: 600,
        clusterTimeoutSeconds: 15,
        rbac: {
          namespace: 'backstage-system',
          serviceAccountName: 'backstage-sa',
          secretName: 'backstage-sa-token',
          clusterRoleName: 'backstage-read-only',
          clusterRoleBindingName: 'backstage-read-only-binding',
        },
      };

      const supplier = new SpectroCloudClusterSupplier(config, mockLogger);

      await supplier.refreshClusters();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

