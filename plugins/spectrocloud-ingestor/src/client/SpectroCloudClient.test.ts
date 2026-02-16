import { SpectroCloudClient } from './SpectroCloudClient';

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn();
});

const mockFetch = require('node-fetch') as jest.MockedFunction<typeof import('node-fetch').default>;

describe('SpectroCloudClient', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };

  const clientOptions = {
    url: 'https://api.spectrocloud.com',
    tenant: 'test-tenant',
    apiToken: 'test-token',
    instanceName: 'test-instance',
  };

  let client: SpectroCloudClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SpectroCloudClient(clientOptions, mockLogger as any);
  });

  describe('constructor', () => {
    it('should create client with provided options', () => {
      expect(client).toBeDefined();
    });
  });

  describe('getAllClusters', () => {
    it('should return clusters on successful response', async () => {
      const mockClusters = [
        { metadata: { uid: 'cluster-1', name: 'test-cluster' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockClusters),
      } as any);

      const result = await client.getAllClusters();
      expect(result).toEqual(mockClusters);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getAllClusters();
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getCluster', () => {
    it('should return cluster on successful response', async () => {
      const mockCluster = { metadata: { uid: 'cluster-1', name: 'test-cluster' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCluster),
      } as any);

      const result = await client.getCluster('cluster-1');
      expect(result).toEqual(mockCluster);
    });

    it('should include ProjectUid header when projectUid provided', async () => {
      const mockCluster = { metadata: { uid: 'cluster-1', name: 'test-cluster' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCluster),
      } as any);

      await client.getCluster('cluster-1', 'project-1');
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1]?.headers).toHaveProperty('ProjectUid', 'project-1');
    });

    it('should return undefined on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getCluster('cluster-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllProjects', () => {
    it('should return projects on successful response', async () => {
      const mockProjects = [
        { metadata: { uid: 'project-1', name: 'test-project' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockProjects }),
      } as any);

      const result = await client.getAllProjects();
      expect(result).toEqual(mockProjects);
    });

    it('should handle pagination', async () => {
      const page1 = [{ metadata: { uid: 'p1' } }];
      const page2 = [{ metadata: { uid: 'p2' } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page1, listmeta: { continue: 'token' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page2 }),
        } as any);

      const result = await client.getAllProjects();
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getAllProjects();
      expect(result).toEqual([]);
    });

    it('should detect duplicate continue token and stop pagination', async () => {
      const page = [{ metadata: { uid: 'p1' } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page, listmeta: { continue: 'same-token' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page, listmeta: { continue: 'same-token' } }),
        } as any);

      const result = await client.getAllProjects();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate continue token detected in getAllProjects'),
      );
    });
  });

  describe('getProject', () => {
    it('should return project on successful response', async () => {
      const mockProject = { metadata: { uid: 'project-1', name: 'test-project' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProject),
      } as any);

      const result = await client.getProject('project-1');
      expect(result).toEqual(mockProject);
    });

    it('should return undefined on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getProject('project-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllClusterProfiles', () => {
    it('should return profiles on successful response', async () => {
      const mockProfiles = [
        { metadata: { uid: 'profile-1', name: 'test-profile' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockProfiles }),
      } as any);

      const result = await client.getAllClusterProfiles();
      expect(result).toEqual(mockProfiles);
    });

    it('should handle pagination', async () => {
      const page1 = [{ metadata: { uid: 'prof1' } }];
      const page2 = [{ metadata: { uid: 'prof2' } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page1, listmeta: { continue: 'token1' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page2 }),
        } as any);

      const result = await client.getAllClusterProfiles();
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getAllClusterProfiles();
      expect(result).toEqual([]);
    });

    it('should detect duplicate continue token and stop pagination', async () => {
      const page = [{ metadata: { uid: 'prof1' } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page, listmeta: { continue: 'same-token' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page, listmeta: { continue: 'same-token' } }),
        } as any);

      const result = await client.getAllClusterProfiles();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate continue token detected in getAllClusterProfiles'),
      );
    });
  });

  describe('getClusterProfile', () => {
    it('should return profile on successful response', async () => {
      const mockProfile = { metadata: { uid: 'profile-1', name: 'test-profile' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      } as any);

      const result = await client.getClusterProfile('profile-1');
      expect(result).toEqual(mockProfile);
    });

    it('should include ProjectUid header when projectUid provided', async () => {
      const mockProfile = { metadata: { uid: 'profile-1' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      } as any);

      await client.getClusterProfile('profile-1', 'project-1');
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1]?.headers).toHaveProperty('ProjectUid', 'project-1');
    });

    it('should return undefined on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getClusterProfile('profile-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getProjectClusterProfiles', () => {
    it('should return profiles for project on successful response', async () => {
      const mockProfiles = [
        { metadata: { uid: 'profile-1', name: 'test-profile' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockProfiles }),
      } as any);

      const result = await client.getProjectClusterProfiles('project-1');
      expect(result).toEqual(mockProfiles);
    });

    it('should handle pagination', async () => {
      const page1 = [{ metadata: { uid: 'p1' } }];
      const page2 = [{ metadata: { uid: 'p2' } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page1, listmeta: { continue: 'token1' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page2 }),
        } as any);

      const result = await client.getProjectClusterProfiles('project-1');
      expect(result).toHaveLength(2);
    });

    it('should detect infinite pagination loop', async () => {
      const page = [{ metadata: { uid: 'p1' } }];

      // Return the same continue token repeatedly
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page, listmeta: { continue: 'same-token' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ items: page, listmeta: { continue: 'same-token' } }),
        } as any);

      const result = await client.getProjectClusterProfiles('project-1');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Infinite pagination loop'));
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getProjectClusterProfiles('project-1');
      expect(result).toEqual([]);
    });
  });

  describe('getClientKubeConfig', () => {
    it('should return kubeconfig on successful response', async () => {
      const mockKubeconfig = 'apiVersion: v1\nkind: Config';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockKubeconfig),
      } as any);

      const result = await client.getClientKubeConfig('cluster-1');
      expect(result).toBe(mockKubeconfig);
    });

    it('should include ProjectUid header when projectUid provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('config'),
      } as any);

      await client.getClientKubeConfig('cluster-1', 'project-1');
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1]?.headers).toHaveProperty('ProjectUid', 'project-1');
    });

    it('should return undefined on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getClientKubeConfig('cluster-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getInstanceName', () => {
    it('should return instance name', () => {
      expect(client.getInstanceName()).toBe('test-instance');
    });

    it('should return undefined if not set', () => {
      const clientWithoutInstance = new SpectroCloudClient({
        url: 'https://api.spectrocloud.com',
        tenant: 'test-tenant',
        apiToken: 'test-token',
      }, mockLogger as any);
      expect(clientWithoutInstance.getInstanceName()).toBeUndefined();
    });
  });

  describe('makeRequest (via public methods)', () => {
    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid token'),
      } as any);

      const result = await client.getAllClusters();
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

