import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

// Mock SpectroCloudClient
jest.mock('./client/SpectroCloudClient', () => ({
  SpectroCloudClient: jest.fn().mockImplementation(() => ({
    getClientKubeConfig: jest.fn().mockResolvedValue('apiVersion: v1\nkind: Config\n...'),
    getCluster: jest.fn().mockResolvedValue({ uid: 'cluster-1', metadata: { name: 'test-cluster' } }),
    getClusterProfile: jest.fn().mockResolvedValue({ uid: 'profile-1', metadata: { name: 'test-profile' } }),
    searchClusterProfilesByName: jest.fn().mockResolvedValue([{ uid: 'profile-1' }]),
    getClusterProfiles: jest.fn().mockResolvedValue([{ uid: 'profile-1' }]),
    getPackManifest: jest.fn().mockResolvedValue({ content: 'manifest content' }),
  })),
}));

describe('createRouter', () => {
  let app: express.Express;
  const mockLogger = mockServices.logger.mock();
  const mockPermissions = mockServices.permissions.mock();
  const mockAuth = mockServices.auth.mock();

  const validConfig = new ConfigReader({
    spectrocloud: {
      enablePermissions: false,
      environments: [
        {
          name: 'test',
          url: 'https://api.spectrocloud.com',
          tenant: 'test-tenant',
          apiToken: 'test-token',
        },
        {
          name: 'prod',
          url: 'https://api.prod.spectrocloud.com',
          tenant: 'prod-tenant',
          apiToken: 'prod-token',
        },
      ],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockPermissions.authorize.mockResolvedValue([{ result: 'ALLOW' }]);

    const router = await createRouter({
      logger: mockLogger,
      config: validConfig,
      permissions: mockPermissions,
      auth: mockAuth,
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
    it('should return kubeconfig', async () => {
      const response = await request(app).get('/clusters/test-cluster/kubeconfig');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('yaml');
      expect(response.headers['content-disposition']).toContain('kubeconfig.yaml');
    });

    it('should support projectUid parameter', async () => {
      const response = await request(app).get('/clusters/test-cluster/kubeconfig?projectUid=proj-1');
      expect(response.status).toBe(200);
    });

    it('should support instance parameter', async () => {
      const response = await request(app).get('/clusters/test-cluster/kubeconfig?instance=prod');
      expect(response.status).toBe(200);
    });

    it('should support frp parameter', async () => {
      const response = await request(app).get('/clusters/test-cluster/kubeconfig?frp=false');
      expect(response.status).toBe(200);
    });

    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const router = await createRouter({
        logger: mockLogger,
        config,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/clusters/test-cluster/kubeconfig');
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('No SpectroCloud configuration');
    });

    it('should return 403 when permission denied', async () => {
      const configWithPermissions = new ConfigReader({
        spectrocloud: {
          enablePermissions: true,
          environments: [{ name: 'test', url: 'https://api.spectrocloud.com', tenant: 'test', apiToken: 'token' }],
        },
      });
      mockPermissions.authorize.mockResolvedValue([{ result: 'DENY' }]);

      const router = await createRouter({
        logger: mockLogger,
        config: configWithPermissions,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const permApp = express();
      permApp.use(router);

      const response = await request(permApp).get('/clusters/test-cluster/kubeconfig');
      expect(response.status).toBe(403);
    });
  });

  describe('GET /clusters/:clusterUid', () => {
    it('should return cluster details', async () => {
      const response = await request(app).get('/clusters/test-cluster');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uid');
    });

    it('should support projectUid and instance parameters', async () => {
      const response = await request(app).get('/clusters/test-cluster?projectUid=proj-1&instance=test');
      expect(response.status).toBe(200);
    });

    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const router = await createRouter({
        logger: mockLogger,
        config,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/clusters/test-cluster');
      expect(response.status).toBe(500);
    });
  });

  describe('GET /profiles/:profileUid', () => {
    it('should return profile details', async () => {
      const response = await request(app).get('/profiles/test-profile');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uid');
    });

    it('should support projectUid and instance parameters', async () => {
      const response = await request(app).get('/profiles/test-profile?projectUid=proj-1&instance=test');
      expect(response.status).toBe(200);
    });

    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const router = await createRouter({
        logger: mockLogger,
        config,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/profiles/test-profile');
      expect(response.status).toBe(500);
    });
  });

  describe('POST /profiles/search', () => {
    it('should search profiles by names', async () => {
      const response = await request(app)
        .post('/profiles/search')
        .send({ names: ['profile-1', 'profile-2'] });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profiles');
    });

    it('should support projectUid and instance parameters', async () => {
      const response = await request(app)
        .post('/profiles/search?projectUid=proj-1&instance=test')
        .send({ names: ['profile-1'] });
      expect(response.status).toBe(200);
    });

    it('should return 400 when names array is missing', async () => {
      const response = await request(app)
        .post('/profiles/search')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('names array is required');
    });

    it('should return 400 when names is empty array', async () => {
      const response = await request(app)
        .post('/profiles/search')
        .send({ names: [] });
      expect(response.status).toBe(400);
    });

    it('should return 400 when names is not an array', async () => {
      const response = await request(app)
        .post('/profiles/search')
        .send({ names: 'not-an-array' });
      expect(response.status).toBe(400);
    });

    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const router = await createRouter({
        logger: mockLogger,
        config,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp)
        .post('/profiles/search')
        .send({ names: ['profile-1'] });
      expect(response.status).toBe(500);
    });
  });

  describe('GET /clusters/:clusterUid/profiles', () => {
    it('should return cluster profiles', async () => {
      const response = await request(app).get('/clusters/test-cluster/profiles');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should support projectUid and instance parameters', async () => {
      const response = await request(app).get('/clusters/test-cluster/profiles?projectUid=proj-1&instance=test');
      expect(response.status).toBe(200);
    });

    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const router = await createRouter({
        logger: mockLogger,
        config,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/clusters/test-cluster/profiles');
      expect(response.status).toBe(500);
    });
  });

  describe('GET /clusters/:clusterUid/pack/manifests/:manifestUid', () => {
    it('should return pack manifest', async () => {
      const response = await request(app).get('/clusters/test-cluster/pack/manifests/manifest-1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
    });

    it('should support projectUid and instance parameters', async () => {
      const response = await request(app).get('/clusters/test-cluster/pack/manifests/manifest-1?projectUid=proj-1&instance=test');
      expect(response.status).toBe(200);
    });

    it('should return 500 when no client is configured', async () => {
      const config = new ConfigReader({});
      const router = await createRouter({
        logger: mockLogger,
        config,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const emptyApp = express();
      emptyApp.use(router);

      const response = await request(emptyApp).get('/clusters/test-cluster/pack/manifests/manifest-1');
      expect(response.status).toBe(500);
    });
  });

  describe('permission handling', () => {
    it('should allow all operations when permissions are disabled', async () => {
      // All requests should succeed with permissions disabled (default config)
      const response = await request(app).get('/clusters/test-cluster');
      expect(response.status).toBe(200);
    });

    it('should check permissions when enabled', async () => {
      const configWithPermissions = new ConfigReader({
        spectrocloud: {
          enablePermissions: true,
          environments: [{ name: 'test', url: 'https://api.spectrocloud.com', tenant: 'test', apiToken: 'token' }],
        },
      });
      mockPermissions.authorize.mockResolvedValue([{ result: 'ALLOW' }]);

      const router = await createRouter({
        logger: mockLogger,
        config: configWithPermissions,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const permApp = express();
      permApp.use(router);

      const response = await request(permApp).get('/clusters/test-cluster');
      expect(response.status).toBe(200);
      expect(mockPermissions.authorize).toHaveBeenCalled();
    });

    it('should handle permission check errors gracefully', async () => {
      const configWithPermissions = new ConfigReader({
        spectrocloud: {
          enablePermissions: true,
          environments: [{ name: 'test', url: 'https://api.spectrocloud.com', tenant: 'test', apiToken: 'token' }],
        },
      });
      mockPermissions.authorize.mockRejectedValue(new Error('Permission service unavailable'));

      const router = await createRouter({
        logger: mockLogger,
        config: configWithPermissions,
        permissions: mockPermissions,
        auth: mockAuth,
      });
      const permApp = express();
      permApp.use(router);

      const response = await request(permApp).get('/clusters/test-cluster');
      expect(response.status).toBe(403);
    });
  });
});
