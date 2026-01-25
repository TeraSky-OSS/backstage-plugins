import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

describe('createRouter', () => {
  describe('with configuration', () => {
    let app: express.Express;

    beforeEach(async () => {
      const config = new ConfigReader({
        educates: {
          trainingPortals: [
            {
              name: 'test-portal',
              url: 'https://test-portal.example.com',
              auth: {
                robotUsername: 'robot',
                robotPassword: 'password',
                clientId: 'client-id',
                clientSecret: 'client-secret',
              },
            },
          ],
        },
      });

      const logger = mockServices.logger.mock();
      const permissions = mockServices.permissions.mock();
      const httpAuth = mockServices.httpAuth.mock();

      const router = await createRouter({
        logger,
        config,
        permissions,
        httpAuth,
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

    describe('GET /workshops/:portalName', () => {
      it('should return 404 for non-existent portal', async () => {
        const response = await request(app).get('/workshops/non-existent-portal');
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Training portal not found');
      });
    });

    describe('POST /workshops/:portalName/token', () => {
      it('should return 404 for non-existent portal', async () => {
        const response = await request(app).post('/workshops/non-existent-portal/token');
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Training portal not found');
      });
    });

    describe('POST /workshops/:portalName/:workshopEnvName/request', () => {
      it('should return 404 for non-existent portal', async () => {
        const response = await request(app).post('/workshops/non-existent-portal/test-workshop/request');
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Training portal not found');
      });
    });
  });
});

