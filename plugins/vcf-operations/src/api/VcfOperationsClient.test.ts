import { VcfOperationsClient, VcfOperationsApiError, vcfOperationsApiRef } from './VcfOperationsClient';

describe('VcfOperationsApi', () => {
  describe('vcfOperationsApiRef', () => {
    it('should have correct id', () => {
      expect(vcfOperationsApiRef.id).toBe('plugin.vcf-operations.service');
    });
  });

  describe('VcfOperationsApiError', () => {
    it('should create error with all properties', () => {
      const error = new VcfOperationsApiError(
        'Test error',
        500,
        'Internal Server Error',
        { detail: 'Some detail' }
      );

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.details).toEqual({ detail: 'Some detail' });
      expect(error.name).toBe('VcfOperationsApiError');
    });
  });

  describe('VcfOperationsClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockFetchApi = {
      fetch: jest.fn(),
    };

    let client: VcfOperationsClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://vcf-operations-backend');

      client = new VcfOperationsClient({
        discoveryApi: mockDiscoveryApi as any,
        fetchApi: mockFetchApi as any,
      });
    });

    describe('getInstances', () => {
      it('should fetch instances', async () => {
        const mockInstances = [
          { name: 'instance-1', relatedVCFAInstances: ['vcfa-1'] },
          { name: 'instance-2' },
        ];

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockInstances),
        });

        const result = await client.getInstances();

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          'http://vcf-operations-backend/instances'
        );
        expect(result).toHaveLength(2);
      });

      it('should throw VcfOperationsApiError on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Backend error', details: {} }),
        });

        await expect(client.getInstances()).rejects.toThrow(VcfOperationsApiError);
      });
    });

    describe('getResourceMetrics', () => {
      it('should fetch resource metrics', async () => {
        const mockMetrics = {
          values: [
            {
              resourceId: 'resource-1',
              stat: { statKey: { key: 'cpu' }, timestamps: [1], data: [50] },
            },
          ],
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockMetrics),
        });

        const result = await client.getResourceMetrics(
          'resource-1',
          ['cpu', 'memory']
        );

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://vcf-operations-backend/resources/resource-1/metrics')
        );
        expect(result.values).toHaveLength(1);
      });

      it('should include optional parameters', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ values: [] }),
        });

        await client.getResourceMetrics(
          'resource-1',
          ['cpu'],
          1000,
          2000,
          'AVG',
          'test-instance'
        );

        const callUrl = mockFetchApi.fetch.mock.calls[0][0];
        expect(callUrl).toContain('begin=1000');
        expect(callUrl).toContain('end=2000');
        expect(callUrl).toContain('rollUpType=AVG');
        expect(callUrl).toContain('instance=test-instance');
      });
    });

    describe('queryResourceMetrics', () => {
      it('should query metrics with request body', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ values: [] }),
        });

        const queryRequest = {
          resourceIds: ['r1', 'r2'],
          statKeys: ['cpu'],
        };

        await client.queryResourceMetrics(queryRequest, 'test-instance');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryRequest),
          })
        );
      });
    });

    describe('getLatestResourceMetrics', () => {
      it('should fetch latest metrics for multiple resources', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ values: [] }),
        });

        await client.getLatestResourceMetrics(
          ['r1', 'r2'],
          ['cpu', 'memory'],
          'test-instance'
        );

        const callUrl = mockFetchApi.fetch.mock.calls[0][0];
        expect(callUrl).toContain('resourceIds=r1');
        expect(callUrl).toContain('resourceIds=r2');
        expect(callUrl).toContain('statKeys=cpu');
        expect(callUrl).toContain('statKeys=memory');
      });
    });

    describe('getResourceDetails', () => {
      it('should fetch resource details', async () => {
        const mockResource = { identifier: 'r1', resourceKey: {} };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResource),
        });

        const result = await client.getResourceDetails('r1');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          'http://vcf-operations-backend/resources/r1?'
        );
        expect(result.identifier).toBe('r1');
      });
    });

    describe('searchResources', () => {
      it('should search resources with filters', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ resourceList: [] }),
        });

        await client.searchResources('vm-name', 'VMWARE', 'VirtualMachine', 'test-instance');

        const callUrl = mockFetchApi.fetch.mock.calls[0][0];
        expect(callUrl).toContain('name=vm-name');
        expect(callUrl).toContain('adapterKind=VMWARE');
        expect(callUrl).toContain('resourceKind=VirtualMachine');
        expect(callUrl).toContain('instance=test-instance');
      });
    });

    describe('queryResources', () => {
      it('should query resources with property conditions', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ resourceList: [] }),
        });

        const queryRequest = {
          propertyConditions: {
            conjunctionOperator: 'AND' as const,
            conditions: [
              { key: 'status', operator: 'EQ' as const, stringValue: 'active' },
            ],
          },
        };

        await client.queryResources(queryRequest);

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/resources/query'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(queryRequest),
          })
        );
      });
    });

    describe('findResourceByProperty', () => {
      it('should find resource by property', async () => {
        const mockResource = { identifier: 'r1' };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResource),
        });

        const result = await client.findResourceByProperty('moref', 'vm-123');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('propertyKey=moref')
        );
        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('propertyValue=vm-123')
        );
        expect(result?.identifier).toBe('r1');
      });

      it('should throw VcfOperationsApiError on failure', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({ error: 'Resource not found' }),
        });

        await expect(
          client.findResourceByProperty('moref', 'not-found')
        ).rejects.toThrow(VcfOperationsApiError);
      });
    });

    describe('findResourceByName', () => {
      it('should find resource by name', async () => {
        const mockResource = { identifier: 'r1' };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResource),
        });

        const result = await client.findResourceByName('my-vm', 'test-instance', 'VirtualMachine');

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('resourceName=my-vm')
        );
        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance')
        );
        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('resourceType=VirtualMachine')
        );
        expect(result?.identifier).toBe('r1');
      });
    });
  });
});

