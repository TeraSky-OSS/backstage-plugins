import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';

// Mock KubernetesService
jest.mock('./KubernetesService', () => {
  return {
    KubernetesService: jest.fn().mockImplementation(() => ({
      getResources: jest.fn().mockResolvedValue([]),
      getEvents: jest.fn().mockResolvedValue([]),
      getResourceGraph: jest.fn().mockResolvedValue([]),
    })),
  };
});

describe('createRouter', () => {
  let app: express.Express;

  beforeEach(async () => {
    jest.clearAllMocks();

    const logger = mockServices.logger.mock();
    const permissions = mockServices.permissions.mock();
    const discovery = mockServices.discovery.mock();
    const auth = mockServices.auth.mock();

    // Mock permissions to always allow
    permissions.authorize = jest.fn().mockResolvedValue([{ result: 'ALLOW' }]);

    const router = await createRouter({
      logger,
      permissions,
      discovery,
      auth,
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
    it('should return 400 when required parameters are missing', async () => {
      const response = await request(app).get('/resources');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required parameters');
    });

    it('should return resources when all parameters are provided', async () => {
      const response = await request(app)
        .get('/resources')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'test-instance',
          crdName: 'test-crd',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /events', () => {
    it('should return 400 when required parameters are missing', async () => {
      const response = await request(app).get('/events');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required parameters');
    });

    it('should return events when all parameters are provided', async () => {
      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Application',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('GET /graph', () => {
    it('should return 400 when required parameters are missing', async () => {
      const response = await request(app).get('/graph');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required parameters');
    });

    it('should return graph when all parameters are provided', async () => {
      const response = await request(app)
        .get('/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          rgdName: 'test-rgd',
          rgdId: 'rgd-1',
          instanceId: 'instance-1',
          instanceName: 'test-instance',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('resources');
    });
  });
});

