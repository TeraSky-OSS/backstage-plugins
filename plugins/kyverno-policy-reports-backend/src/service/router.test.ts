import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';
import { KubernetesService } from './KubernetesService';

// Mock KubernetesService
jest.mock('./KubernetesService');

describe('createRouter', () => {
  let app: express.Express;
  let mockKubernetesService: jest.Mocked<KubernetesService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockKubernetesService = {
      getPolicyReports: jest.fn().mockResolvedValue([]),
      getPolicy: jest.fn().mockResolvedValue({}),
      getCrossplanePolicyReports: jest.fn().mockResolvedValue([]),
    } as any;

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
      kubernetesService: mockKubernetesService,
    });

    app = express();
    app.use(router);
  });

  describe('POST /reports', () => {
    it('should return reports when authorized', async () => {
      mockKubernetesService.getPolicyReports.mockResolvedValueOnce([
        { kind: 'PolicyReport', metadata: { uid: 'report-1', namespace: 'default' } } as any,
      ]);

      const response = await request(app)
        .post('/reports')
        .send({ entityRef: 'component:default/test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });

    it('should return 403 when unauthorized', async () => {
      const permissions = mockServices.permissions.mock();
      permissions.authorize = jest.fn().mockResolvedValue([{ result: 'DENY' }]);

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
        .post('/reports')
        .send({ entityRef: 'component:default/test' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /policy', () => {
    it('should return 400 when required parameters are missing', async () => {
      const response = await request(app).get('/policy');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required query parameters');
    });

    it('should return policy when all parameters are provided', async () => {
      mockKubernetesService.getPolicy.mockResolvedValueOnce({
        kind: 'ClusterPolicy',
        metadata: { name: 'test-policy' },
      });

      const response = await request(app)
        .get('/policy')
        .query({
          clusterName: 'test-cluster',
          policyName: 'test-policy',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('policy');
    });

    it('should return 403 when unauthorized', async () => {
      const permissions = mockServices.permissions.mock();
      permissions.authorize = jest.fn().mockResolvedValue([{ result: 'DENY' }]);

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
        .get('/policy')
        .query({
          clusterName: 'test-cluster',
          policyName: 'test-policy',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /crossplane-reports', () => {
    it('should return crossplane reports when authorized', async () => {
      mockKubernetesService.getCrossplanePolicyReports.mockResolvedValueOnce([
        { kind: 'PolicyReport', metadata: { uid: 'crossplane-1', namespace: 'default' } } as any,
      ]);

      const response = await request(app)
        .post('/crossplane-reports')
        .send({ entityRef: 'component:default/test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });
  });
});

