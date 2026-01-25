import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';

describe('kubernetes-resources-permissions-backend router', () => {
  let app: express.Express;

  beforeEach(async () => {
    const mockLogger = mockServices.logger.mock();
    const mockPermissions = mockServices.permissions.mock();

    const router = await createRouter({
      logger: mockLogger,
      permissions: mockPermissions,
    });

    app = express().use(router);
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});

