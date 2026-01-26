import { KroApiClient, kroApiRef } from './KroApi';

describe('KroApi', () => {
  describe('kroApiRef', () => {
    it('should have correct id', () => {
      expect(kroApiRef.id).toBe('plugin.kro.api');
    });
  });

  describe('KroApiClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockFetchApi = {
      fetch: jest.fn(),
    };

    let client: KroApiClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://kro-backend');
      
      client = new KroApiClient(
        mockDiscoveryApi as any,
        mockFetchApi as any,
      );
    });

    describe('getResources', () => {
      it('should fetch resources', async () => {
        const mockResponse = {
          resources: [
            {
              type: 'Instance',
              name: 'test-instance',
              namespace: 'default',
              group: 'kro.run',
              kind: 'Test',
              status: { ready: true, synced: true, conditions: [] },
              createdAt: '2024-01-01T00:00:00Z',
              resource: {},
              level: 0,
            },
          ],
          supportingResources: [],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getResources({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-123',
          instanceId: 'instance-123',
          instanceName: 'test-instance',
          crdName: 'tests.kro.run',
        });

        expect(result.resources).toHaveLength(1);
        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://kro-backend/resources')
        );
      });

      it('should throw error on failed response', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          statusText: 'Internal Server Error',
        });

        await expect(
          client.getResources({
            clusterName: 'test-cluster',
            namespace: 'default',
            rgdName: 'test-rgd',
            rgdId: 'rgd-123',
            instanceId: 'instance-123',
            instanceName: 'test-instance',
            crdName: 'tests.kro.run',
          })
        ).rejects.toThrow('Failed to fetch from KRO backend');
      });
    });

    describe('getEvents', () => {
      it('should fetch events', async () => {
        const mockResponse = {
          events: [
            {
              reason: 'Created',
              message: 'Resource created',
              type: 'Normal',
            },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getEvents({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Pod',
        });

        expect(result.events).toHaveLength(1);
      });
    });

    describe('getResourceGraph', () => {
      it('should fetch resource graph', async () => {
        const mockResponse = {
          resources: [
            { kind: 'ResourceGraphDefinition', metadata: { name: 'test-rgd' } },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getResourceGraph({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-123',
          instanceId: 'instance-123',
          instanceName: 'test-instance',
        });

        expect(result.resources).toHaveLength(1);
        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://kro-backend/graph')
        );
      });
    });
  });
});

