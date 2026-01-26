import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';

// Mock KubernetesService
const mockKubernetesService = {
  getResources: jest.fn(),
  getEvents: jest.fn(),
  getResourceGraph: jest.fn(),
  getV2ResourceGraph: jest.fn(),
};

describe('crossplane-resources router', () => {
  let app: express.Express;

  beforeAll(async () => {
    const mockLogger = mockServices.logger.mock();
    const mockPermissions = {
      authorize: jest.fn().mockResolvedValue([{ result: 'ALLOW' }]),
    };
    const mockDiscovery = mockServices.discovery.mock();
    const mockAuth = {
      getOwnServiceCredentials: jest.fn().mockResolvedValue({ principal: { type: 'service' } }),
      getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'test' }),
    };

    const router = await createRouter({
      logger: mockLogger,
      permissions: mockPermissions as any,
      discovery: mockDiscovery,
      auth: mockAuth as any,
      kubernetesService: mockKubernetesService as any,
    });

    app = express();
    app.use(router);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /resources', () => {
    it('should return resources when authorized', async () => {
      const mockResources = { items: [{ name: 'resource-1' }] };
      mockKubernetesService.getResources.mockResolvedValue(mockResources);

      const response = await request(app)
        .post('/resources')
        .send({ clusterName: 'test-cluster' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResources);
    });
  });

  describe('GET /events', () => {
    it('should return events when all parameters provided', async () => {
      const mockEvents = { items: [{ type: 'Normal', message: 'Test event' }] };
      mockKubernetesService.getEvents.mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/events')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'test-resource',
          resourceKind: 'Claim',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvents);
    });

    it('should return 400 when parameters missing', async () => {
      const response = await request(app).get('/events').query({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required query parameters');
    });
  });

  describe('GET /graph', () => {
    it('should return resource graph when all parameters provided', async () => {
      const mockGraph = { nodes: [], edges: [] };
      mockKubernetesService.getResourceGraph.mockResolvedValue(mockGraph);

      const response = await request(app)
        .get('/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          xrdName: 'test-xrd',
          xrdId: 'xrd-1',
          claimId: 'claim-1',
          claimName: 'my-claim',
          claimGroup: 'test.io',
          claimVersion: 'v1',
          claimPlural: 'claims',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGraph);
    });

    it('should return 400 when parameters missing', async () => {
      const response = await request(app).get('/graph').query({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required query parameters');
    });
  });

  describe('GET /v2/graph', () => {
    it('should return v2 resource graph when all parameters provided', async () => {
      const mockGraph = { nodes: [], edges: [] };
      mockKubernetesService.getV2ResourceGraph.mockResolvedValue(mockGraph);

      const response = await request(app)
        .get('/v2/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          name: 'my-resource',
          group: 'test.io',
          version: 'v1',
          plural: 'resources',
          scope: 'Namespaced',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGraph);
    });

    it('should return 400 when scope is invalid', async () => {
      const response = await request(app)
        .get('/v2/graph')
        .query({
          clusterName: 'test-cluster',
          namespace: 'default',
          name: 'my-resource',
          group: 'test.io',
          version: 'v1',
          plural: 'resources',
          scope: 'Invalid',
        });

      expect(response.status).toBe(400);
    });
  });
});
