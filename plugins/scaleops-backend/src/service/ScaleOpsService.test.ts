import { ScaleOpsService } from './ScaleOpsService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ScaleOpsService', () => {
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    scaleops: {
      baseUrl: 'http://scaleops.example.com',
      linkToDashboard: true,
      authentication: {
        enabled: true,
        user: 'test-user',
        password: 'test-password',
      },
    },
  });

  let service: ScaleOpsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScaleOpsService(mockConfig, mockLogger);

    // Setup authentication mock
    server.use(
      rest.post('http://scaleops.example.com/auth/callback', (req, res, ctx) => {
        return res(
          ctx.status(302),
          ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token-123')
        );
      }),
    );
  });

  describe('generateDashboardUrl', () => {
    it('should generate dashboard URL when linkToDashboard is enabled', () => {
      const url = service.generateDashboardUrl('test-workload', ['app=test']);
      expect(url).toContain('http://scaleops.example.com');
      expect(url).toContain('test-workload');
      expect(url).toContain('labels=');
    });

    it('should return null when linkToDashboard is disabled', () => {
      const configNoLink = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: false,
        },
      });

      const serviceNoLink = new ScaleOpsService(configNoLink, mockLogger);
      const url = serviceNoLink.generateDashboardUrl('test-workload', ['app=test']);
      expect(url).toBeNull();
    });

    it('should handle missing labels', () => {
      const url = service.generateDashboardUrl('test-workload');
      expect(url).toContain('http://scaleops.example.com');
      expect(url).toContain('test-workload');
    });
  });

  describe('getWorkloadsByLabels', () => {
    it('should fetch workloads with labels', async () => {
      server.use(
        rest.post('http://scaleops.example.com/api/v1/dashboard/rightsize/workloads', (req, res, ctx) => {
          return res(ctx.json({
            workloads: [
              {
                id: 'test-workload',
                workloadName: 'test-workload',
                namespace: 'default',
                clusterName: 'test-cluster',
              },
            ],
          }));
        }),
      );

      const result = await service.getWorkloadsByLabels(['app=test'], true, 'AND');
      expect(result.workloads).toHaveLength(1);
      expect(result.workloads[0].workloadName).toBe('test-workload');
    });

    it('should throw error when authentication fails', async () => {
      server.use(
        rest.post('http://scaleops.example.com/auth/callback', (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
        }),
      );

      await expect(
        service.getWorkloadsByLabels(['app=test'], true, 'AND')
      ).rejects.toThrow();
    });
  });

  describe('getWorkloadCostDetails', () => {
    it('should fetch cost details for workload', async () => {
      server.use(
        rest.post('http://scaleops.example.com/api/v1/workloads/cost-report/deployments', (req, res, ctx) => {
          return res(ctx.json({
            aggregatedWorkloads: [
              {
                id: 'test-workload',
                workloadName: 'test-workload',
                totalCost: 100,
                hourlyCost: 1,
              },
            ],
          }));
        }),
      );

      const result = await service.getWorkloadCostDetails(
        'test-cluster',
        'default',
        'Deployment',
        ['app=test'],
        '7d'
      );

      expect(result.aggregatedWorkloads).toBeDefined();
    });
  });

  describe('checkNetworkCostEnabled', () => {
    it('should check if network cost is enabled', async () => {
      server.use(
        rest.get('http://scaleops.example.com/api/v1/clusters/hubble/network-cost-enabled', (req, res, ctx) => {
          return res(ctx.json({
            networkCostEnabled: {
              'test-cluster': true,
            },
          }));
        }),
      );

      const result = await service.checkNetworkCostEnabled(true);
      expect(result.networkCostEnabled['test-cluster']).toBe(true);
    });
  });

  describe('getWorkloadNetworkUsage', () => {
    it('should fetch network usage for workload', async () => {
      server.use(
        rest.get('http://scaleops.example.com/api/v1/clusters/hubble/network-destination', (req, res, ctx) => {
          return res(ctx.json({
            destinations: [
              {
                Name: 'destination-workload',
                Namespace: 'default',
                WorkloadType: 'Deployment',
                totalCost: { total: 10, egress: 5, ingress: 5 },
              },
            ],
          }));
        }),
      );

      const result = await service.getWorkloadNetworkUsage(
        'test-cluster',
        'default',
        'test-workload',
        'Deployment',
        Date.now() - 86400000,
        Date.now()
      );

      expect(result.destinations).toBeDefined();
    });
  });

  describe('getPolicyByName', () => {
    it('should fetch policy by name', async () => {
      server.use(
        rest.get('http://scaleops.example.com/api/v1/policies/test-policy', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'scaleops.sh/v1',
            kind: 'Policy',
            metadata: { name: 'test-policy' },
            spec: {},
          }));
        }),
      );

      const result = await service.getPolicyByName('test-policy', 'test-cluster');
      expect(result.metadata.name).toBe('test-policy');
    });
  });

  describe('authentication caching', () => {
    it('should cache authentication token', async () => {
      let authCallCount = 0;

      server.use(
        rest.post('http://scaleops.example.com/auth/callback', (req, res, ctx) => {
          authCallCount++;
          return res(
            ctx.status(302),
            ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token-123')
          );
        }),
        rest.post('http://scaleops.example.com/api/v1/dashboard/rightsize/workloads', (req, res, ctx) => {
          return res(ctx.json({ workloads: [] }));
        }),
      );

      // Make multiple requests
      await service.getWorkloadsByLabels(['app=test1'], true, 'AND');
      await service.getWorkloadsByLabels(['app=test2'], true, 'AND');
      await service.getWorkloadsByLabels(['app=test3'], true, 'AND');

      // Authentication should only be called once due to caching
      expect(authCallCount).toBe(1);
    });
  });
});

