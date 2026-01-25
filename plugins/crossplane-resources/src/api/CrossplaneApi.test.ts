import { CrossplaneApiClient, crossplaneApiRef } from './CrossplaneApi';

describe('CrossplaneApi', () => {
  describe('crossplaneApiRef', () => {
    it('should have correct id', () => {
      expect(crossplaneApiRef.id).toBe('plugin.crossplane.api');
    });
  });

  describe('CrossplaneApiClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockFetchApi = {
      fetch: jest.fn(),
    };

    let client: CrossplaneApiClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://crossplane-backend');
      
      client = new CrossplaneApiClient(
        mockDiscoveryApi as any,
        mockFetchApi as any,
      );
    });

    describe('getResources', () => {
      it('should fetch resources', async () => {
        const mockResponse = {
          resources: [],
          supportingResources: [],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getResources({
          clusterName: 'test-cluster',
          namespace: 'default',
          group: 'test.example.com',
          version: 'v1',
          plural: 'testclaims',
          name: 'my-claim',
        });

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://crossplane-backend'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        expect(result).toEqual(mockResponse);
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
            group: 'test.example.com',
            version: 'v1',
            plural: 'testclaims',
            name: 'my-claim',
          })
        ).rejects.toThrow('Failed to fetch from Crossplane backend');
      });
    });

    describe('getEvents', () => {
      it('should fetch events', async () => {
        const mockResponse = {
          events: [
            { reason: 'Created', message: 'Resource created' },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getEvents({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'my-resource',
          resourceKind: 'Pod',
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getResourceGraph', () => {
      it('should fetch resource graph', async () => {
        const mockResponse = {
          resources: [],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getResourceGraph({
          clusterName: 'test-cluster',
          namespace: 'default',
          xrdName: 'test-xrd',
          xrdId: 'xrd-123',
          claimId: 'claim-123',
          claimName: 'my-claim',
          claimGroup: 'test.example.com',
          claimVersion: 'v1',
          claimPlural: 'testclaims',
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getV2ResourceGraph', () => {
      it('should fetch V2 resource graph', async () => {
        const mockResponse = {
          resources: [],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getV2ResourceGraph({
          clusterName: 'test-cluster',
          namespace: 'default',
          name: 'my-composite',
          group: 'test.example.com',
          version: 'v1',
          plural: 'composites',
          scope: 'Namespaced',
        });

        expect(result).toEqual(mockResponse);
      });
    });
  });
});

