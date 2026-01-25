import { VcfAutomationService } from './VcfAutomationService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe('VcfAutomationService', () => {
  const mockLogger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with single instance config', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'http://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'test-domain',
          },
        },
      });

      const service = new VcfAutomationService(config, mockLogger);
      expect(service).toBeDefined();
    });

    it('should create service with multiple instances config', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          instances: [
            {
              baseUrl: 'http://vcf1.example.com',
              name: 'vcf1',
              majorVersion: 8,
              authentication: {
                username: 'admin1',
                password: 'password1',
                domain: 'domain1',
              },
            },
            {
              baseUrl: 'http://vcf2.example.com',
              name: 'vcf2',
              majorVersion: 9,
              authentication: {
                username: 'admin2',
                password: 'password2',
                domain: 'domain2',
              },
              orgName: 'test-org',
              organizationType: 'all-apps',
            },
          ],
        },
      });

      const service = new VcfAutomationService(config, mockLogger);
      expect(service).toBeDefined();
    });

    it('should throw error when no instances configured', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          instances: [],
        },
      });

      expect(() => new VcfAutomationService(config, mockLogger)).toThrow('Invalid configuration');
    });
  });

  describe('authentication version 8', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should authenticate successfully with version 8', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token-v8' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeployments();
      
      expect(result).toEqual({ content: [] });
    });
  });

  describe('getDeploymentHistory', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch deployment history', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/requests', (_req, res, ctx) => {
          return res(ctx.json({ requests: [{ id: 'req-1' }] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentHistory('dep-123');
      
      expect(result).toEqual({ requests: [{ id: 'req-1' }] });
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/requests', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentHistory('dep-123');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('getDeploymentDetails', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch deployment details', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123', (_req, res, ctx) => {
          return res(ctx.json({ id: 'dep-123', name: 'test-deployment' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentDetails('dep-123');
      
      expect(result).toEqual({ id: 'dep-123', name: 'test-deployment' });
    });
  });

  describe('getDeploymentEvents', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch deployment events', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/userEvents', (_req, res, ctx) => {
          return res(ctx.json({ events: [{ id: 'evt-1' }] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentEvents('dep-123');
      
      expect(result).toEqual({ events: [{ id: 'evt-1' }] });
    });
  });

  describe('getResourceDetails', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch resource details', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/resources/res-456', (_req, res, ctx) => {
          return res(ctx.json({ id: 'res-456', type: 'VM' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getResourceDetails('dep-123', 'res-456');
      
      expect(result).toEqual({ id: 'res-456', type: 'VM' });
    });
  });

  describe('getProjectDetails', () => {
    it('should fetch project details for vm-apps organization type', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'http://vcf.example.com',
          majorVersion: 8,
          organizationType: 'vm-apps',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'test-domain',
          },
        },
      });

      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/iaas/api/projects/proj-123', (_req, res, ctx) => {
          return res(ctx.json({ id: 'proj-123', name: 'test-project' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getProjectDetails('proj-123');
      
      expect(result).toEqual({ id: 'proj-123', name: 'test-project' });
    });

    it('should fetch project details for all-apps organization type', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'http://vcf.example.com',
          majorVersion: 8,
          organizationType: 'all-apps',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'test-domain',
          },
        },
      });

      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/project-service/api/projects/proj-123', (_req, res, ctx) => {
          return res(ctx.json({ id: 'proj-123', name: 'test-project' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getProjectDetails('proj-123');
      
      expect(result).toEqual({ id: 'proj-123', name: 'test-project' });
    });
  });

  describe('getProjects', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch projects list', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/iaas/api/projects', (_req, res, ctx) => {
          return res(ctx.json({ content: [{ id: 'proj-1' }, { id: 'proj-2' }] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getProjects();
      
      expect(result).toEqual({ content: [{ id: 'proj-1' }, { id: 'proj-2' }] });
    });
  });

  describe('getDeploymentResources', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch deployment resources', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/resources', (_req, res, ctx) => {
          return res(ctx.json({ content: [{ id: 'res-1' }] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentResources('dep-123');
      
      expect(result).toEqual({ content: [{ id: 'res-1' }] });
    });
  });

  describe('getSupervisorResources', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch supervisor resources', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/supervisor-resources', (_req, res, ctx) => {
          return res(ctx.json({ content: [{ id: 'sup-res-1' }] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResources();
      
      expect(result).toEqual({ content: [{ id: 'sup-res-1' }] });
    });
  });

  describe('getSupervisorResource', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch single supervisor resource', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/supervisor-resources/sup-res-1', (_req, res, ctx) => {
          return res(ctx.json({ id: 'sup-res-1', name: 'supervisor-resource' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResource('sup-res-1');
      
      expect(result).toEqual({ id: 'sup-res-1', name: 'supervisor-resource' });
    });
  });

  describe('getSupervisorNamespaces', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch supervisor namespaces', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces', (_req, res, ctx) => {
          return res(ctx.json({ items: [{ metadata: { name: 'ns-1' } }] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorNamespaces();
      
      expect(result).toEqual({ items: [{ metadata: { name: 'ns-1' } }] });
    });
  });

  describe('getSupervisorNamespace', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf.example.com',
        majorVersion: 8,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
      },
    });

    it('should fetch single supervisor namespace', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces/ns-1', (_req, res, ctx) => {
          return res(ctx.json({ metadata: { name: 'ns-1' }, spec: {} }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorNamespace('ns-1');
      
      expect(result).toEqual({ metadata: { name: 'ns-1' }, spec: {} });
    });
  });

  describe('multi-instance support', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        instances: [
          {
            baseUrl: 'http://vcf1.example.com',
            name: 'vcf1',
            majorVersion: 8,
            authentication: {
              username: 'admin1',
              password: 'password1',
              domain: 'domain1',
            },
          },
          {
            baseUrl: 'http://vcf2.example.com',
            name: 'vcf2',
            majorVersion: 8,
            authentication: {
              username: 'admin2',
              password: 'password2',
              domain: 'domain2',
            },
          },
        ],
      },
    });

    it('should use default instance when no instance name provided', async () => {
      mswServer.use(
        rest.post('http://vcf1.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'token1' }));
        }),
        rest.get('http://vcf1.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [], instance: 'vcf1' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeployments();
      
      expect(result).toEqual({ content: [], instance: 'vcf1' });
    });

    it('should use specified instance when instance name provided', async () => {
      mswServer.use(
        rest.post('http://vcf2.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'token2' }));
        }),
        rest.get('http://vcf2.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [], instance: 'vcf2' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeployments('vcf2');
      
      expect(result).toEqual({ content: [], instance: 'vcf2' });
    });

    it('should fall back to default instance when specified instance not found', async () => {
      mswServer.use(
        rest.post('http://vcf1.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'token1' }));
        }),
        rest.get('http://vcf1.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [], instance: 'vcf1' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeployments('non-existent-instance');
      
      expect(result).toEqual({ content: [], instance: 'vcf1' });
    });
  });
});
