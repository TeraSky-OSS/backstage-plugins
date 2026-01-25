import request from 'supertest';
import express from 'express';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { AuthorizeResult } from '@backstage/plugin-permission-common';

// Mock VcfOperationsService
jest.mock('./services/VcfOperationsService', () => ({
  VcfOperationsService: jest.fn().mockImplementation(() => ({
    getInstances: jest.fn().mockReturnValue([{ name: 'vcfo-1', baseUrl: 'http://vcfo.example.com' }]),
    getResourceMetrics: jest.fn().mockResolvedValue({ values: [] }),
    queryResourceMetrics: jest.fn().mockResolvedValue({ values: [] }),
    getLatestResourceMetrics: jest.fn().mockResolvedValue({ values: [] }),
    findResourceByProperty: jest.fn().mockResolvedValue({ identifier: 'res-1' }),
    findResourceByName: jest.fn().mockResolvedValue({ identifier: 'res-1', resourceKey: { name: 'test-resource' } }),
    queryResources: jest.fn().mockResolvedValue({ resourceList: [] }),
    getAvailableMetrics: jest.fn().mockResolvedValue({ stat: [] }),
    getResourceDetails: jest.fn().mockResolvedValue({ identifier: 'res-1' }),
    queryProjectResources: jest.fn().mockResolvedValue({ resourceList: [] }),
    searchResources: jest.fn().mockResolvedValue({ resourceList: [] }),
  })),
}));

describe('createRouter', () => {
  let app: express.Express;
  const mockLogger = mockServices.logger.mock();
  const mockPermissions = mockServices.permissions.mock();
  const mockHttpAuth = mockServices.httpAuth.mock();

  const mockConfig = new ConfigReader({
    vcfOperations: {
      instances: [
        {
          baseUrl: 'http://vcfo.example.com',
          name: 'vcfo',
          authentication: {
            username: 'admin',
            password: 'password',
          },
        },
      ],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user', userEntityRef: 'user:default/test' } });
    mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

    const router = await createRouter({
      logger: mockLogger,
      config: mockConfig,
      permissions: mockPermissions,
      httpAuth: mockHttpAuth,
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

  describe('GET /instances', () => {
    it('should return instances when authorized', async () => {
      const response = await request(app).get('/instances');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return 403 when unauthorized', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);
      const response = await request(app).get('/instances');
      expect(response.status).toBe(403);
    });
  });

  describe('GET /resources/:resourceId/metrics', () => {
    it('should return metrics when statKeys provided', async () => {
      const response = await request(app)
        .get('/resources/res-123/metrics?statKeys=cpu|usage_average');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('values');
    });

    it('should return 400 when statKeys missing', async () => {
      const response = await request(app).get('/resources/res-123/metrics');
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('statKeys');
    });

    it('should handle multiple statKeys', async () => {
      const response = await request(app)
        .get('/resources/res-123/metrics?statKeys=cpu&statKeys=memory');
      expect(response.status).toBe(200);
    });

    it('should support time range parameters', async () => {
      const response = await request(app)
        .get('/resources/res-123/metrics?statKeys=cpu&begin=1000&end=2000&rollUpType=AVERAGE');
      expect(response.status).toBe(200);
    });

    it('should return 403 when unauthorized', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);
      const response = await request(app)
        .get('/resources/res-123/metrics?statKeys=cpu');
      expect(response.status).toBe(403);
    });
  });

  describe('POST /metrics/query', () => {
    it('should query metrics with valid request', async () => {
      const response = await request(app)
        .post('/metrics/query')
        .send({ resourceIds: ['res-1'], statKeys: ['cpu'] });
      expect(response.status).toBe(200);
    });

    it('should return 400 when resourceIds missing', async () => {
      const response = await request(app)
        .post('/metrics/query')
        .send({ statKeys: ['cpu'] });
      expect(response.status).toBe(400);
    });

    it('should return 400 when statKeys missing', async () => {
      const response = await request(app)
        .post('/metrics/query')
        .send({ resourceIds: ['res-1'] });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /metrics/latest', () => {
    it('should return latest metrics', async () => {
      const response = await request(app)
        .get('/metrics/latest?resourceIds=res-1&statKeys=cpu');
      expect(response.status).toBe(200);
    });

    it('should return 400 when resourceIds missing', async () => {
      const response = await request(app)
        .get('/metrics/latest?statKeys=cpu');
      expect(response.status).toBe(400);
    });

    it('should return 400 when statKeys missing', async () => {
      const response = await request(app)
        .get('/metrics/latest?resourceIds=res-1');
      expect(response.status).toBe(400);
    });

    it('should handle multiple parameters', async () => {
      const response = await request(app)
        .get('/metrics/latest?resourceIds=res-1&resourceIds=res-2&statKeys=cpu&statKeys=memory');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /resources/find-by-property', () => {
    it('should find resource by property', async () => {
      const response = await request(app)
        .get('/resources/find-by-property?propertyKey=uuid&propertyValue=abc-123');
      expect(response.status).toBe(200);
    });

    it('should return 400 when propertyKey missing', async () => {
      const response = await request(app)
        .get('/resources/find-by-property?propertyValue=abc-123');
      expect(response.status).toBe(400);
    });

    it('should return 400 when propertyValue missing', async () => {
      const response = await request(app)
        .get('/resources/find-by-property?propertyKey=uuid');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /resources/find-by-name', () => {
    it('should find resource by name', async () => {
      const response = await request(app)
        .get('/resources/find-by-name?resourceName=test-vm');
      expect(response.status).toBe(200);
    });

    it('should return 400 when resourceName missing', async () => {
      const response = await request(app)
        .get('/resources/find-by-name');
      expect(response.status).toBe(400);
    });

    it('should support instance and resourceType parameters', async () => {
      const response = await request(app)
        .get('/resources/find-by-name?resourceName=test-vm&instance=vcfo&resourceType=VirtualMachine');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /resources/query', () => {
    it('should query resources', async () => {
      const response = await request(app)
        .post('/resources/query')
        .send({ propertyConditions: { conjunctionOperator: 'AND', conditions: [] } });
      expect(response.status).toBe(200);
    });

    it('should support instance parameter', async () => {
      const response = await request(app)
        .post('/resources/query?instance=vcfo')
        .send({});
      expect(response.status).toBe(200);
    });
  });

  describe('GET /resources/:resourceId/available-metrics', () => {
    it('should return available metrics', async () => {
      const response = await request(app)
        .get('/resources/res-123/available-metrics');
      expect(response.status).toBe(200);
    });

    it('should support instance parameter', async () => {
      const response = await request(app)
        .get('/resources/res-123/available-metrics?instance=vcfo');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /resources/:resourceId', () => {
    it('should return resource details', async () => {
      const response = await request(app)
        .get('/resources/res-123');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('identifier');
    });

    it('should support instance parameter', async () => {
      const response = await request(app)
        .get('/resources/res-123?instance=vcfo');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /resources/query-projects', () => {
    it('should query project resources', async () => {
      const response = await request(app)
        .post('/resources/query-projects')
        .send({ name: ['project-1'], adapterKind: ['VMWARE'], resourceKind: ['Project'] });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /resources', () => {
    it('should search resources', async () => {
      const response = await request(app)
        .get('/resources');
      expect(response.status).toBe(200);
    });

    it('should search with filters', async () => {
      const response = await request(app)
        .get('/resources?name=test&adapterKind=VMWARE&resourceKind=VirtualMachine');
      expect(response.status).toBe(200);
    });
  });

  describe('permission check error handling', () => {
    it('should return 500 when permission check fails', async () => {
      mockHttpAuth.credentials.mockRejectedValue(new Error('Auth failed'));
      const response = await request(app).get('/instances');
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Permission check failed');
    });
  });
});

