import request from 'supertest';
import express from 'express';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const mswServer = setupServer();
beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe('createRouter', () => {
  let app: express.Express;
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    scaleops: {
      baseUrl: 'http://scaleops.example.com',
      authentication: {
        enabled: true,
        user: 'test-user',
        password: 'test-password',
      },
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    mswServer.use(
      rest.post('http://scaleops.example.com/auth/callback', (req, res, ctx) => {
        return res(
          ctx.status(302),
          ctx.set('Location', 'http://scaleops.example.com/redirect?token=test-token-123')
        );
      }),
    );

    const router = await createRouter({
      logger: mockLogger,
      config: mockConfig,
    });
    app = express();
    app.use(router);
  });

  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('proxies GET requests to ScaleOps API', async () => {
    mswServer.use(
      rest.get('http://scaleops.example.com/workloads', (req, res, ctx) => {
        return res(ctx.json({ workloads: [] }));
      }),
    );

    const response = await request(app).get('/api/workloads');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ workloads: [] });
  });

  it('proxies POST requests to ScaleOps API', async () => {
    mswServer.use(
      rest.post('http://scaleops.example.com/workloads/query', (req, res, ctx) => {
        return res(ctx.json({ results: [] }));
      }),
    );

    const response = await request(app)
      .post('/api/workloads/query')
      .send({ labels: ['app=test'] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ results: [] });
  });

  it('handles API errors', async () => {
    mswServer.use(
      rest.get('http://scaleops.example.com/error-endpoint', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
      }),
    );

    const response = await request(app).get('/api/error-endpoint');
    expect(response.status).toBe(500);
  });

  it('handles authentication failure', async () => {
    mswServer.use(
      rest.post('http://scaleops.example.com/auth/callback', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
      }),
    );

    const response = await request(app).get('/api/workloads');
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });

  it('passes X-Scaleops-Cluster header', async () => {
    let capturedHeaders: any;

    mswServer.use(
      rest.get('http://scaleops.example.com/workloads', (req, res, ctx) => {
        capturedHeaders = Object.fromEntries(req.headers.entries());
        return res(ctx.json({ workloads: [] }));
      }),
    );

    await request(app)
      .get('/api/workloads')
      .set('x-scaleops-cluster', 'test-cluster');

    expect(capturedHeaders['x-scaleops-cluster']).toBe('test-cluster');
  });
});

describe('createRouter without authentication', () => {
  let app: express.Express;
  const mockLogger = mockServices.logger.mock();

  const mockConfigNoAuth = new ConfigReader({
    scaleops: {
      baseUrl: 'http://scaleops.example.com',
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const router = await createRouter({
      logger: mockLogger,
      config: mockConfigNoAuth,
    });
    app = express();
    app.use(router);
  });

  it('returns error when authentication is not configured', async () => {
    const response = await request(app).get('/api/workloads');
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });
});

