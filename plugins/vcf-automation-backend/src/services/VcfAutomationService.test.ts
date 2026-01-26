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

  describe('authentication version 9', () => {
    const config = new ConfigReader({
      vcfAutomation: {
        baseUrl: 'http://vcf9.example.com',
        majorVersion: 9,
        authentication: {
          username: 'admin',
          password: 'password',
          domain: 'test-domain',
        },
        orgName: 'test-org',
      },
    });

    it('should authenticate successfully with version 9', async () => {
      mswServer.use(
        rest.post('http://vcf9.example.com/cloudapi/1.0.0/sessions', (_req, res, ctx) => {
          return res(
            ctx.set('x-vmware-vcloud-access-token', 'test-token-v9'),
            ctx.json({ token: 'test-token-v9' })
          );
        }),
        rest.get('http://vcf9.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeployments();
      
      expect(result).toEqual({ content: [] });
    });

    it('should use orgName in username for version 9 auth', async () => {
      mswServer.use(
        rest.post('http://vcf9.example.com/cloudapi/1.0.0/sessions', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          expect(authHeader).toContain('Basic');
          return res(
            ctx.set('x-vmware-vcloud-access-token', 'test-token-v9'),
            ctx.json({ token: 'test-token-v9' })
          );
        }),
        rest.get('http://vcf9.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      await service.getDeployments();
    });
  });

  describe('checkVmPowerAction', () => {
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

    it('should check PowerOn action', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/resources/res-123/actions/CCI.Supervisor.Resource.VirtualMachine.PowerOn', (_req, res, ctx) => {
          return res(ctx.json({ actionAvailable: true }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.checkVmPowerAction('res-123', 'PowerOn');
      
      expect(result).toEqual({ actionAvailable: true });
    });

    it('should check PowerOff action', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/resources/res-123/actions/CCI.Supervisor.Resource.VirtualMachine.PowerOff', (_req, res, ctx) => {
          return res(ctx.json({ actionAvailable: true }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.checkVmPowerAction('res-123', 'PowerOff');
      
      expect(result).toEqual({ actionAvailable: true });
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/resources/res-123/actions/CCI.Supervisor.Resource.VirtualMachine.PowerOn', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.checkVmPowerAction('res-123', 'PowerOn');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('executeVmPowerAction', () => {
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

    it('should execute PowerOn action', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.post('http://vcf.example.com/deployment/api/resources/res-123/requests', (_req, res, ctx) => {
          return res(ctx.json({ requestId: 'req-1', status: 'PENDING' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.executeVmPowerAction('res-123', 'PowerOn');
      
      expect(result).toEqual({ requestId: 'req-1', status: 'PENDING' });
    });

    it('should execute PowerOff action', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.post('http://vcf.example.com/deployment/api/resources/res-123/requests', (_req, res, ctx) => {
          return res(ctx.json({ requestId: 'req-2', status: 'PENDING' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.executeVmPowerAction('res-123', 'PowerOff');
      
      expect(result).toEqual({ requestId: 'req-2', status: 'PENDING' });
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.post('http://vcf.example.com/deployment/api/resources/res-123/requests', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.executeVmPowerAction('res-123', 'PowerOn');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('getStandaloneVmStatus', () => {
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

    it('should fetch standalone VM status', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn-123/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.json({ 
            metadata: { name: 'test-vm' }, 
            spec: { powerState: 'PoweredOn' },
            status: { powerState: 'PoweredOn' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getStandaloneVmStatus('ns-urn-123', 'test-ns', 'test-vm');
      
      expect(result).toHaveProperty('metadata.name', 'test-vm');
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn-123/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getStandaloneVmStatus('ns-urn-123', 'test-ns', 'test-vm');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('executeStandaloneVmPowerAction', () => {
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

    it('should execute standalone VM PoweredOn action', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.put('http://vcf.example.com/proxy/k8s/namespaces/ns-urn-123/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.json({ 
            metadata: { name: 'test-vm' }, 
            spec: { powerState: 'PoweredOn' }
          }));
        }),
      );

      const vmData = { metadata: { name: 'test-vm' }, spec: { powerState: 'PoweredOff' } };
      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.executeStandaloneVmPowerAction('ns-urn-123', 'test-ns', 'test-vm', 'PoweredOn', vmData);
      
      expect(result).toHaveProperty('spec.powerState', 'PoweredOn');
    });

    it('should execute standalone VM PoweredOff action', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.put('http://vcf.example.com/proxy/k8s/namespaces/ns-urn-123/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.json({ 
            metadata: { name: 'test-vm' }, 
            spec: { powerState: 'PoweredOff' }
          }));
        }),
      );

      const vmData = { metadata: { name: 'test-vm' }, spec: { powerState: 'PoweredOn' } };
      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.executeStandaloneVmPowerAction('ns-urn-123', 'test-ns', 'test-vm', 'PoweredOff', vmData);
      
      expect(result).toHaveProperty('spec.powerState', 'PoweredOff');
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.put('http://vcf.example.com/proxy/k8s/namespaces/ns-urn-123/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const vmData = { metadata: { name: 'test-vm' }, spec: { powerState: 'PoweredOff' } };
      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.executeStandaloneVmPowerAction('ns-urn-123', 'test-ns', 'test-vm', 'PoweredOn', vmData);
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('getSupervisorResourceManifest', () => {
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

    it('should fetch supervisor resource manifest with group API version', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'vmoperator.vmware.com/v1alpha3',
            kind: 'VirtualMachine',
            metadata: { name: 'test-vm' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-vm', 'vmoperator.vmware.com/v1alpha3', 'VirtualMachine');
      
      expect(result).toHaveProperty('kind', 'VirtualMachine');
    });

    it('should fetch supervisor resource manifest with core API version', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/api/v1/namespaces/test-ns/pods/test-pod', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: { name: 'test-pod' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-pod', 'v1', 'Pod');
      
      expect(result).toHaveProperty('kind', 'Pod');
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-vm', 'vmoperator.vmware.com/v1alpha3', 'VirtualMachine');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('updateSupervisorResourceManifest', () => {
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

    it('should update supervisor resource manifest', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.put('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'vmoperator.vmware.com/v1alpha3',
            kind: 'VirtualMachine',
            metadata: { name: 'test-vm' },
            spec: { replicas: 2 }
          }));
        }),
      );

      const manifest = { 
        apiVersion: 'vmoperator.vmware.com/v1alpha3',
        kind: 'VirtualMachine',
        metadata: { name: 'test-vm' },
        spec: { replicas: 2 }
      };
      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.updateSupervisorResourceManifest('ns-urn', 'test-ns', 'test-vm', 'vmoperator.vmware.com/v1alpha3', 'VirtualMachine', manifest);
      
      expect(result).toHaveProperty('spec.replicas', 2);
    });

    it('should update core API resources', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.put('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/api/v1/namespaces/test-ns/configmaps/test-cm', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: 'test-cm' },
            data: { key: 'value' }
          }));
        }),
      );

      const manifest = { 
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'test-cm' },
        data: { key: 'value' }
      };
      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.updateSupervisorResourceManifest('ns-urn', 'test-ns', 'test-cm', 'v1', 'ConfigMap', manifest);
      
      expect(result).toHaveProperty('data.key', 'value');
    });

    it('should return error on failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.put('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/vmoperator.vmware.com/v1alpha3/namespaces/test-ns/virtualmachines/test-vm', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const manifest = { metadata: { name: 'test-vm' } };
      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.updateSupervisorResourceManifest('ns-urn', 'test-ns', 'test-vm', 'vmoperator.vmware.com/v1alpha3', 'VirtualMachine', manifest);
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('error handling for various methods', () => {
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

    it('should return error on getDeploymentDetails failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentDetails('dep-123');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getDeploymentEvents failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/userEvents', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentEvents('dep-123');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getResourceDetails failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/resources/res-456', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getResourceDetails('dep-123', 'res-456');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getProjectDetails failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/iaas/api/projects/proj-123', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getProjectDetails('proj-123');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getProjects failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/iaas/api/projects', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getProjects();
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getDeployments failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeployments();
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getDeploymentResources failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments/dep-123/resources', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getDeploymentResources('dep-123');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getSupervisorResources failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/supervisor-resources', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResources();
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getSupervisorResource failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/supervisor-resources/res-123', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResource('res-123');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getSupervisorNamespaces failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorNamespaces();
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });

    it('should return error on getSupervisorNamespace failure', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces/ns-1', (_req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorNamespace('ns-1');
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    });
  });

  describe('authentication version 9 errors', () => {
    it('should handle missing access token in version 9 auth', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'http://vcf9.example.com',
          majorVersion: 9,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'test-domain',
          },
        },
      });

      mswServer.use(
        rest.post('http://vcf9.example.com/cloudapi/1.0.0/sessions', (_req, res, ctx) => {
          // Return success but without the access token header
          return res(ctx.json({ token: 'ignored' }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      // Should eventually fail after retries - we expect an error
      const result = await service.getDeployments();
      
      expect(result).toEqual({ error: 'Service temporarily unavailable', status: 'error' });
    }, 15000);
  });

  describe('kindToResourceType helper', () => {
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

    it('should handle unknown kind with fallback pluralization', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/custom.io/v1/namespaces/test-ns/customthings/test-custom', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'custom.io/v1',
            kind: 'CustomThing',
            metadata: { name: 'test-custom' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-custom', 'custom.io/v1', 'CustomThing');
      
      expect(result).toHaveProperty('kind', 'CustomThing');
    });

    it('should handle TanzuKubernetesCluster kind', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/run.tanzu.vmware.com/v1alpha3/namespaces/test-ns/tanzukubernetesclusters/test-tkc', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'run.tanzu.vmware.com/v1alpha3',
            kind: 'TanzuKubernetesCluster',
            metadata: { name: 'test-tkc' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-tkc', 'run.tanzu.vmware.com/v1alpha3', 'TanzuKubernetesCluster');
      
      expect(result).toHaveProperty('kind', 'TanzuKubernetesCluster');
    });

    it('should handle Service kind', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/api/v1/namespaces/test-ns/services/test-svc', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: 'test-svc' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-svc', 'v1', 'Service');
      
      expect(result).toHaveProperty('kind', 'Service');
    });

    it('should handle Deployment kind', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/apps/v1/namespaces/test-ns/deployments/test-deploy', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: 'test-deploy' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-deploy', 'apps/v1', 'Deployment');
      
      expect(result).toHaveProperty('kind', 'Deployment');
    });

    it('should handle Secret kind', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/api/v1/namespaces/test-ns/secrets/test-secret', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: 'test-secret' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-secret', 'v1', 'Secret');
      
      expect(result).toHaveProperty('kind', 'Secret');
    });

    it('should handle Namespace kind', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/api/v1/namespaces/test-ns/namespaces/test-namespace', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'test-namespace' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-namespace', 'v1', 'Namespace');
      
      expect(result).toHaveProperty('kind', 'Namespace');
    });

    it('should handle Cluster kind', async () => {
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/proxy/k8s/namespaces/ns-urn/apis/cluster.x-k8s.io/v1beta1/namespaces/test-ns/clusters/test-cluster', (_req, res, ctx) => {
          return res(ctx.json({ 
            apiVersion: 'cluster.x-k8s.io/v1beta1',
            kind: 'Cluster',
            metadata: { name: 'test-cluster' }
          }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      const result = await service.getSupervisorResourceManifest('ns-urn', 'test-ns', 'test-cluster', 'cluster.x-k8s.io/v1beta1', 'Cluster');
      
      expect(result).toHaveProperty('kind', 'Cluster');
    });
  });

  describe('token reuse', () => {
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

    it('should reuse valid token across multiple requests', async () => {
      let authCallCount = 0;
      mswServer.use(
        rest.post('http://vcf.example.com/csp/gateway/am/api/login', (_req, res, ctx) => {
          authCallCount++;
          return res(ctx.json({ cspAuthToken: 'test-token' }));
        }),
        rest.get('http://vcf.example.com/deployment/api/deployments', (_req, res, ctx) => {
          return res(ctx.json({ content: [] }));
        }),
      );

      const service = new VcfAutomationService(config, mockLogger);
      
      // Make multiple requests
      await service.getDeployments();
      await service.getDeployments();
      await service.getDeployments();
      
      // Should only authenticate once
      expect(authCallCount).toBe(1);
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
