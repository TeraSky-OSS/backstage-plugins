import { KubernetesResourceFetcher } from './KubernetesResourceFetcher';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('KubernetesResourceFetcher', () => {
  const mockLogger = mockServices.logger.mock();
  const mockDiscovery = mockServices.discovery.mock();
  const mockAuth = mockServices.auth.mock();

  let fetcher: KubernetesResourceFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://kubernetes-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });

    fetcher = new KubernetesResourceFetcher(
      mockLogger,
      mockDiscovery,
      mockAuth,
    );
  });

  describe('fetchResource', () => {
    it('should fetch a kubernetes resource', async () => {
      const mockResource = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: { name: 'test-pod', namespace: 'default' },
      };

      server.use(
        rest.get('http://kubernetes-backend/proxy/api/v1/namespaces/default/pods/test-pod', (req, res, ctx) => {
          return res(ctx.json(mockResource));
        }),
      );

      const result = await fetcher.fetchResource(
        'test-cluster',
        '/api/v1/namespaces/default/pods/test-pod'
      );

      expect(result).toEqual(mockResource);
    });

    it('should throw error on failed fetch', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/*', (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      await expect(
        fetcher.fetchResource('test-cluster', '/api/v1/namespaces/default/pods/not-found')
      ).rejects.toThrow();
    });
  });

  describe('listResources', () => {
    it('should list kubernetes resources', async () => {
      const mockList = {
        apiVersion: 'v1',
        kind: 'PodList',
        items: [
          { metadata: { name: 'pod-1' } },
          { metadata: { name: 'pod-2' } },
        ],
      };

      server.use(
        rest.get('http://kubernetes-backend/proxy/api/v1/namespaces/default/pods', (req, res, ctx) => {
          return res(ctx.json(mockList));
        }),
      );

      const result = await fetcher.listResources(
        'test-cluster',
        '/api/v1/namespaces/default/pods'
      );

      expect(result.items).toHaveLength(2);
    });
  });
});

