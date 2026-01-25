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

    it('should handle authentication failure', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      
      await expect(service.getResourceMetrics('res-123', ['cpu|usage_average'])).rejects.toThrow('Failed to authenticate');
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

    it('should handle API errors', async () => {
      mswServer.use(
        rest.post('http://vcfo.example.com/suite-api/api/auth/token/acquire', (_req, res, ctx) => {
          return res(ctx.json({ token: 'test-token' }));
        }),
        rest.get('http://vcfo.example.com/suite-api/api/resources/stats', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        }),
      );

      const service = new VcfOperationsService(config, mockLogger);
      
      await expect(service.getResourceMetrics('res-123', ['cpu|usage_average'])).rejects.toThrow();
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
});

