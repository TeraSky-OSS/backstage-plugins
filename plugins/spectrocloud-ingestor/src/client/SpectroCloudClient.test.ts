import { SpectroCloudClient } from './SpectroCloudClient';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SpectroCloudClient (Ingestor)', () => {
  const mockLogger = mockServices.logger.mock();
  const baseUrl = 'https://spectrocloud.example.com';
  const apiToken = 'test-api-token';
  const tenant = 'test-tenant';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with instance name', () => {
      const client = new SpectroCloudClient(
        { url: baseUrl, tenant, apiToken, instanceName: 'test-instance' },
        mockLogger,
      );

      expect(client.getInstanceName()).toBe('test-instance');
    });

    it('should create client without instance name', () => {
      const client = new SpectroCloudClient(
        { url: baseUrl, tenant, apiToken },
        mockLogger,
      );

      expect(client.getInstanceName()).toBeUndefined();
    });
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
          spec: {
            cloudType: 'aws',
            clusterProfileTemplates: [{ uid: 'profile-1', name: 'infra-profile' }],
          },
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
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/meta`, (req, res, ctx) => {
          expect(req.headers.get('ApiKey')).toBe(apiToken);
          return res(ctx.json(mockClusters));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getAllClusters();

      expect(result).toHaveLength(2);
      expect(result[0].metadata.name).toBe('cluster-one');
      expect(result[1].spec?.cloudType).toBe('gcp');
    });

    it('should return empty array on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/meta`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getAllClusters();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getCluster', () => {
    it('should fetch cluster details', async () => {
      const mockCluster = {
        metadata: { uid: 'cluster-1', name: 'test-cluster' },
        spec: { cloudType: 'aws' },
        status: { state: 'Running' },
      };

      server.use(
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/cluster-1`, (req, res, ctx) => {
          return res(ctx.json(mockCluster));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getCluster('cluster-1');

      expect(result?.metadata.name).toBe('test-cluster');
    });

    it('should include ProjectUid header when provided', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/cluster-1`, (req, res, ctx) => {
          expect(req.headers.get('ProjectUid')).toBe('project-1');
          return res(ctx.json({ metadata: { uid: 'cluster-1', name: 'test' } }));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      await client.getCluster('cluster-1', 'project-1');
    });

    it('should return undefined on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/dashboard/spectroclusters/not-found`, (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getCluster('not-found');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllProjects', () => {
    it('should fetch all projects with pagination', async () => {
      server.use(
        rest.post(`${baseUrl}/v1/dashboard/projects`, async (req, res, ctx) => {
          const body = await req.json();
          
          if (!body.continue) {
            return res(ctx.json({
              items: [{ metadata: { uid: 'p1', name: 'Project 1' } }],
              listmeta: { continue: 'token-1' },
            }));
          }
          
          if (body.continue === 'token-1') {
            return res(ctx.json({
              items: [{ metadata: { uid: 'p2', name: 'Project 2' } }],
              listmeta: {},
            }));
          }
          
          return res(ctx.json({ items: [], listmeta: {} }));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getAllProjects();

      expect(result).toHaveLength(2);
      expect(result[0].metadata.name).toBe('Project 1');
      expect(result[1].metadata.name).toBe('Project 2');
    });

    it('should return empty array on error', async () => {
      server.use(
        rest.post(`${baseUrl}/v1/dashboard/projects`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Error'));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getAllProjects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getProject', () => {
    it('should fetch a project', async () => {
      const mockProject = {
        metadata: { uid: 'project-1', name: 'Test Project' },
        spec: { description: 'A test project' },
      };

      server.use(
        rest.get(`${baseUrl}/v1/projects/project-1`, (req, res, ctx) => {
          return res(ctx.json(mockProject));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getProject('project-1');

      expect(result?.metadata.name).toBe('Test Project');
      expect(result?.spec?.description).toBe('A test project');
    });

    it('should return undefined on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/projects/not-found`, (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getProject('not-found');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllClusterProfiles', () => {
    it('should fetch all cluster profiles', async () => {
      server.use(
        rest.post(`${baseUrl}/v1/dashboard/clusterprofiles`, async (req, res, ctx) => {
          return res(ctx.json({
            items: [
              {
                metadata: { uid: 'profile-1', name: 'Infra Profile' },
                specSummary: { published: { cloudType: 'aws', type: 'infra' } },
              },
            ],
            listmeta: {},
          }));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getAllClusterProfiles();

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('Infra Profile');
    });
  });

  describe('getProjectClusterProfiles', () => {
    it('should fetch cluster profiles for a project', async () => {
      server.use(
        rest.post(`${baseUrl}/v1/dashboard/clusterprofiles`, async (req, res, ctx) => {
          const projectUid = req.headers.get('ProjectUid');
          expect(projectUid).toBe('project-1');
          
          const body = await req.json();
          expect(body.filter.scope).toBe('project');
          
          return res(ctx.json({
            items: [
              { metadata: { uid: 'profile-1', name: 'Project Profile' } },
            ],
            listmeta: {},
          }));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getProjectClusterProfiles('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('Project Profile');
    });

    it('should handle infinite pagination loop detection', async () => {
      let callCount = 0;
      server.use(
        rest.post(`${baseUrl}/v1/dashboard/clusterprofiles`, async (req, res, ctx) => {
          callCount++;
          // Return same continue token to simulate infinite loop
          return res(ctx.json({
            items: [{ metadata: { uid: `profile-${callCount}`, name: `Profile ${callCount}` } }],
            listmeta: { continue: 'same-token' },
          }));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getProjectClusterProfiles('project-1');

      // Should break out of the loop after detecting duplicate token
      expect(result.length).toBeLessThanOrEqual(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Infinite pagination loop detected')
      );
    });
  });

  describe('getClusterProfile', () => {
    it('should fetch a cluster profile', async () => {
      const mockProfile = {
        metadata: { uid: 'profile-1', name: 'Test Profile' },
        spec: {
          published: {
            cloudType: 'aws',
            type: 'infra',
            packs: [{ name: 'kubernetes', tag: 'v1.28.0' }],
          },
        },
      };

      server.use(
        rest.get(`${baseUrl}/v1/clusterprofiles/profile-1`, (req, res, ctx) => {
          return res(ctx.json(mockProfile));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getClusterProfile('profile-1');

      expect(result?.metadata.name).toBe('Test Profile');
      expect(result?.spec?.published?.packs).toHaveLength(1);
    });

    it('should include ProjectUid header when provided', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/clusterprofiles/profile-1`, (req, res, ctx) => {
          expect(req.headers.get('ProjectUid')).toBe('project-1');
          return res(ctx.json({ metadata: { uid: 'profile-1', name: 'Test' } }));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      await client.getClusterProfile('profile-1', 'project-1');
    });
  });

  describe('getClientKubeConfig', () => {
    it('should fetch client kubeconfig', async () => {
      const mockKubeconfig = `
apiVersion: v1
kind: Config
clusters:
  - name: test-cluster
    cluster:
      server: https://api.test-cluster.example.com
`;

      server.use(
        rest.get(`${baseUrl}/v1/spectroclusters/cluster-1/assets/kubeconfig`, (req, res, ctx) => {
          expect(req.url.searchParams.get('frp')).toBe('true');
          return res(ctx.text(mockKubeconfig));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getClientKubeConfig('cluster-1');

      expect(result).toContain('test-cluster');
    });

    it('should include ProjectUid header and frp parameter', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/spectroclusters/cluster-1/assets/kubeconfig`, (req, res, ctx) => {
          expect(req.headers.get('ProjectUid')).toBe('project-1');
          expect(req.url.searchParams.get('frp')).toBe('false');
          return res(ctx.text('kubeconfig'));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      await client.getClientKubeConfig('cluster-1', 'project-1', false);
    });

    it('should return undefined on error', async () => {
      server.use(
        rest.get(`${baseUrl}/v1/spectroclusters/not-found/assets/kubeconfig`, (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      const client = new SpectroCloudClient({ url: baseUrl, tenant, apiToken }, mockLogger);
      const result = await client.getClientKubeConfig('not-found');

      expect(result).toBeUndefined();
    });
  });
});

