import { VcfAutomationEntityProvider } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('VcfAutomationEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();
  const mockScheduler = {
    scheduleTask: jest.fn().mockResolvedValue(undefined),
    createScheduledTaskRunner: jest.fn().mockReturnValue({
      run: jest.fn(),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with single instance config', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'test-domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('vcf-automation');
    });

    it('should create provider with multiple instances config', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          instances: [
            {
              baseUrl: 'https://vcf1.example.com',
              name: 'vcf-1',
              majorVersion: 8,
              authentication: {
                username: 'admin1',
                password: 'password1',
                domain: 'domain1',
              },
            },
            {
              baseUrl: 'https://vcf2.example.com',
              name: 'vcf-2',
              majorVersion: 9,
              authentication: {
                username: 'admin2',
                password: 'password2',
                domain: 'domain2',
              },
              organizationType: 'all-apps',
            },
          ],
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('2 instance(s)')
      );
    });

    it('should throw error when no instances configured', () => {
      const config = new ConfigReader({
        vcfAutomation: {},
      });

      expect(() => {
        new VcfAutomationEntityProvider(
          config,
          mockScheduler as any,
          mockLogger,
        );
      }).toThrow('No VCF Automation instances configured');
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider.getProviderName()).toBe('vcf-automation');
    });
  });

  describe('connect', () => {
    it('should schedule refresh task and trigger initial refresh', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      // Setup MSW handlers for authentication and fetching
      server.use(
        rest.post('https://vcf.example.com/csp/gateway/am/api/login', (req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('https://vcf.example.com/deployment/api/deployments', (req, res, ctx) => {
          return res(ctx.json({ content: [], totalPages: 0, number: 0 }));
        }),
      );

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockScheduler.scheduleTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'refresh_vcf_automation_entities',
        })
      );
    });
  });

  describe('authentication', () => {
    it('should authenticate with version 8 API', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      server.use(
        rest.post('https://vcf.example.com/csp/gateway/am/api/login', (req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'v8-token' }));
        }),
        rest.get('https://vcf.example.com/deployment/api/deployments', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toBe('Bearer v8-token');
          return res(ctx.json({ content: [], totalPages: 0, number: 0 }));
        }),
      );

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
    });

    it('should authenticate with version 9+ API', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          majorVersion: 9,
          orgName: 'test-org',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      server.use(
        rest.post('https://vcf.example.com/cloudapi/1.0.0/sessions', (req, res, ctx) => {
          return res(
            ctx.set('x-vmware-vcloud-access-token', 'v9-token'),
            ctx.json({})
          );
        }),
        rest.get('https://vcf.example.com/deployment/api/deployments', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toBe('Bearer v9-token');
          return res(ctx.json({ content: [], totalPages: 0, number: 0 }));
        }),
      );

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
    });
  });

  describe('entity transformation', () => {
    it('should transform deployments into entities', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const mockDeployments = {
        content: [
          {
            id: 'deployment-1',
            name: 'Test Deployment',
            ownedBy: 'admin@example.com',
            ownerType: 'USER',
            project: { id: 'project-1', name: 'Test Project' },
            resources: [
              {
                id: 'vm-1',
                name: 'test-vm',
                type: 'Cloud.vSphere.Machine',
                properties: {},
                createdAt: '2024-01-01T00:00:00Z',
                origin: 'DISCOVERED',
                syncStatus: 'SUCCESS',
                state: 'OK',
              },
            ],
            status: 'CREATE_SUCCESSFUL',
            expense: { totalExpense: 100, computeExpense: 50, storageExpense: 30, additionalExpense: 20, unit: 'USD', lastUpdatedTime: '2024-01-01T00:00:00Z' },
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'admin',
            lastUpdatedAt: '2024-01-01T00:00:00Z',
            lastUpdatedBy: 'admin',
            lastRequest: { id: 'req-1', name: 'Create', requestedBy: 'admin', actionId: 'action-1', deploymentId: 'deployment-1', resourceIds: [], status: 'SUCCESSFUL', details: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', totalTasks: 1, completedTasks: 1 },
          },
        ],
        totalPages: 1,
        number: 0,
      };

      server.use(
        rest.post('https://vcf.example.com/csp/gateway/am/api/login', (req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('https://vcf.example.com/deployment/api/deployments', (req, res, ctx) => {
          return res(ctx.json(mockDeployments));
        }),
        rest.get('https://vcf.example.com/deployment/api/resources/vm-1', (req, res, ctx) => {
          return res(ctx.json({ properties: { moref: 'vm-123' } }));
        }),
      );

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockConnection.applyMutation).toHaveBeenCalled();
      const mutationCall = mockConnection.applyMutation.mock.calls[0][0];
      expect(mutationCall.type).toBe('full');
      expect(mutationCall.entities.length).toBeGreaterThan(0);
    });
  });
});

