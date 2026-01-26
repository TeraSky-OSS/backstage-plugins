import { SpectroCloudClient } from './SpectroCloudClient';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SpectroCloudClient', () => {
  const mockLogger = mockServices.logger.mock();
  const baseUrl = 'https://spectrocloud.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllClusters', () => {
    it('should fetch all clusters', async () => {
      const mockClusters = [
        {
          metadata: {
            uid: 'cluster-1',
            name: 'cluster-one',
            annotations: { scope: 'project', projectUid: 'project-1' },
          },
          spec: { cloudType: 'aws' },
          status: { state: 'Running' },
        },
        {
          metadata: {
            uid: 'cluster-2',
            name: 'cluster-two',
            annotations: { scope: 'tenant' },
          },
          spec: { cloudType: 'gcp' },
          status: { state: 'Running' },
        },
      ];

      server.use(
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/meta`, (_req, res, ctx) => {
          return res(ctx.json(mockClusters));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getAllClusters();

      expect(result).toHaveLength(2);
      expect(result[0].metadata.name).toBe('cluster-one');
    });

    it('should return empty array on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/meta`, (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getAllClusters();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getProject', () => {
    it('should fetch a project', async () => {
      const mockProject = {
        metadata: { uid: 'project-1', name: 'Test Project' },
      };

      server.use(
        rest.get(`${baseUrl}/v1/projects/project-1`, (_req, res, ctx) => {
          return res(ctx.json(mockProject));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getProject('project-1');

      expect(result?.metadata.name).toBe('Test Project');
    });

    it('should return undefined on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/projects/not-found`, (_req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getProject('not-found');

      expect(result).toBeUndefined();
    });
  });

  describe('getAdminKubeConfig', () => {
    it('should fetch admin kubeconfig for project-scoped cluster', async () => {
      const mockKubeconfig = `
apiVersion: v1
kind: Config
clusters:
  - name: test-cluster
    cluster:
      server: https://api.test-cluster.example.com
`;

      server.use(
        rest.get(`${baseUrl}/v1/spectroclusters/cluster-1/assets/adminKubeconfig`, (req, res, ctx) => {
          const projectUid = req.url.searchParams.get('ProjectUid');
          expect(projectUid).toBe('project-1');
          return res(ctx.text(mockKubeconfig));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getAdminKubeConfig('cluster-1', 'project-1');

      expect(result).toContain('test-cluster');
    });

    it('should fetch admin kubeconfig for tenant-scoped cluster', async () => {
      const mockKubeconfig = `
apiVersion: v1
kind: Config
clusters:
  - name: tenant-cluster
    cluster:
      server: https://api.tenant-cluster.example.com
`;

      server.use(
        rest.get(`${baseUrl}/v1/spectroclusters/cluster-2/assets/adminKubeconfig`, (req, res, ctx) => {
          expect(req.url.searchParams.has('ProjectUid')).toBe(false);
          return res(ctx.text(mockKubeconfig));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getAdminKubeConfig('cluster-2');

      expect(result).toContain('tenant-cluster');
    });

    it('should return undefined on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/spectroclusters/not-found/assets/adminKubeconfig`, (_req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = await client.getAdminKubeConfig('not-found');

      expect(result).toBeUndefined();
    });
  });

  describe('parseKubeConfig', () => {
    it('should parse valid kubeconfig', () => {
      const kubeconfigText = `
apiVersion: v1
kind: Config
clusters:
  - name: test-cluster
    cluster:
      server: https://api.test-cluster.example.com
      certificate-authority-data: dGVzdC1jYS1kYXRh
contexts:
  - name: test-context
    context:
      cluster: test-cluster
      user: test-user
current-context: test-context
users:
  - name: test-user
    user:
      token: test-token
`;

      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = client.parseKubeConfig(kubeconfigText);

      expect(result?.clusters[0].cluster.server).toBe('https://api.test-cluster.example.com');
      expect(result?.['current-context']).toBe('test-context');
    });

    it('should return undefined for invalid YAML', () => {
      const client = new SpectroCloudClient(
        { url: baseUrl, tenant: 'test-tenant', apiToken: 'test-token' },
        mockLogger,
      );

      const result = client.parseKubeConfig('this is not: yaml: [invalid');

      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

