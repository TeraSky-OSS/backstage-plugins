import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { InputError, NotAllowedError } from '@backstage/errors';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockCatalogApi = {
    getEntities: jest.fn(),
  };

  const mockAuth = mockServices.auth.mock();
  const mockPermissions = mockServices.permissions.mock();

  const mockConfig = new ConfigReader({
    spectrocloud: {
      enablePermissions: false,
      environments: [
        {
          name: 'test-instance',
          url: 'http://spectrocloud.example.com',
          tenant: 'test-tenant',
          apiToken: 'test-token',
        },
      ],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:spectrocloud-backend' } } as any);
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-plugin-token' });
    mockPermissions.authorize.mockResolvedValue([{ result: 'ALLOW' }]);
  });

  const allActionNames = [
    'get_spectrocloud_health_for_cluster',
    'get_spectrocloud_kubeconfig_for_cluster',
    'get_spectrocloud_pack_details_for_profile',
    'find_spectrocloud_clusters_for_profile',
    'list_spectrocloud_clusters',
    'list_spectrocloud_virtual_clusters',
    'list_spectrocloud_projects',
    'list_spectrocloud_cluster_groups',
    'search_spectrocloud_profiles_by_names',
    'get_spectrocloud_profile_variables',
    'list_spectrocloud_profiles_for_project',
    'get_spectrocloud_pack_manifest_for_cluster',
    'get_spectrocloud_cluster_profiles',
    'get_spectrocloud_virtual_cluster_details',
    'get_spectrocloud_kubeconfig_for_virtual_cluster',
    'get_spectrocloud_cluster_group',
    'list_spectrocloud_cloud_accounts',
  ];

  it('should register all MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockConfig,
      mockCatalogApi as any,
      mockAuth,
      mockPermissions,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(17);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    for (const name of allActionNames) {
      expect(registeredActions).toContain(name);
    }
  });

  describe('get_spectrocloud_health_for_cluster action', () => {
    let healthAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      healthAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_health_for_cluster'
      )?.[0];
    });

    it('should throw InputError when no entity is found', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({ items: [] });

      await expect(
        healthAction.action({ input: { clusterName: 'non-existent' } })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when multiple entities are found', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [
          { metadata: { name: 'cluster1' } },
          { metadata: { name: 'cluster2' } },
        ],
      });

      await expect(
        healthAction.action({ input: { clusterName: 'ambiguous' } })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when cluster UID is missing', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-cluster',
            annotations: {},
          },
        }],
      });

      await expect(
        healthAction.action({ input: { clusterName: 'test-cluster' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_spectrocloud_kubeconfig_for_cluster action', () => {
    let kubeconfigAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      kubeconfigAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_kubeconfig_for_cluster'
      )?.[0];
    });

    it('should throw InputError when no entity is found', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({ items: [] });

      await expect(
        kubeconfigAction.action({ input: { clusterName: 'non-existent' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_spectrocloud_pack_details_for_profile action', () => {
    let packDetailsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      packDetailsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_pack_details_for_profile'
      )?.[0];
    });

    it('should throw InputError when no entity is found', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({ items: [] });

      await expect(
        packDetailsAction.action({ input: { profileName: 'non-existent' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('find_spectrocloud_clusters_for_profile action', () => {
    let findClustersAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      findClustersAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'find_spectrocloud_clusters_for_profile'
      )?.[0];
    });

    it('should throw InputError when no entity is found', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({ items: [] });

      await expect(
        findClustersAction.action({ input: { profileName: 'non-existent' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('permission checks', () => {
    it('should deny access when permissions are enabled and denied', async () => {
      const configWithPermissions = new ConfigReader({
        spectrocloud: {
          enablePermissions: true,
          environments: [
            {
              name: 'test-instance',
              url: 'http://spectrocloud.example.com',
              tenant: 'test-tenant',
              apiToken: 'test-token',
            },
          ],
        },
      });

      mockPermissions.authorize.mockResolvedValue([{ result: 'DENY' }]);

      registerMcpActions(
        mockActionsRegistry as any,
        configWithPermissions,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );

      const healthAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_health_for_cluster'
      )?.[0];

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-cluster',
            annotations: {
              'terasky.backstage.io/cluster-id': 'cluster-123',
            },
          },
        }],
      });

      await expect(
        healthAction.action({ input: { clusterName: 'test-cluster' } })
      ).rejects.toThrow(NotAllowedError);
    });
  });

  describe('no SpectroCloud config', () => {
    it('should throw InputError when no environments are configured', async () => {
      const emptyConfig = new ConfigReader({});

      registerMcpActions(
        mockActionsRegistry as any,
        emptyConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );

      const healthAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_health_for_cluster'
      )?.[0];

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-cluster',
            annotations: {
              'terasky.backstage.io/cluster-id': 'cluster-123',
            },
          },
        }],
      });

      await expect(
        healthAction.action({ input: { clusterName: 'test-cluster' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('find_spectrocloud_clusters_for_profile - cluster filtering', () => {
    let findClustersAction: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:spectrocloud-backend' } } as any);
      mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-plugin-token' });

      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      findClustersAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'find_spectrocloud_clusters_for_profile'
      )?.[0];
    });

    it('should filter clusters by profile and return matching ones', async () => {
      mockCatalogApi.getEntities
        .mockResolvedValueOnce({
          items: [{
            metadata: {
              name: 'my-profile',
              annotations: {
                'terasky.backstage.io/profile-id': 'profile-123',
              },
            },
          }],
        })
        .mockResolvedValueOnce({
          items: [
            {
              metadata: {
                name: 'cluster-1',
                title: 'Cluster 1',
                annotations: {
                  'terasky.backstage.io/cluster-id': 'cluster-1-id',
                  'terasky.backstage.io/cluster-profile-refs': JSON.stringify([{ name: 'my-profile', uid: 'profile-123' }]),
                },
              },
            },
            {
              metadata: {
                name: 'cluster-2',
                title: 'Cluster 2',
                annotations: {
                  'terasky.backstage.io/cluster-id': 'cluster-2-id',
                  'terasky.backstage.io/cluster-profile-refs': JSON.stringify([{ name: 'other-profile', uid: 'profile-456' }]),
                },
              },
            },
          ],
        });

      const result = await findClustersAction.action({
        input: { profileName: 'my-profile' },
        credentials: undefined,
      });

      expect(result.output.clusters).toHaveLength(1);
      expect(result.output.clusters[0].name).toBe('Cluster 1');
    });

    it('should handle invalid JSON in cluster-profile-refs annotation', async () => {
      mockCatalogApi.getEntities
        .mockResolvedValueOnce({
          items: [{
            metadata: {
              name: 'my-profile',
              annotations: {
                'terasky.backstage.io/profile-id': 'profile-123',
              },
            },
          }],
        })
        .mockResolvedValueOnce({
          items: [
            {
              metadata: {
                name: 'cluster-1',
                annotations: {
                  'terasky.backstage.io/cluster-profile-refs': 'invalid-json',
                },
              },
            },
          ],
        });

      const result = await findClustersAction.action({
        input: { profileName: 'my-profile' },
        credentials: undefined,
      });

      expect(result.output.clusters).toHaveLength(0);
    });

    it('should throw InputError when profile UID is missing', async () => {
      mockCatalogApi.getEntities.mockResolvedValueOnce({
        items: [{
          metadata: {
            name: 'my-profile',
            annotations: {},
          },
        }],
      });

      await expect(
        findClustersAction.action({
          input: { profileName: 'my-profile' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_spectrocloud_kubeconfig_for_cluster - additional cases', () => {
    let kubeconfigAction: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:spectrocloud-backend' } } as any);
      mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-plugin-token' });

      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      kubeconfigAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_kubeconfig_for_cluster'
      )?.[0];
    });

    it('should throw InputError when cluster UID is missing', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-cluster',
            annotations: {},
          },
        }],
      });

      await expect(
        kubeconfigAction.action({ input: { clusterName: 'test-cluster' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_spectrocloud_pack_details_for_profile - additional cases', () => {
    let packDetailsAction: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:spectrocloud-backend' } } as any);
      mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-plugin-token' });

      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      packDetailsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_pack_details_for_profile'
      )?.[0];
    });

    it('should throw InputError when profile UID is missing', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-profile',
            annotations: {},
          },
        }],
      });

      await expect(
        packDetailsAction.action({ input: { profileName: 'test-profile' } })
      ).rejects.toThrow(InputError);
    });
  });

  describe('permission check with failure', () => {
    it('should handle permission check failure gracefully', async () => {
      const configWithPermissions = new ConfigReader({
        spectrocloud: {
          enablePermissions: true,
          environments: [
            {
              name: 'test-instance',
              url: 'http://spectrocloud.example.com',
              tenant: 'test-tenant',
              apiToken: 'test-token',
            },
          ],
        },
      });

      mockPermissions.authorize.mockRejectedValue(new Error('Permission service unavailable'));

      registerMcpActions(
        mockActionsRegistry as any,
        configWithPermissions,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );

      const healthAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_health_for_cluster'
      )?.[0];

      // Verify action is registered even when permissions fail
      expect(healthAction).toBeDefined();
    });
  });

  describe('instance matching', () => {
    it('should configure multiple instances from config', () => {
      const multiInstanceConfig = new ConfigReader({
        spectrocloud: {
          environments: [
            {
              name: 'instance-1',
              url: 'http://instance1.example.com',
              tenant: 'tenant1',
              apiToken: 'token1',
            },
            {
              name: 'instance-2',
              url: 'http://instance2.example.com',
              tenant: 'tenant2',
              apiToken: 'token2',
            },
          ],
        },
      });

      const newRegistry = {
        register: jest.fn(),
      };

      registerMcpActions(
        newRegistry as any,
        multiInstanceConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );

      // Should register actions for each instance
      expect(newRegistry.register).toHaveBeenCalled();
    });
  });

  describe('new MCP actions - input validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:spectrocloud-backend' } } as any);
      mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-plugin-token' });
      registerMcpActions(
        mockActionsRegistry as any,
        mockConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
    });

    it('get_spectrocloud_profile_variables throws when neither profileName nor profileUid provided', async () => {
      const action = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_profile_variables'
      )?.[0];
      await expect(
        action.action({ input: {} })
      ).rejects.toThrow(InputError);
    });

    it('get_spectrocloud_pack_manifest_for_cluster throws when neither clusterName nor clusterUid provided', async () => {
      const action = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_pack_manifest_for_cluster'
      )?.[0];
      await expect(
        action.action({ input: { manifestUid: 'some-manifest' } })
      ).rejects.toThrow(InputError);
    });

    it('get_spectrocloud_cluster_profiles throws when neither clusterName nor clusterUid provided', async () => {
      const action = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_spectrocloud_cluster_profiles'
      )?.[0];
      await expect(
        action.action({ input: {} })
      ).rejects.toThrow(InputError);
    });

  });

  describe('new MCP actions - no SpectroCloud config', () => {
    it('list_spectrocloud_clusters throws InputError when no environments configured', async () => {
      const emptyConfig = new ConfigReader({});
      registerMcpActions(
        mockActionsRegistry as any,
        emptyConfig,
        mockCatalogApi as any,
        mockAuth,
        mockPermissions,
      );
      const action = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_spectrocloud_clusters'
      )?.[0];
      await expect(
        action.action({ input: {} })
      ).rejects.toThrow(InputError);
    });
  });
});

