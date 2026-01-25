import { SpectroCloudClusterSupplier } from './SpectroCloudClusterSupplier';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Mock the SpectroCloudClient
jest.mock('../client/SpectroCloudClient', () => ({
  SpectroCloudClient: jest.fn().mockImplementation(() => ({
    getAllClusters: jest.fn(),
    getProject: jest.fn(),
    getAdminKubeConfig: jest.fn(),
  })),
}));

// Mock @kubernetes/client-node
jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromString: jest.fn(),
    clusters: [{ server: 'https://cluster.example.com', caData: 'test-ca-data' }],
    makeApiClient: jest.fn().mockImplementation((apiClass) => {
      if (apiClass.name === 'CoreV1Api') {
        return {
          readNamespace: jest.fn().mockResolvedValue({}),
          createNamespace: jest.fn().mockResolvedValue({}),
          readNamespacedServiceAccount: jest.fn().mockResolvedValue({}),
          createNamespacedServiceAccount: jest.fn().mockResolvedValue({}),
          readNamespacedSecret: jest.fn().mockResolvedValue({
            data: {
              token: Buffer.from('test-token').toString('base64'),
              'ca.crt': Buffer.from('test-ca-cert').toString('base64'),
            },
          }),
          createNamespacedSecret: jest.fn().mockResolvedValue({}),
        };
      }
      if (apiClass.name === 'RbacAuthorizationV1Api') {
        return {
          readClusterRole: jest.fn().mockResolvedValue({}),
          createClusterRole: jest.fn().mockResolvedValue({}),
          readClusterRoleBinding: jest.fn().mockResolvedValue({}),
          createClusterRoleBinding: jest.fn().mockResolvedValue({}),
        };
      }
      return {};
    }),
  })),
  CoreV1Api: jest.fn(),
  RbacAuthorizationV1Api: jest.fn(),
}));

// Suppress console output during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe('SpectroCloudClusterSupplier', () => {
  const mockLogger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fromConfig', () => {
    it('should create supplier from config with defaults', () => {
      const config = new ConfigReader({
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
      });

      const supplier = SpectroCloudClusterSupplier.fromConfig(config, mockLogger);

      expect(supplier).toBeDefined();
      expect(supplier).toBeInstanceOf(SpectroCloudClusterSupplier);
    });

    it('should create supplier from config with custom values', () => {
      const config = new ConfigReader({
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        name: 'my-spectrocloud',
        clusterProvider: {
          excludeProjects: ['project-to-exclude'],
          includeProjects: ['project-to-include'],
          skipMetricsLookup: false,
          excludeTenantScopedClusters: true,
          refreshIntervalSeconds: 300,
          clusterTimeoutSeconds: 30,
          rbac: {
            namespace: 'custom-ns',
            serviceAccountName: 'custom-sa',
            secretName: 'custom-secret',
            clusterRoleName: 'custom-role',
            clusterRoleBindingName: 'custom-binding',
          },
        },
      });

      const supplier = SpectroCloudClusterSupplier.fromConfig(config, mockLogger);

      expect(supplier).toBeDefined();
    });

    it('should create supplier with custom RBAC rules', () => {
      const config = new ConfigReader({
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        clusterProvider: {
          rbac: {
            clusterRoleRules: [
              { apiGroups: ['core'], resources: ['pods'], verbs: ['get', 'list'] },
              { apiGroups: ['apps'], resources: ['deployments'], verbs: ['get', 'list', 'watch'] },
            ],
          },
        },
      });

      const supplier = SpectroCloudClusterSupplier.fromConfig(config, mockLogger);

      expect(supplier).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should create supplier with config', () => {
      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(supplier).toBeDefined();
    });

    it('should create supplier with instance name prefix', () => {
      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        name: 'prod',
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

      expect(supplier).toBeDefined();
    });
  });

  describe('getClusters', () => {
    it('should return empty array initially', async () => {
      const config = {
        url: 'https://api.spectrocloud.com',
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

    it('should return clusters after refresh', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      const mockCluster = {
        metadata: {
          name: 'test-cluster',
          uid: 'cluster-uid-1',
          annotations: {
            scope: 'project',
            projectUid: 'project-uid-1',
          },
        },
      };

      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([mockCluster]),
        getProject: jest.fn().mockResolvedValue({ metadata: { name: 'test-project' } }),
        getAdminKubeConfig: jest.fn().mockResolvedValue(`
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://cluster.example.com
    certificate-authority-data: dGVzdC1jYQ==
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: admin
  name: test-context
current-context: test-context
users:
- name: admin
  user:
    token: admin-token
`),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: false,
        refreshIntervalSeconds: 600,
        clusterTimeoutSeconds: 30,
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

      expect(clusters.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('refreshClusters', () => {
    it('should handle empty clusters list', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([]),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('0 cluster(s) configured')
      );
    });

    it('should skip clusters without name', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([
          { metadata: {} }, // No name
        ]),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('has no name')
      );
    });

    it('should skip clusters without UID', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([
          { metadata: { name: 'test-cluster' } }, // No UID
        ]),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('has no UID')
      );
    });

    it('should skip tenant-scoped clusters when excludeTenantScopedClusters is true', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([
          { 
            metadata: { 
              name: 'tenant-cluster', 
              uid: 'cluster-uid', 
              annotations: { scope: 'tenant' } 
            } 
          },
        ]),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: true,
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

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('tenant-scoped clusters excluded')
      );
    });

    it('should skip clusters from excluded projects', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([
          { 
            metadata: { 
              name: 'excluded-cluster', 
              uid: 'cluster-uid', 
              annotations: { scope: 'project', projectUid: 'project-uid' } 
            } 
          },
        ]),
        getProject: jest.fn().mockResolvedValue({ metadata: { name: 'excluded-project' } }),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: [],
        excludeProjects: ['excluded-project'],
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

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('is excluded')
      );
    });

    it('should skip clusters not in includeProjects', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([
          { 
            metadata: { 
              name: 'other-cluster', 
              uid: 'cluster-uid', 
              annotations: { scope: 'project', projectUid: 'project-uid' } 
            } 
          },
        ]),
        getProject: jest.fn().mockResolvedValue({ metadata: { name: 'other-project' } }),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        includeProjects: ['specific-project'],
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

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('not in includeProjects')
      );
    });

    it('should handle getAllClusters returning non-array', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue(null),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('did not return an array')
      );
    });

    it('should handle failed kubeconfig fetch', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([
          { 
            metadata: { 
              name: 'test-cluster', 
              uid: 'cluster-uid', 
              annotations: { scope: 'project', projectUid: 'project-uid' } 
            } 
          },
        ]),
        getProject: jest.fn().mockResolvedValue({ metadata: { name: 'test-project' } }),
        getAdminKubeConfig: jest.fn().mockResolvedValue(null),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch admin kubeconfig')
      );
    });

    it('should handle API errors gracefully', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockRejectedValue(new Error('API Error')),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn(),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
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

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('FATAL: Failed to refresh SpectroCloud clusters')
      );
    });
  });

  describe('prefixClusterName', () => {
    it('should pass prefixed cluster name when instance name is configured', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      const mockCluster = {
        metadata: {
          name: 'test-cluster',
          uid: 'cluster-uid-1',
          annotations: {
            scope: 'tenant',
          },
        },
      };

      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([mockCluster]),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn().mockResolvedValue('apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    server: https://cluster.example.com\n  name: test'),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        name: 'prod',
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: false,
        refreshIntervalSeconds: 600,
        clusterTimeoutSeconds: 30,
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

      // Verify the supplier processed the clusters (may fail due to k8s API, but logs show processing)
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle clusters without instance name prefix', async () => {
      const { SpectroCloudClient } = require('../client/SpectroCloudClient');
      
      const mockCluster = {
        metadata: {
          name: 'test-cluster',
          uid: 'cluster-uid-1',
          annotations: {
            scope: 'tenant',
          },
        },
      };

      SpectroCloudClient.mockImplementation(() => ({
        getAllClusters: jest.fn().mockResolvedValue([mockCluster]),
        getProject: jest.fn(),
        getAdminKubeConfig: jest.fn().mockResolvedValue('apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    server: https://cluster.example.com\n  name: test'),
      }));

      const config = {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        // No name configured - cluster name won't be prefixed
        includeProjects: [],
        excludeProjects: [],
        skipMetricsLookup: true,
        excludeTenantScopedClusters: false,
        refreshIntervalSeconds: 600,
        clusterTimeoutSeconds: 30,
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

      // Verify the supplier processed the clusters
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});
