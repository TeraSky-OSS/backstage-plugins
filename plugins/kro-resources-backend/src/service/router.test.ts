import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';

// Mock KubernetesService
jest.mock('./KubernetesService', () => ({
  KubernetesService: jest.fn().mockImplementation(() => ({
    getResources: jest.fn().mockResolvedValue({ items: [] }),
    getEvents: jest.fn().mockResolvedValue([]),
    getResourceGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
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
      expect(response.body.error).toBe('Missing required parameters');
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
  });
});
