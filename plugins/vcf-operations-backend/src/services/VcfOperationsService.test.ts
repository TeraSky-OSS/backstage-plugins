import { VcfOperationsService } from './VcfOperationsService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe('VcfOperationsService', () => {
  const mockLogger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with instances config', () => {
      const config = new ConfigReader({
        vcfOperations: {
          instances: [
            {
              baseUrl: 'http://vcfo.example.com',
              name: 'vcfo-1',
              majorVersion: 9,
              authentication: {
                username: 'admin',
                password: 'password',
              },
            },
          ],
        },
      });

      const service = new VcfOperationsService(config, mockLogger);
      expect(service).toBeDefined();
    });

    it('should create service with multiple instances', () => {
      const config = new ConfigReader({
        vcfOperations: {
          instances: [
            {
              baseUrl: 'http://vcfo1.example.com',
              name: 'vcfo-1',
              authentication: {
                username: 'admin1',
                password: 'password1',
              },
            },
            {
              baseUrl: 'http://vcfo2.example.com',
              name: 'vcfo-2',
              authentication: {
                username: 'admin2',
                password: 'password2',
              },
              relatedVCFAInstances: ['vcfa-1', 'vcfa-2'],
            },
          ],
        },
      });

      const service = new VcfOperationsService(config, mockLogger);
      expect(service).toBeDefined();
    });

    it('should throw error when no instances configured', () => {
      const config = new ConfigReader({
        vcfOperations: {
          instances: [],
        },
      });

      expect(() => new VcfOperationsService(config, mockLogger)).toThrow('No VCF Operations instances configured');
    });
  });

  describe('authentication', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should authenticate successfully', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu|usage_average']);
      
      expect(result).toEqual({ values: [] });
    });
  });

  describe('getResourceMetrics', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should fetch resource metrics', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({
            values: [
              {
                resourceId: 'res-123',
                stat: {
                  statKey: { key: 'cpu|usage_average' },
                  timestamps: [1000, 2000, 3000],
                  data: [10, 20, 30],
                },
              },
            ],
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu|usage_average']);
      
      expect(result.values).toBeDefined();
    });

    it('should handle metrics with time range', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (req, res, ctx) => {
          const begin = req.url.searchParams.get('begin');
          const end = req.url.searchParams.get('end');
          expect(begin).toBeTruthy();
          expect(end).toBeTruthy();
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const now = Date.now();
      const result = await service.getResourceMetrics(
        'res-123',
        ['cpu|usage_average'],
        now - 3600000, // 1 hour ago
        now,
        'AVERAGE',
      );
      
      expect(result).toEqual({ values: [] });
    });

    it('should use different interval for week-long ranges', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (req, res, ctx) => {
          const intervalType = req.url.searchParams.get('intervalType');
          expect(intervalType).toBe('HOURS');
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const now = Date.now();
      const result = await service.getResourceMetrics(
        'res-123',
        ['cpu|usage_average'],
        now - (72 * 3600000), // 72 hours ago
        now,
      );
      
      expect(result).toEqual({ values: [] });
    });
  });

  describe('multi-instance support', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo1.example.com',
            name: 'vcfo-1',
            authentication: {
              username: 'admin1',
              password: 'password1',
            },
          },
          {
            baseUrl: 'http://vcfo2.example.com',
            name: 'vcfo-2',
            authentication: {
              username: 'admin2',
              password: 'password2',
            },
          },
        ],
      },
    });

    it('should use default instance when no instance name provided', async () => {
      mswServer.use(
        rest.post('http://vcfo1.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'token1' }));
        }),
        rest.get('http://vcfo1.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({ values: [], instance: 'vcfo-1' }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu']);
      
      expect(result.values).toBeDefined();
    });

    it('should use specified instance when instance name provided', async () => {
      mswServer.use(
        rest.post('http://vcfo2.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'token2' }));
        }),
        rest.get('http://vcfo2.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({ values: [], instance: 'vcfo-2' }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu'], undefined, undefined, undefined, 'vcfo-2');
      
      expect(result.values).toBeDefined();
    });

    it('should throw error when specified instance not found', async () => {
      const service = new VcfOperationsService(config, mockLogger);
      
      await expect(
        service.getResourceMetrics('res-123', ['cpu'], undefined, undefined, undefined, 'non-existent')
      ).rejects.toThrow("VCF Operations instance 'non-existent' not found");
    });
  });

  describe('queryResourceMetrics', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should query resource metrics', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/stats/query', (_req, res, ctx) => {
          return res(ctx.json({
            values: [
              {
                resourceId: 'res-123',
                stat: { statKey: { key: 'cpu' }, timestamps: [1000], data: [50] },
              },
            ],
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.queryResourceMetrics({
        resourceIds: ['res-123'],
        statKeys: ['cpu|usage_average'],
      });
      
      expect(result.values).toBeDefined();
    });
  });

  describe('getLatestResourceMetrics', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should fetch latest resource metrics', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats/latest', (_req, res, ctx) => {
          return res(ctx.json({
            values: [
              {
                resourceId: 'res-123',
                stat: { statKey: { key: 'cpu' }, timestamps: [Date.now()], data: [75] },
              },
            ],
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getLatestResourceMetrics(['res-123'], ['cpu|usage_average']);
      
      expect(result.values).toBeDefined();
    });
  });

  describe('getResourceDetails', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should fetch resource details', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/res-123', (_req, res, ctx) => {
          return res(ctx.json({
            identifier: 'res-123',
            resourceKey: { name: 'test-vm' },
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceDetails('res-123');
      
      expect(result).toEqual({
        identifier: 'res-123',
        resourceKey: { name: 'test-vm' },
      });
    });
  });

  describe('getAvailableMetrics', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should fetch available metrics for resource', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/res-123/statkeys', (_req, res, ctx) => {
          return res(ctx.json({
            'stat-key': [
              { key: 'cpu|usage_average' },
              { key: 'mem|usage_average' },
            ],
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getAvailableMetrics('res-123');
      
      expect(result['stat-key']).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should throw error on request failure', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      
      await expect(service.getResourceMetrics('res-123', ['cpu'])).rejects.toThrow();
    });
  });

  describe('time range intervals', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should use 5-minute intervals for short time ranges', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (req, res, ctx) => {
          expect(req.url.searchParams.get('intervalQuantifier')).toBe('5');
          expect(req.url.searchParams.get('intervalType')).toBe('MINUTES');
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const now = Date.now();
      await service.getResourceMetrics('res-123', ['cpu'], now - 3600000, now); // 1 hour
    });

    it('should use 15-minute intervals for day time ranges', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (req, res, ctx) => {
          expect(req.url.searchParams.get('intervalQuantifier')).toBe('15');
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const now = Date.now();
      await service.getResourceMetrics('res-123', ['cpu'], now - (12 * 3600000), now); // 12 hours
    });

    it('should use day intervals for long time ranges', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (req, res, ctx) => {
          expect(req.url.searchParams.get('intervalType')).toBe('DAYS');
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const now = Date.now();
      await service.getResourceMetrics('res-123', ['cpu'], now - (200 * 24 * 3600000), now); // 200 days
    });
  });

  describe('transformMetricsResponse', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should transform metrics response with stat-list format', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({
            values: [
              {
                resourceId: 'res-123',
                'stat-list': {
                  stat: [
                    {
                      statKey: { key: 'cpu|usage_average' },
                      timestamps: [1000, 2000, 3000],
                      data: [10, 20, 30],
                    },
                    {
                      statKey: { key: 'mem|usage_average' },
                      timestamps: [1000, 2000, 3000],
                      data: [40, 50, 60],
                    },
                  ],
                },
              },
            ],
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu|usage_average', 'mem|usage_average']);
      
      expect(result.values.length).toBe(2);
      expect(result.values[0].stat.statKey.key).toBe('cpu|usage_average');
      expect(result.values[1].stat.statKey.key).toBe('mem|usage_average');
    });

    it('should handle empty values array', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu']);
      
      expect(result.values).toEqual([]);
    });

    it('should handle missing stat-list in response', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({
            values: [
              {
                resourceId: 'res-123',
                // No stat-list
              },
            ],
          }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getResourceMetrics('res-123', ['cpu']);
      
      expect(result.values).toEqual([]);
    });
  });

  describe('token caching', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should reuse cached token', async () => {
      let authCallCount = 0;
      
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          authCallCount++;
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.json({ values: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      
      // First call should authenticate
      await service.getResourceMetrics('res-123', ['cpu']);
      expect(authCallCount).toBe(1);
      
      // Second call should use cached token
      await service.getResourceMetrics('res-456', ['memory']);
      expect(authCallCount).toBe(1);
    });
  });

  describe('searchResources', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should search resources by name', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources', (req, res, ctx) => {
          expect(req.url.searchParams.get('name')).toBe('test-vm');
          return res(ctx.json({ resourceList: [{ identifier: 'res-1' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.searchResources('test-vm');
      
      expect(result.resourceList).toHaveLength(1);
    });

    it('should search resources by adapter and resource kind', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources', (req, res, ctx) => {
          expect(req.url.searchParams.get('adapterKind')).toBe('VMWARE');
          expect(req.url.searchParams.get('resourceKind')).toBe('VirtualMachine');
          return res(ctx.json({ resourceList: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      await service.searchResources(undefined, 'VMWARE', 'VirtualMachine');
    });

    it('should search resources without filters', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.searchResources();
      
      expect(result).toBeDefined();
    });
  });

  describe('queryResources', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should query resources with property conditions', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'res-1' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.queryResources({
        propertyConditions: {
          conjunctionOperator: 'AND',
          conditions: [{ key: 'prop1', operator: 'EQ', stringValue: 'value1' }],
        },
      });
      
      expect(result.resourceList).toHaveLength(1);
    });
  });

  describe('queryProjectResources', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should query project resources', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'project-1' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.queryProjectResources({
        name: ['test-project'],
        adapterKind: ['VCFAutomation'],
        resourceKind: ['ProjectAssignment'],
      });
      
      expect(result.resourceList).toHaveLength(1);
    });
  });

  describe('queryClusterResources', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should query cluster resources', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'cluster-1' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.queryClusterResources({
        name: ['test-cluster'],
        adapterKind: ['VMWARE'],
        resourceKind: ['ResourcePool'],
      });
      
      expect(result.resourceList).toHaveLength(1);
    });
  });

  describe('findResourceByProperty', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should find resource by property', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'found-resource' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByProperty('customProp', 'customValue');
      
      expect(result).not.toBeNull();
      expect(result?.identifier).toBe('found-resource');
    });

    it('should return null when resource not found', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByProperty('prop', 'nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('findResourceByName', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should find project resource by name', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'project-res' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-project', undefined, 'project');
      
      expect(result).not.toBeNull();
      expect(result?.identifier).toBe('project-res');
    });

    it('should find VM resource by name', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'vm-res' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-vm', undefined, 'vm');
      
      expect(result).not.toBeNull();
    });

    it('should find cluster resource by name', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'cluster-res' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-cluster', undefined, 'cluster');
      
      expect(result).not.toBeNull();
    });

    it('should find supervisor-namespace resource by name', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'namespace-res' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-namespace', undefined, 'supervisor-namespace');
      
      expect(result).not.toBeNull();
    });

    it('should find general resource by name when no type specified', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.json({ resourceList: [{ identifier: 'general-res' }] }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-resource');
      
      expect(result).not.toBeNull();
    });
  });

  describe('error scenarios', () => {
    const config = new ConfigReader({
      vcfOperations: {
        instances: [
          {
            baseUrl: 'http://vcfo.example.com',
            name: 'vcfo',
            authentication: {
              username: 'admin',
              password: 'password',
            },
          },
        ],
      },
    });

    it('should return empty stat-key array on getAvailableMetrics failure', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/res-123/statkeys', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.getAvailableMetrics('res-123');
      
      expect(result).toEqual({ 'stat-key': [] });
    });

    it('should return null on project search failure', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-project', undefined, 'project');
      
      expect(result).toBeNull();
    });

    it('should return null on VM search failure', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-vm', undefined, 'vm');
      
      expect(result).toBeNull();
    });

    it('should return null on cluster search failure', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.post('http://vcfo.example.com/suite-api/api/resources/query', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      const result = await service.findResourceByName('my-cluster', undefined, 'cluster');
      
      expect(result).toBeNull();
    });
  });
});
