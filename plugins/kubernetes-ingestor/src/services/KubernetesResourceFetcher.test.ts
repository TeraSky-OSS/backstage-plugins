import { DefaultKubernetesResourceFetcher } from './KubernetesResourceFetcher';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('DefaultKubernetesResourceFetcher', () => {
  const mockDiscoveryApi = {
    getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/kubernetes'),
  };

  const mockAuth = {
    getOwnServiceCredentials: jest.fn().mockResolvedValue({ token: 'service-token' }),
    getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'plugin-token' }),
  };

  let fetcher: DefaultKubernetesResourceFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    fetcher = new DefaultKubernetesResourceFetcher(
      mockDiscoveryApi as any,
      mockAuth as any,
    );
  });

  describe('getClusters', () => {
    it('should fetch and return cluster names', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { name: 'cluster-1' },
            { name: 'cluster-2' },
          ],
        }),
      } as any);

      const clusters = await fetcher.getClusters();

      expect(clusters).toEqual(['cluster-1', 'cluster-2']);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/kubernetes/clusters',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer plugin-token',
          }),
        }),
      );
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as any);

      await expect(fetcher.getClusters()).rejects.toThrow('Failed to fetch clusters');
    });
  });

  describe('fetchResources', () => {
    it('should fetch resources with namespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ metadata: { name: 'resource-1' } }],
        }),
      } as any);

      const resources = await fetcher.fetchResources({
        clusterName: 'test-cluster',
        namespace: 'default',
        resourcePath: 'apps/v1/deployments',
      });

      expect(resources).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/proxy/apis/apps/v1/deployments?namespace=default'),
        expect.any(Object),
      );
    });

    it('should return empty array on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const resources = await fetcher.fetchResources({
        clusterName: 'test-cluster',
        resourcePath: 'custom.example.com/v1/resources',
      });

      expect(resources).toEqual([]);
    });

    it('should throw error on non-404 failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      await expect(
        fetcher.fetchResources({
          clusterName: 'test-cluster',
          resourcePath: 'apps/v1/deployments',
        }),
      ).rejects.toThrow('Failed to fetch Kubernetes resources');
    });
  });

  describe('fetchResource', () => {
    it('should fetch single resource', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ metadata: { name: 'resource-1' } }),
      } as any);

      const resource = await fetcher.fetchResource({
        clusterName: 'test-cluster',
        resourcePath: 'apps/v1/deployments/my-deploy',
      });

      expect(resource).toEqual({ metadata: { name: 'resource-1' } });
    });

    it('should include namespace in path when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ metadata: { name: 'resource-1' } }),
      } as any);

      await fetcher.fetchResource({
        clusterName: 'test-cluster',
        namespace: 'my-namespace',
        resourcePath: 'apps/v1/deployments/my-deploy',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('namespace=my-namespace'),
        expect.any(Object),
      );
    });
  });
});
