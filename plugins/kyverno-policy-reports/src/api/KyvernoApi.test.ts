import { KyvernoApiClient, kyvernoApiRef } from './KyvernoApi';

describe('KyvernoApi', () => {
  describe('kyvernoApiRef', () => {
    it('should have correct id', () => {
      expect(kyvernoApiRef.id).toBe('plugin.kyverno.api');
    });
  });

  describe('KyvernoApiClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockFetchApi = {
      fetch: jest.fn(),
    };

    let client: KyvernoApiClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://kyverno-backend');
      
      client = new KyvernoApiClient(
        mockDiscoveryApi as any,
        mockFetchApi as any,
      );
    });

    describe('getPolicyReports', () => {
      it('should fetch policy reports', async () => {
        const mockResponse = {
          items: [
            {
              metadata: { uid: 'report-1', namespace: 'default' },
              scope: { kind: 'Deployment', name: 'test-deployment' },
              summary: { error: 0, fail: 1, pass: 5, skip: 0, warn: 0 },
            },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getPolicyReports({
          entity: {
            metadata: { name: 'test-entity', namespace: 'default' },
          },
        });

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          'http://kyverno-backend/reports',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        expect(result.items).toHaveLength(1);
      });

      it('should throw error on failed response', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          statusText: 'Internal Server Error',
        });

        await expect(
          client.getPolicyReports({
            entity: {
              metadata: { name: 'test-entity', namespace: 'default' },
            },
          })
        ).rejects.toThrow('Failed to fetch from Kyverno backend');
      });
    });

    describe('getPolicy', () => {
      it('should fetch cluster policy', async () => {
        const mockPolicy = {
          apiVersion: 'kyverno.io/v1',
          kind: 'ClusterPolicy',
          metadata: { name: 'test-policy' },
          spec: { rules: [] },
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockPolicy),
        });

        const result = await client.getPolicy({
          clusterName: 'test-cluster',
          policyName: 'test-policy',
        });

        expect(mockFetchApi.fetch).toHaveBeenCalled();
        const callUrl = mockFetchApi.fetch.mock.calls[0][0];
        expect(callUrl).toContain('http://kyverno-backend/policy');
        expect(callUrl).toContain('clusterName=test-cluster');
        expect(callUrl).toContain('policyName=test-policy');
        expect(result.kind).toBe('ClusterPolicy');
      });

      it('should include namespace in request when provided', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getPolicy({
          clusterName: 'test-cluster',
          policyName: 'test-policy',
          namespace: 'default',
        });

        const callUrl = mockFetchApi.fetch.mock.calls[0][0];
        expect(callUrl).toContain('namespace=default');
      });
    });

    describe('getCrossplanePolicyReports', () => {
      it('should fetch crossplane policy reports', async () => {
        const mockResponse = {
          items: [
            {
              metadata: { uid: 'report-1' },
              scope: { kind: 'TestClaim', name: 'my-claim' },
              summary: { error: 0, fail: 0, pass: 3, skip: 0, warn: 0 },
            },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await client.getCrossplanePolicyReports({
          entity: {
            metadata: {
              name: 'test-entity',
              annotations: {
                'terasky.backstage.io/claim-name': 'my-claim',
              },
            },
          },
        });

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          'http://kyverno-backend/crossplane-reports',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        expect(result.items).toHaveLength(1);
      });
    });
  });
});
