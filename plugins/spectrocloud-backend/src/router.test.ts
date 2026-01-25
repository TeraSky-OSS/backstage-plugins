import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

describe('createRouter', () => {
  let app: express.Express;

  beforeEach(async () => {
    const config = new ConfigReader({
      spectrocloud: {
        enablePermissions: false,
        environments: [
          {
            name: 'test',
            url: 'https://api.spectrocloud.com',
            tenant: 'test-tenant',
            apiToken: 'test-token',
          },
        ],
      },
    });

    const logger = mockServices.logger.mock();
    const permissions = mockServices.permissions.mock();
    const auth = mockServices.auth.mock();

    const router = await createRouter({
      logger,
      config,
      permissions,
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

  describe('GET /clusters/:clusterUid/kubeconfig', () => {
    it('should return 500 when no client is configured', async () => {
      // Create router without configuration
      const config = new ConfigReader({});
      const logger = mockServices.logger.mock();
      const permissions = mockServices.permissions.mock();
      const auth = mockServices.auth.mock();

      const router = await createRouter({
        logger,
        config,
        permissions,
        auth,
      });

      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/clusters/test-cluster/kubeconfig');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /clusters/:clusterUid', () => {
    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const logger = mockServices.logger.mock();
      const permissions = mockServices.permissions.mock();
      const auth = mockServices.auth.mock();

      const router = await createRouter({
        logger,
        config,
        permissions,
        auth,
      });

      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/clusters/test-cluster');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /profiles/:profileUid', () => {
    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const logger = mockServices.logger.mock();
      const permissions = mockServices.permissions.mock();
      const auth = mockServices.auth.mock();

      const router = await createRouter({
        logger,
        config,
        permissions,
        auth,
      });

      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/profiles/test-profile');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /profiles/search', () => {
    it('should return 400 when names array is missing', async () => {
      const response = await request(app)
        .post('/profiles/search')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when names is empty array', async () => {
      const response = await request(app)
        .post('/profiles/search')
        .send({ names: [] });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});

