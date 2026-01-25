import { SpectroCloudApiClient, spectroCloudApiRef } from './SpectroCloudApi';

describe('SpectroCloudApi', () => {
  describe('spectroCloudApiRef', () => {
    it('should have correct id', () => {
      expect(spectroCloudApiRef.id).toBe('plugin.spectrocloud.api');
    });
  });

  describe('SpectroCloudApiClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockFetchApi = {
      fetch: jest.fn(),
    };

    let client: SpectroCloudApiClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://spectrocloud-backend');

      client = new SpectroCloudApiClient({
        discoveryApi: mockDiscoveryApi as any,
        fetchApi: mockFetchApi as any,
      });
    });

    describe('getKubeconfig', () => {
      it('should fetch kubeconfig', async () => {
        const mockKubeconfig = 'apiVersion: v1\nclusters: []';

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(mockKubeconfig),
        });

        const result = await client.getKubeconfig('cluster-123');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/clusters/cluster-123/kubeconfig'),
        );
        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('frp=true'),
        );
        expect(result).toBe(mockKubeconfig);
      });

      it('should include projectUid when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(''),
        });

        await client.getKubeconfig('cluster-123', 'project-456');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('projectUid=project-456'),
        );
      });

      it('should include instance when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(''),
        });

        await client.getKubeconfig('cluster-123', undefined, 'test-instance');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
        );
      });

      it('should pass frp parameter', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(''),
        });

        await client.getKubeconfig('cluster-123', undefined, undefined, false);

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('frp=false'),
        );
      });

      it('should throw error on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Not Found'),
        });

        await expect(client.getKubeconfig('cluster-123')).rejects.toThrow(
          'Failed to fetch kubeconfig: Not Found'
        );
      });
    });

    describe('getClusterDetails', () => {
      it('should fetch cluster details', async () => {
        const mockCluster = {
          metadata: { uid: 'cluster-123', name: 'test-cluster' },
          status: { state: 'Running' },
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockCluster),
        });

        const result = await client.getClusterDetails('cluster-123');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/clusters/cluster-123?'),
        );
        expect(result.metadata.name).toBe('test-cluster');
      });

      it('should include projectUid when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ metadata: { uid: '123', name: 'test' } }),
        });

        await client.getClusterDetails('cluster-123', 'project-456');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('projectUid=project-456'),
        );
      });

      it('should include instance when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ metadata: { uid: '123', name: 'test' } }),
        });

        await client.getClusterDetails('cluster-123', undefined, 'test-instance');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
        );
      });

      it('should throw error on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Cluster not found'),
        });

        await expect(client.getClusterDetails('cluster-123')).rejects.toThrow(
          'Failed to fetch cluster details: Cluster not found'
        );
      });
    });

    describe('searchProfiles', () => {
      it('should search profiles by names', async () => {
        const mockProfiles = [
          { metadata: { uid: 'profile-1', name: 'Profile 1' } },
        ];

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ profiles: mockProfiles }),
        });

        const result = await client.searchProfiles(['Profile 1']);

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/profiles/search'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: ['Profile 1'] }),
          }),
        );
        expect(result).toHaveLength(1);
      });

      it('should include projectUid when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ profiles: [] }),
        });

        await client.searchProfiles(['Profile'], 'project-456');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('projectUid=project-456'),
          expect.any(Object),
        );
      });

      it('should include instance when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ profiles: [] }),
        });

        await client.searchProfiles(['Profile'], undefined, 'test-instance');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object),
        );
      });

      it('should return empty array when profiles is undefined', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const result = await client.searchProfiles(['Profile']);

        expect(result).toEqual([]);
      });

      it('should throw error on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Search failed'),
        });

        await expect(client.searchProfiles(['Profile'])).rejects.toThrow(
          'Failed to search profiles: Search failed'
        );
      });
    });

    describe('getClusterProfiles', () => {
      it('should fetch cluster profiles', async () => {
        const mockProfiles = {
          profiles: [
            {
              metadata: { uid: 'profile-1', name: 'Profile 1' },
              spec: { cloudType: 'aws', type: 'cluster', packs: [] },
            },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockProfiles),
        });

        const result = await client.getClusterProfiles('cluster-123');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/clusters/cluster-123/profiles'),
        );
        expect(result.profiles).toHaveLength(1);
      });

      it('should include projectUid when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ profiles: [] }),
        });

        await client.getClusterProfiles('cluster-123', 'project-456');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('projectUid=project-456'),
        );
      });

      it('should include instance when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ profiles: [] }),
        });

        await client.getClusterProfiles('cluster-123', undefined, 'test-instance');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
        );
      });

      it('should throw error on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Failed to fetch profiles'),
        });

        await expect(client.getClusterProfiles('cluster-123')).rejects.toThrow(
          'Failed to fetch cluster profiles: Failed to fetch profiles'
        );
      });
    });

    describe('getPackManifest', () => {
      it('should fetch pack manifest', async () => {
        const mockManifest = {
          metadata: { name: 'test-manifest', uid: 'manifest-123' },
          spec: { published: { content: 'apiVersion: v1' } },
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockManifest),
        });

        const result = await client.getPackManifest('cluster-123', 'manifest-123');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/clusters/cluster-123/pack/manifests/manifest-123'),
        );
        expect(result.metadata.name).toBe('test-manifest');
      });

      it('should include projectUid when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ metadata: {}, spec: {} }),
        });

        await client.getPackManifest('cluster-123', 'manifest-123', 'project-456');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('projectUid=project-456'),
        );
      });

      it('should include instance when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ metadata: {}, spec: {} }),
        });

        await client.getPackManifest('cluster-123', 'manifest-123', undefined, 'test-instance');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
        );
      });

      it('should throw error on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Manifest not found'),
        });

        await expect(client.getPackManifest('cluster-123', 'manifest-123')).rejects.toThrow(
          'Failed to fetch manifest: Manifest not found'
        );
      });
    });
  });
});

