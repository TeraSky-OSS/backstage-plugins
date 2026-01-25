import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { AuthorizeResult } from '@backstage/plugin-permission-common';

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe('createRouter', () => {
  describe('with configuration', () => {
    let app: express.Express;
    let mockPermissions: ReturnType<typeof mockServices.permissions.mock>;
    let mockHttpAuth: ReturnType<typeof mockServices.httpAuth.mock>;

    beforeEach(async () => {
      const config = new ConfigReader({
        app: {
          baseUrl: 'http://localhost:3000',
        },
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
      mockPermissions = mockServices.permissions.mock();
      mockHttpAuth = mockServices.httpAuth.mock();

      const router = await createRouter({
        logger,
        config,
        permissions: mockPermissions,
        httpAuth: mockHttpAuth,
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

      it('should return 403 when permission denied', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

        const response = await request(app).get('/workshops/test-portal');
        
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Access denied to this training portal');
      });

      it('should return workshops catalog when authorized', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.json({ 
              workshops: [
                { name: 'workshop-1', environment: { name: 'env-1' } },
              ],
            }));
          }),
        );

        const response = await request(app).get('/workshops/test-portal');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('workshops');
      });

      it('should return 500 when token fetch fails', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.status(401), ctx.text('Unauthorized'));
          }),
        );

        const response = await request(app).get('/workshops/test-portal');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to get workshops catalog');
      });

      it('should return 500 when catalog fetch fails', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.status(500), ctx.text('Internal Server Error'));
          }),
        );

        const response = await request(app).get('/workshops/test-portal');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to get workshops catalog');
      });
    });

    describe('POST /workshops/:portalName/token', () => {
      it('should return 404 for non-existent portal', async () => {
        const response = await request(app).post('/workshops/non-existent-portal/token');
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Training portal not found');
      });

      it('should return 403 when permission denied', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

        const response = await request(app).post('/workshops/test-portal/token');
        
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Access denied to this training portal');
      });

      it('should return token when authorized', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ 
              access_token: 'test-token',
              token_type: 'Bearer',
              expires_in: 3600,
            }));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/token');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('access_token', 'test-token');
      });

      it('should return 500 when token fetch fails', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.status(401), ctx.text('Unauthorized'));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/token');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to get access token');
      });
    });

    describe('POST /workshops/:portalName/:workshopEnvName/request', () => {
      it('should return 404 for non-existent portal', async () => {
        const response = await request(app).post('/workshops/non-existent-portal/test-workshop/request');
        
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Training portal not found');
      });

      it('should return 404 when workshop not found', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.json({ 
              workshops: [
                { name: 'other-workshop', environment: { name: 'other-env' } },
              ],
            }));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/non-existent-env/request');
        
        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Workshop not found');
      });

      it('should return 403 when permission denied for workshop', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.json({ 
              workshops: [
                { name: 'test-workshop', environment: { name: 'test-env' } },
              ],
            }));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/test-env/request');
        
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Access denied to start this workshop');
      });

      it('should request workshop session when authorized', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.json({ 
              workshops: [
                { name: 'test-workshop', environment: { name: 'test-env' } },
              ],
            }));
          }),
          rest.post('https://test-portal.example.com/workshops/environment/test-env/request/', (_req, res, ctx) => {
            return res(ctx.json({ 
              url: '/workshop/session/abc123',
              session_id: 'abc123',
            }));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/test-env/request');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('url');
        expect(response.body.url).toContain('https://test-portal.example.com');
      });

      it('should return 500 when catalog fetch fails', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.status(500), ctx.text('Internal Server Error'));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/test-env/request');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to request workshop');
      });

      it('should return 500 when session request fails', async () => {
        mockHttpAuth.credentials.mockResolvedValue({ principal: { type: 'user' } } as any);
        mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);

        mswServer.use(
          rest.post('https://test-portal.example.com/oauth2/token/', (_req, res, ctx) => {
            return res(ctx.json({ access_token: 'test-token' }));
          }),
          rest.get('https://test-portal.example.com/workshops/catalog/workshops/', (_req, res, ctx) => {
            return res(ctx.json({ 
              workshops: [
                { name: 'test-workshop', environment: { name: 'test-env' } },
              ],
            }));
          }),
          rest.post('https://test-portal.example.com/workshops/environment/test-env/request/', (_req, res, ctx) => {
            return res(ctx.status(503), ctx.text('Service Unavailable'));
          }),
        );

        const response = await request(app).post('/workshops/test-portal/test-env/request');
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to request workshop');
      });
    });
  });
});
