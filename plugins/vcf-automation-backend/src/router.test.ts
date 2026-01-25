import request from 'supertest';
import express from 'express';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Mock VcfAutomationService
jest.mock('./services/VcfAutomationService', () => ({
  VcfAutomationService: jest.fn().mockImplementation(() => ({
    getDeploymentHistory: jest.fn().mockResolvedValue({ history: [] }),
    getDeploymentEvents: jest.fn().mockResolvedValue({ events: [] }),
    getResourceDetails: jest.fn().mockResolvedValue({ id: 'res-1' }),
    getProjectDetails: jest.fn().mockResolvedValue({ id: 'proj-1' }),
    getDeploymentDetails: jest.fn().mockResolvedValue({ id: 'dep-1' }),
    getProjects: jest.fn().mockResolvedValue({ content: [] }),
    getDeployments: jest.fn().mockResolvedValue({ content: [] }),
    getDeploymentResources: jest.fn().mockResolvedValue({ content: [] }),
    getSupervisorResources: jest.fn().mockResolvedValue({ content: [] }),
    getSupervisorResource: jest.fn().mockResolvedValue({ id: 'sup-res-1' }),
    getSupervisorNamespaces: jest.fn().mockResolvedValue({ items: [] }),
    getSupervisorNamespace: jest.fn().mockResolvedValue({ metadata: { name: 'ns-1' } }),
    checkVmPowerAction: jest.fn().mockResolvedValue({ allowed: true }),
    executeVmPowerAction: jest.fn().mockResolvedValue({ success: true }),
    getStandaloneVmStatus: jest.fn().mockResolvedValue({ powerState: 'PoweredOn' }),
    executeStandaloneVmPowerAction: jest.fn().mockResolvedValue({ success: true }),
    getSupervisorResourceManifest: jest.fn().mockResolvedValue({ manifest: {} }),
    updateSupervisorResourceManifest: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

describe('createRouter', () => {
  let app: express.Express;
  const mockLogger = mockServices.logger.mock();
  const mockPermissions = mockServices.permissions.mock();

  const mockConfig = new ConfigReader({
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const router = await createRouter({
      logger: mockLogger,
      config: mockConfig,
      permissions: mockPermissions,
    });
    app = express();
    app.use(router);
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /deployments/:deploymentId/history', () => {
    it('should return deployment history', async () => {
      const response = await request(app).get('/deployments/dep-123/history');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('history');
    });

    it('should support instance query parameter', async () => {
      const response = await request(app).get('/deployments/dep-123/history?instance=vcf-2');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /deployments/:deploymentId/events', () => {
    it('should return deployment events', async () => {
      const response = await request(app).get('/deployments/dep-123/events');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('GET /deployments/:deploymentId/resources/:resourceId', () => {
    it('should return resource details', async () => {
      const response = await request(app).get('/deployments/dep-123/resources/res-456');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /projects/:projectId', () => {
    it('should return project details', async () => {
      const response = await request(app).get('/projects/proj-123');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /deployments/:deploymentId', () => {
    it('should return deployment details', async () => {
      const response = await request(app).get('/deployments/dep-123');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /projects', () => {
    it('should return projects list', async () => {
      const response = await request(app).get('/projects');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
    });
  });

  describe('GET /deployments', () => {
    it('should return deployments list', async () => {
      const response = await request(app).get('/deployments');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
    });
  });

  describe('GET /deployments/:deploymentId/resources', () => {
    it('should return deployment resources', async () => {
      const response = await request(app).get('/deployments/dep-123/resources');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
    });
  });

  describe('GET /supervisor-resources', () => {
    it('should return supervisor resources', async () => {
      const response = await request(app).get('/supervisor-resources');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
    });
  });

  describe('GET /supervisor-resources/:resourceId', () => {
    it('should return supervisor resource details', async () => {
      const response = await request(app).get('/supervisor-resources/sup-res-1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /supervisor-namespaces', () => {
    it('should return supervisor namespaces', async () => {
      const response = await request(app).get('/supervisor-namespaces');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });
  });

  describe('GET /supervisor-namespaces/:namespaceId', () => {
    it('should return supervisor namespace details', async () => {
      const response = await request(app).get('/supervisor-namespaces/ns-1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metadata');
    });
  });

  describe('GET /resources/:resourceId/power-actions/:action', () => {
    it('should check PowerOn action', async () => {
      const response = await request(app).get('/resources/res-1/power-actions/PowerOn');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allowed');
    });

    it('should check PowerOff action', async () => {
      const response = await request(app).get('/resources/res-1/power-actions/PowerOff');
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app).get('/resources/res-1/power-actions/Restart');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid action');
    });
  });

  describe('POST /resources/:resourceId/power-actions/:action', () => {
    it('should execute PowerOn action', async () => {
      const response = await request(app).post('/resources/res-1/power-actions/PowerOn');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    it('should execute PowerOff action', async () => {
      const response = await request(app).post('/resources/res-1/power-actions/PowerOff');
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app).post('/resources/res-1/power-actions/Suspend');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /standalone-vms/:namespaceUrnId/:namespaceName/:vmName/status', () => {
    it('should return VM status', async () => {
      const response = await request(app).get('/standalone-vms/urn-1/ns-1/vm-1/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('powerState');
    });
  });

  describe('PUT /standalone-vms/:namespaceUrnId/:namespaceName/:vmName/power-state', () => {
    it('should update VM power state to PoweredOn', async () => {
      const response = await request(app)
        .put('/standalone-vms/urn-1/ns-1/vm-1/power-state')
        .send({ powerState: 'PoweredOn', vmData: { id: 'vm-1' } });
      expect(response.status).toBe(200);
    });

    it('should update VM power state to PoweredOff', async () => {
      const response = await request(app)
        .put('/standalone-vms/urn-1/ns-1/vm-1/power-state')
        .send({ powerState: 'PoweredOff', vmData: { id: 'vm-1' } });
      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid power state', async () => {
      const response = await request(app)
        .put('/standalone-vms/urn-1/ns-1/vm-1/power-state')
        .send({ powerState: 'Suspended', vmData: {} });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid powerState');
    });

    it('should return 400 when vmData is missing', async () => {
      const response = await request(app)
        .put('/standalone-vms/urn-1/ns-1/vm-1/power-state')
        .send({ powerState: 'PoweredOn' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('vmData is required');
    });
  });

  describe('GET /supervisor-resource-manifest/:namespaceUrnId/:namespaceName/:resourceName', () => {
    it('should return resource manifest', async () => {
      const response = await request(app)
        .get('/supervisor-resource-manifest/urn-1/ns-1/res-1?apiVersion=v1&kind=Pod');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('manifest');
    });

    it('should return 400 when apiVersion is missing', async () => {
      const response = await request(app)
        .get('/supervisor-resource-manifest/urn-1/ns-1/res-1?kind=Pod');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('apiVersion and kind');
    });

    it('should return 400 when kind is missing', async () => {
      const response = await request(app)
        .get('/supervisor-resource-manifest/urn-1/ns-1/res-1?apiVersion=v1');
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /supervisor-resource-manifest/:namespaceUrnId/:namespaceName/:resourceName', () => {
    it('should update resource manifest', async () => {
      const response = await request(app)
        .put('/supervisor-resource-manifest/urn-1/ns-1/res-1?apiVersion=v1&kind=Pod')
        .send({ manifest: { metadata: { name: 'test' } } });
      expect(response.status).toBe(200);
    });

    it('should return 400 when manifest is missing', async () => {
      const response = await request(app)
        .put('/supervisor-resource-manifest/urn-1/ns-1/res-1?apiVersion=v1&kind=Pod')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('manifest is required');
    });

    it('should return 400 when apiVersion/kind is missing', async () => {
      const response = await request(app)
        .put('/supervisor-resource-manifest/urn-1/ns-1/res-1')
        .send({ manifest: {} });
      expect(response.status).toBe(400);
    });
  });
});

