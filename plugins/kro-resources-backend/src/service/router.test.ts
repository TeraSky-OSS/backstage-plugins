import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';

// Mock KubernetesService
const mockGetResources = jest.fn().mockResolvedValue({ items: [] });
const mockGetEvents = jest.fn().mockResolvedValue([]);
const mockGetResourceGraph = jest.fn().mockResolvedValue({ nodes: [], edges: [] });

jest.mock('./KubernetesService', () => ({
  KubernetesService: jest.fn().mockImplementation(() => ({
    getResources: mockGetResources,
    getEvents: mockGetEvents,
    getResourceGraph: mockGetResourceGraph,
  })),
}));

describe('kro-resources router', () => {
  let app: express.Express;
  let mockPermissions: any;
  let mockAuth: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const mockLogger = mockServices.logger.mock();
    mockPermissions = {
      authorize: jest.fn().mockResolvedValue([{ result: 'ALLOW' }]),
    };
    const mockDiscovery = mockServices.discovery.mock();
    mockAuth = {
      getOwnServiceCredentials: jest.fn().mockResolvedValue({ principal: { type: 'service' } }),
    };

    const router = await createRouter({
      logger: mockLogger,
      permissions: mockPermissions as any,
      discovery: mockDiscovery,
      auth: mockAuth as any,
    });

    app = express();
    app.use(router);
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /resources', () => {
    it('should return resources when all parameters provided', async () => {
      const response = await request(app)
        .get('/resources')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'my-instance',
          crdName: 'test.io/v1/tests',
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 when parameters missing', async () => {
      const response = await request(app).get('/resources').query({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters: clusterName, namespace, instanceId, instanceName');
    });

    it('should return 403 when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: false }]);

      const response = await request(app)
        .get('/resources')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'my-instance',
          crdName: 'test.io/v1/tests',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 500 when service throws error', async () => {
      mockGetResources.mockRejectedValueOnce(new Error('Service error'));

      const response = await request(app)
        .get('/resources')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'my-instance',
          crdName: 'test.io/v1/tests',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch resources');
    });
  });

  describe('GET /events', () => {
    it('should return events when all parameters provided', async () => {
      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Application',
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 when parameters missing', async () => {
      const response = await request(app).get('/events').query({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return 403 when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: false }]);

      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Pod',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should use RGD permission for ResourceGraphDefinition kind', async () => {
      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-rgd',
          resourceKind: 'ResourceGraphDefinition',
        });

      expect(response.status).toBe(200);
      expect(mockPermissions.authorize).toHaveBeenCalled();
    });

    it('should use default permission for generic resource kinds', async () => {
      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-deployment',
          resourceKind: 'Deployment',
        });

      expect(response.status).toBe(200);
    });

    it('should return 500 when service throws error', async () => {
      mockGetEvents.mockRejectedValueOnce(new Error('Service error'));

      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Pod',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch events');
    });
  });

  describe('GET /graph', () => {
    it('should return resource graph when all parameters provided', async () => {
      const response = await request(app)
        .get('/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'my-instance',
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 when parameters missing', async () => {
      const response = await request(app).get('/graph').query({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should return 403 when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: false }]);

      const response = await request(app)
        .get('/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'my-instance',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 500 when service throws error', async () => {
      mockGetResourceGraph.mockRejectedValueOnce(new Error('Service error'));

      const response = await request(app)
        .get('/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'my-instance',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch resource graph');
    });
  });
});
