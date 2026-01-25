import { ScaleOpsService } from './ScaleOpsService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe('ScaleOpsService', () => {
  const mockLogger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with basic config', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: true,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      expect(service).toBeDefined();
    });

    it('should create service with authentication config', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: false,
          authentication: {
            enabled: true,
            user: 'admin',
            password: 'password',
          },
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      expect(service).toBeDefined();
    });
  });

  describe('generateDashboardUrl', () => {
    it('should generate dashboard URL when linkToDashboard is true', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: true,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload');
      
      expect(url).not.toBeNull();
      expect(url).toContain('scaleops.example.com');
      expect(url).toContain('test-workload');
      expect(url).toContain('cost-report/compute');
    });

    it('should return null when linkToDashboard is false', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: false,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload');
      
      expect(url).toBeNull();
    });

    it('should include labels in URL when provided', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: true,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload', ['app=test', 'env=prod']);
      
      expect(url).not.toBeNull();
      expect(url).toContain('labels=');
    });

    it('should return null when linkToDashboard is not set (default false)', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload');
      
      expect(url).toBeNull();
    });
  });

  describe('getWorkloadsByLabels', () => {
    const config = new ConfigReader({
      scaleops: {
        baseUrl: 'http://scaleops.example.com',
        authentication: {
          enabled: true,
          user: 'admin',
          password: 'password',
        },
      },
    });

    it('should fetch workloads by labels', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.post('http://scaleops.example.com/api/v1/dashboard/byNamespace', (_req, res, ctx) => {
          return res(ctx.json({ workloads: [{ name: 'test-workload' }] }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      const result = await service.getWorkloadsByLabels(['app=test']);
      
      expect(result).toEqual({ workloads: [{ name: 'test-workload' }] });
    });

    it('should throw error when authentication fails', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadsByLabels(['app=test'])).rejects.toThrow();
    });

    it('should throw error when API returns error', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.post('http://scaleops.example.com/api/v1/dashboard/byNamespace', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadsByLabels(['app=test'])).rejects.toThrow('ScaleOps API error');
    });
  });

  describe('getWorkloadCostDetails', () => {
    const config = new ConfigReader({
      scaleops: {
        baseUrl: 'http://scaleops.example.com',
        authentication: {
          enabled: true,
          user: 'admin',
          password: 'password',
        },
      },
    });

    it('should fetch workload cost details', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.post('http://scaleops.example.com/detailedCostReport/getWorkloads', (_req, res, ctx) => {
          return res(ctx.json({ costs: [{ amount: 100 }] }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      const result = await service.getWorkloadCostDetails('cluster1', 'default', 'Deployment', ['app=test']);
      
      expect(result).toEqual({ costs: [{ amount: 100 }] });
    });

    it('should throw error on API failure', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.post('http://scaleops.example.com/detailedCostReport/getWorkloads', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadCostDetails('cluster1', 'default', 'Deployment', ['app=test'])).rejects.toThrow();
    });
  });

  describe('checkNetworkCostEnabled', () => {
    const config = new ConfigReader({
      scaleops: {
        baseUrl: 'http://scaleops.example.com',
        authentication: {
          enabled: true,
          user: 'admin',
          password: 'password',
        },
      },
    });

    it('should check if network cost is enabled', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/networkCost/networkCostEnabled', (_req, res, ctx) => {
          return res(ctx.json({ enabled: true }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      const result = await service.checkNetworkCostEnabled();
      
      expect(result).toEqual({ enabled: true });
    });

    it('should throw error on API failure', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/networkCost/networkCostEnabled', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.checkNetworkCostEnabled()).rejects.toThrow();
    });
  });

  describe('getWorkloadNetworkUsage', () => {
    const config = new ConfigReader({
      scaleops: {
        baseUrl: 'http://scaleops.example.com',
        authentication: {
          enabled: true,
          user: 'admin',
          password: 'password',
        },
      },
    });

    it('should fetch workload network usage', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/workload-network', (_req, res, ctx) => {
          return res(ctx.json({ usage: { bytes: 1000 } }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      const result = await service.getWorkloadNetworkUsage('cluster1', 'default', 'my-app', 'Deployment', 1000, 2000);
      
      expect(result).toEqual({ usage: { bytes: 1000 } });
    });

    it('should throw error on API failure', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/workload-network', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadNetworkUsage('cluster1', 'default', 'my-app', 'Deployment', 1000, 2000)).rejects.toThrow();
    });
  });

  describe('getPolicyByName', () => {
    const config = new ConfigReader({
      scaleops: {
        baseUrl: 'http://scaleops.example.com',
        authentication: {
          enabled: true,
          user: 'admin',
          password: 'password',
        },
      },
    });

    it('should fetch policy by name', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/policies', (_req, res, ctx) => {
          return res(ctx.json({
            policies: [
              { metadata: { name: 'test-policy' }, spec: { replicas: 3 } },
              { metadata: { name: 'other-policy' }, spec: { replicas: 1 } },
            ]
          }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      const result = await service.getPolicyByName('test-policy');
      
      expect(result).toEqual({ metadata: { name: 'test-policy' }, spec: { replicas: 3 } });
    });

    it('should return null when policy not found', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/policies', (_req, res, ctx) => {
          return res(ctx.json({ policies: [] }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      const result = await service.getPolicyByName('non-existent');
      
      expect(result).toBeNull();
    });

    it('should include cluster name in header when provided', async () => {
      let capturedHeaders: any;
      
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/policies', (req, res, ctx) => {
          capturedHeaders = Object.fromEntries(req.headers.entries());
          return res(ctx.json({ policies: [] }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      await service.getPolicyByName('test-policy', 'my-cluster');
      
      expect(capturedHeaders['x-scaleops-cluster']).toBe('my-cluster');
    });

    it('should throw error on API failure', async () => {
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.get('http://scaleops.example.com/api/v1/policies', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getPolicyByName('test-policy')).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when authentication is not configured', async () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadsByLabels(['app=test'])).rejects.toThrow('ScaleOps authentication is not configured');
    });

    it('should throw error when auth response has no location header', async () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          authentication: {
            enabled: true,
            user: 'admin',
            password: 'password',
          },
        },
      });

      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(ctx.status(302)); // No Location header
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadsByLabels(['app=test'])).rejects.toThrow('No redirect location');
    });

    it('should throw error when token not found in location', async () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          authentication: {
            enabled: true,
            user: 'admin',
            password: 'password',
          },
        },
      });

      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?error=failed')
          );
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      await expect(service.getWorkloadsByLabels(['app=test'])).rejects.toThrow('Failed to extract token');
    });

    it('should use cached token on subsequent requests', async () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          authentication: {
            enabled: true,
            user: 'admin',
            password: 'password',
          },
        },
      });

      let authCallCount = 0;
      mswServer.use(
        rest.post('http://scaleops.example.com/auth/callback', (_req, res, ctx) => {
          authCallCount++;
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token')
          );
        }),
        rest.post('http://scaleops.example.com/api/v1/dashboard/byNamespace', (_req, res, ctx) => {
          return res(ctx.json({ workloads: [] }));
        }),
      );

      const service = new ScaleOpsService(config, mockLogger);
      
      // First call should authenticate
      await service.getWorkloadsByLabels(['app=test']);
      expect(authCallCount).toBe(1);
      
      // Second call should use cached token
      await service.getWorkloadsByLabels(['app=test2']);
      expect(authCallCount).toBe(1);
    });
  });
});
