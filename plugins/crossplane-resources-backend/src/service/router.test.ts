import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';
import { KubernetesService } from './KubernetesService';

// Mock the KubernetesService
jest.mock('./KubernetesService');

describe('createRouter', () => {
  let app: express.Express;
  let mockKubernetesService: jest.Mocked<KubernetesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockKubernetesService = {
      getResources: jest.fn().mockResolvedValue([]),
      getEvents: jest.fn().mockResolvedValue({ items: [] }),
      getResourceGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getV2ResourceGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
    } as any;

    const logger = mockServices.logger.mock();
    const permissions = mockServices.permissions.mock();
    const discovery = mockServices.discovery.mock();
    const auth = mockServices.auth.mock();

    // Mock permissions to always allow
    permissions.authorize = jest.fn().mockResolvedValue([
      { result: 'ALLOW' },
      { result: 'ALLOW' },
      { result: 'ALLOW' },
    ]);

    const router = await createRouter({
      logger,
      permissions,
      discovery,
      auth,
      kubernetesService: mockKubernetesService,
    });

    app = express();
    app.use(router);
  });

  describe('POST /resources', () => {
    it('should return resources when authorized', async () => {
      mockKubernetesService.getResources.mockResolvedValueOnce([
        { kind: 'Claim', name: 'test-claim' },
      ]);

      const response = await request(app)
        .post('/resources')
        .send({ entityRef: 'component:default/test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ kind: 'Claim', name: 'test-claim' }]);
    });

    it('should return 403 when unauthorized', async () => {
      const permissions = mockServices.permissions.mock();
      permissions.authorize = jest.fn().mockResolvedValue([
        { result: 'DENY' },
      ]);

      const router = await createRouter({
        logger: mockServices.logger.mock(),
        permissions,
        discovery: mockServices.discovery.mock(),
        auth: mockServices.auth.mock(),
        kubernetesService: mockKubernetesService,
      });

      const unauthorizedApp = express();
      unauthorizedApp.use(router);

      const response = await request(unauthorizedApp)
        .post('/resources')
        .send({ entityRef: 'component:default/test' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /events', () => {
    it('should return 400 when query parameters are missing', async () => {
      const response = await request(app).get('/events');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required query parameters');
    });

    it('should return events when all parameters are provided', async () => {
      mockKubernetesService.getEvents.mockResolvedValueOnce({ items: [{ type: 'Normal' }] });

      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Claim',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [{ type: 'Normal' }] });
    });
  });

  describe('GET /graph', () => {
    it('should return 400 when query parameters are missing', async () => {
      const response = await request(app).get('/graph');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required query parameters');
    });

    it('should return graph when all parameters are provided', async () => {
      mockKubernetesService.getResourceGraph.mockResolvedValueOnce({
        nodes: [{ id: '1', label: 'test' }],
        edges: [],
      });

      const response = await request(app)
        .get('/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          xrdName: 'test-xrd',
          xrdId: 'xrd-1',
          claimId: 'claim-1',
          claimName: 'test-claim',
          claimGroup: 'example.com',
          claimVersion: 'v1',
          claimPlural: 'testclaims',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
    });
  });

  describe('GET /v2/graph', () => {
    it('should return 400 when query parameters are missing', async () => {
      const response = await request(app).get('/v2/graph');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required query parameters');
    });

    it('should return 400 when scope is invalid', async () => {
      const response = await request(app)
        .get('/v2/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          name: 'test',
          group: 'example.com',
          version: 'v1',
          plural: 'tests',
          scope: 'Invalid',
        });

      expect(response.status).toBe(400);
    });

    it('should return graph when all parameters are valid', async () => {
      mockKubernetesService.getV2ResourceGraph.mockResolvedValueOnce({
        nodes: [{ id: '1', label: 'test' }],
        edges: [],
      });

      const response = await request(app)
        .get('/v2/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          name: 'test',
          group: 'example.com',
          version: 'v1',
          plural: 'tests',
          scope: 'Namespaced',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
    });
  });
});

