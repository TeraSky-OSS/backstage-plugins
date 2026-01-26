import { SpectroCloudClient } from './SpectroCloudClient';
import { mockServices } from '@backstage/backend-test-utils';

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn();
});

import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('SpectroCloudClient', () => {
  let client: SpectroCloudClient;
  const logger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SpectroCloudClient(
      {
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
        instanceName: 'test-instance',
      },
      logger,
    );
  });

  describe('getInstanceName', () => {
    it('should return the instance name', () => {
      expect(client.getInstanceName()).toBe('test-instance');
    });

    it('should return undefined when instance name is not set', () => {
      const clientWithoutInstance = new SpectroCloudClient(
        {
          url: 'https://api.spectrocloud.com',
          tenant: 'test-tenant',
          apiToken: 'test-token',
        },
        logger,
      );
      expect(clientWithoutInstance.getInstanceName()).toBeUndefined();
    });
  });

  describe('getAllClusters', () => {
    it('should return clusters when API call succeeds', async () => {
      const mockClusters = [
        {
          metadata: { uid: 'cluster-1', name: 'test-cluster-1' },
          status: { state: 'Running' },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusters,
      } as any);

      const clusters = await client.getAllClusters();

      expect(clusters).toEqual(mockClusters);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spectrocloud.com/v1/dashboard/spectroclusters/meta',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            ApiKey: 'test-token',
          }),
        }),
      );
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      } as any);

      const clusters = await client.getAllClusters();

      expect(clusters).toEqual([]);
    });
  });

  describe('getCluster', () => {
    it('should return cluster details when API call succeeds', async () => {
      const mockCluster = {
        metadata: { uid: 'cluster-1', name: 'test-cluster' },
        spec: { cloudType: 'aws' },
        status: { state: 'Running' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCluster,
      } as any);

      const cluster = await client.getCluster('cluster-1');

      expect(cluster).toEqual(mockCluster);
    });

    it('should include ProjectUid header when projectUid is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      await client.getCluster('cluster-1', 'project-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            ProjectUid: 'project-1',
          }),
        }),
      );
    });

    it('should return undefined when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      } as any);

      const cluster = await client.getCluster('invalid-cluster');

      expect(cluster).toBeUndefined();
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects with pagination', async () => {
      const page1 = {
        items: [{ metadata: { uid: 'project-1', name: 'Project 1' } }],
        listmeta: { continue: 'token1' },
      };
      const page2 = {
        items: [{ metadata: { uid: 'project-2', name: 'Project 2' } }],
        listmeta: {},
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        } as any);

      const projects = await client.getAllProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0].metadata.uid).toBe('project-1');
      expect(projects[1].metadata.uid).toBe('project-2');
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      } as any);

      const projects = await client.getAllProjects();

      expect(projects).toEqual([]);
    });
  });

  describe('getClientKubeConfig', () => {
    it('should return kubeconfig when API call succeeds', async () => {
      const mockKubeconfig = 'apiVersion: v1\nkind: Config\n...';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockKubeconfig,
      } as any);

      const kubeconfig = await client.getClientKubeConfig('cluster-1');

      expect(kubeconfig).toBe(mockKubeconfig);
    });

    it('should return undefined when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Forbidden',
      } as any);

      const kubeconfig = await client.getClientKubeConfig('cluster-1');

      expect(kubeconfig).toBeUndefined();
    });

    it('should use frp parameter in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'kubeconfig',
      } as any);

      await client.getClientKubeConfig('cluster-1', undefined, false);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('frp=false'),
        expect.any(Object),
      );
    });
  });

  describe('searchClusterProfilesByName', () => {
    it('should filter profiles by name', async () => {
      const mockProfiles = {
        items: [
          { metadata: { uid: 'p1', name: 'profile-1' } },
          { metadata: { uid: 'p2', name: 'profile-2' } },
          { metadata: { uid: 'p3', name: 'other' } },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      } as any);

      const profiles = await client.searchClusterProfilesByName(['profile-1', 'profile-2']);

      expect(profiles).toHaveLength(2);
      expect(profiles.map(p => p.metadata.name)).toEqual(['profile-1', 'profile-2']);
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      } as any);

      const profiles = await client.searchClusterProfilesByName(['profile-1']);

      expect(profiles).toEqual([]);
    });

    it('should include ProjectUid header when projectUid is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as any);

      await client.searchClusterProfilesByName(['profile-1'], 'project-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            ProjectUid: 'project-1',
          }),
        }),
      );
    });
  });

  describe('getProject', () => {
    it('should return project when API call succeeds', async () => {
      const mockProject = {
        metadata: { uid: 'project-1', name: 'Test Project' },
        spec: { description: 'Test description' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      } as any);

      const project = await client.getProject('project-1');

      expect(project).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spectrocloud.com/v1/projects/project-1',
        expect.any(Object),
      );
    });

    it('should return undefined when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      } as any);

      const project = await client.getProject('invalid-project');

      expect(project).toBeUndefined();
    });
  });

  describe('getAllClusterProfiles', () => {
    it('should return all cluster profiles with pagination', async () => {
      const page1 = {
        items: [{ metadata: { uid: 'profile-1', name: 'Profile 1' } }],
        listmeta: { continue: 'token1' },
      };
      const page2 = {
        items: [{ metadata: { uid: 'profile-2', name: 'Profile 2' } }],
        listmeta: {},
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        } as any);

      const profiles = await client.getAllClusterProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles[0].metadata.uid).toBe('profile-1');
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      } as any);

      const profiles = await client.getAllClusterProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe('getProjectClusterProfiles', () => {
    it('should return project cluster profiles', async () => {
      const mockProfiles = {
        items: [{ metadata: { uid: 'profile-1', name: 'Profile 1' } }],
        listmeta: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      } as any);

      const profiles = await client.getProjectClusterProfiles('project-1');

      expect(profiles).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            ProjectUid: 'project-1',
          }),
        }),
      );
    });

    it('should handle pagination', async () => {
      const page1 = {
        items: [{ metadata: { uid: 'profile-1' } }],
        listmeta: { continue: 'token1' },
      };
      const page2 = {
        items: [{ metadata: { uid: 'profile-2' } }],
        listmeta: {},
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => page1 } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => page2 } as any);

      const profiles = await client.getProjectClusterProfiles('project-1');

      expect(profiles).toHaveLength(2);
    });

    it('should return empty array when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      } as any);

      const profiles = await client.getProjectClusterProfiles('project-1');

      expect(profiles).toEqual([]);
    });
  });

  describe('getClusterProfile', () => {
    it('should return cluster profile when API call succeeds', async () => {
      const mockProfile = {
        metadata: { uid: 'profile-1', name: 'Test Profile' },
        spec: { type: 'cluster' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as any);

      const profile = await client.getClusterProfile('profile-1');

      expect(profile).toEqual(mockProfile);
    });

    it('should include ProjectUid header when projectUid is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      await client.getClusterProfile('profile-1', 'project-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            ProjectUid: 'project-1',
          }),
        }),
      );
    });

    it('should return undefined when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      } as any);

      const profile = await client.getClusterProfile('invalid-profile');

      expect(profile).toBeUndefined();
    });
  });

  describe('getClusterProfiles (for cluster)', () => {
    it('should return cluster profiles with pack metadata', async () => {
      const mockProfiles = {
        profiles: [{ uid: 'profile-1', packs: [] }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfiles,
      } as any);

      const result = await client.getClusterProfiles('cluster-1');

      expect(result).toEqual(mockProfiles);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/spectroclusters/cluster-1/profiles'),
        expect.any(Object),
      );
    });

    it('should include ProjectUid header when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profiles: [] }),
      } as any);

      await client.getClusterProfiles('cluster-1', 'project-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            ProjectUid: 'project-1',
          }),
        }),
      );
    });

    it('should return empty profiles when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      } as any);

      const result = await client.getClusterProfiles('cluster-1');

      expect(result).toEqual({ profiles: [] });
    });
  });

  describe('getPackManifest', () => {
    it('should return pack manifest when API call succeeds', async () => {
      const mockManifest = {
        metadata: { uid: 'manifest-1' },
        spec: { content: 'manifest content' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest,
      } as any);

      const manifest = await client.getPackManifest('cluster-1', 'manifest-1');

      expect(manifest).toEqual(mockManifest);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pack/manifests/manifest-1'),
        expect.any(Object),
      );
    });

    it('should include ProjectUid header when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      await client.getPackManifest('cluster-1', 'manifest-1', 'project-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            ProjectUid: 'project-1',
          }),
        }),
      );
    });

    it('should return null when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      } as any);

      const manifest = await client.getPackManifest('cluster-1', 'invalid-manifest');

      expect(manifest).toBeNull();
    });
  });
});

