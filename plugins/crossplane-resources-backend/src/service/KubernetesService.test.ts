import { KubernetesService } from './KubernetesService';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('KubernetesService', () => {
  const mockLogger = mockServices.logger.mock();
  const mockDiscovery = mockServices.discovery.mock();
  const mockAuth = mockServices.auth.mock();

  let service: KubernetesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://kubernetes-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });

    service = new KubernetesService(mockLogger, mockDiscovery, mockAuth);
  });

  describe('getResources', () => {
    it('should fetch claim resources', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1/namespaces/default/testclaims/my-claim', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1',
            kind: 'TestClaim',
            metadata: {
              name: 'my-claim',
              namespace: 'default',
              uid: 'claim-uid-123',
              creationTimestamp: '2024-01-01T00:00:00Z',
            },
            status: {
              conditions: [
                { type: 'Ready', status: 'True' },
                { type: 'Synced', status: 'True' },
              ],
            },
          }));
        }),
      );

      const result = await service.getResources({
        clusterName: 'test-cluster',
        namespace: 'default',
        group: 'test.example.com',
        version: 'v1',
        plural: 'testclaims',
        name: 'my-claim',
      });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('Claim');
      expect(result.resources[0].name).toBe('my-claim');
    });

    it('should handle cluster-scoped resources', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1/testresources/my-resource', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1',
            kind: 'TestResource',
            metadata: {
              name: 'my-resource',
              uid: 'resource-uid-123',
              creationTimestamp: '2024-01-01T00:00:00Z',
            },
            status: {
              conditions: [],
            },
          }));
        }),
      );

      const result = await service.getResources({
        clusterName: 'test-cluster',
        group: 'test.example.com',
        version: 'v1',
        plural: 'testresources',
        name: 'my-resource',
      });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('Resource');
    });

    it('should handle core API group resources', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/api/v1/namespaces/default/pods/my-pod', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
              name: 'my-pod',
              namespace: 'default',
              uid: 'pod-uid-123',
              creationTimestamp: '2024-01-01T00:00:00Z',
            },
            status: {
              conditions: [],
            },
          }));
        }),
      );

      const result = await service.getResources({
        clusterName: 'test-cluster',
        namespace: 'default',
        version: 'v1',
        plural: 'pods',
        name: 'my-pod',
      });

      expect(result.resources).toHaveLength(1);
    });

    it('should throw error on failed request', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/*', (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      await expect(
        service.getResources({
          clusterName: 'test-cluster',
          namespace: 'default',
          group: 'test.example.com',
          version: 'v1',
          plural: 'testclaims',
          name: 'non-existent',
        })
      ).rejects.toThrow('Failed to fetch Kubernetes resources');
    });
  });

  describe('getEvents', () => {
    it('should fetch events for a resource', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/api/v1/namespaces/default/events', (req, res, ctx) => {
          return res(ctx.json({
            items: [
              {
                metadata: { name: 'event-1', namespace: 'default' },
                involvedObject: { kind: 'Pod', name: 'my-pod' },
                reason: 'Created',
                message: 'Pod created',
                type: 'Normal',
              },
            ],
          }));
        }),
      );

      const result = await service.getEvents({
        clusterName: 'test-cluster',
        namespace: 'default',
        resourceName: 'my-pod',
        resourceKind: 'Pod',
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].reason).toBe('Created');
    });

    it('should return empty events array on error', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/*', (req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        service.getEvents({
          clusterName: 'test-cluster',
          namespace: 'default',
          resourceName: 'my-pod',
          resourceKind: 'Pod',
        })
      ).rejects.toThrow();
    });
  });

  describe('getResourceGraph', () => {
    it('should fetch resource graph for claim', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1/namespaces/default/testclaims/my-claim', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1',
            kind: 'TestClaim',
            metadata: {
              name: 'my-claim',
              namespace: 'default',
            },
            status: {
              compositeResourceRef: {
                apiVersion: 'composite.example.com/v1',
                kind: 'XComposite',
                name: 'my-composite',
              },
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/composite.example.com/v1/xcomposites/my-composite', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'composite.example.com/v1',
            kind: 'XComposite',
            metadata: {
              name: 'my-composite',
            },
            status: {
              resourceRefs: [],
            },
          }));
        }),
      );

      const result = await service.getResourceGraph({
        clusterName: 'test-cluster',
        namespace: 'default',
        claimName: 'my-claim',
        claimGroup: 'test.example.com',
        claimVersion: 'v1',
        claimPlural: 'testclaims',
      });

      expect(result.resources).toHaveLength(2);
    });
  });

  describe('getV2ResourceGraph', () => {
    it('should fetch V2 resource graph', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1/namespaces/default/composites/my-composite', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1',
            kind: 'Composite',
            metadata: {
              name: 'my-composite',
              namespace: 'default',
            },
            spec: {
              crossplane: {
                resourceRefs: [],
              },
            },
          }));
        }),
      );

      const result = await service.getV2ResourceGraph({
        clusterName: 'test-cluster',
        namespace: 'default',
        name: 'my-composite',
        group: 'test.example.com',
        version: 'v1',
        plural: 'composites',
        scope: 'Namespaced',
      });

      expect(result.resources).toHaveLength(1);
    });

    it('should fetch cluster-scoped V2 resources', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1/composites/my-composite', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1',
            kind: 'Composite',
            metadata: {
              name: 'my-composite',
            },
            spec: {
              crossplane: {
                resourceRefs: [],
              },
            },
          }));
        }),
      );

      const result = await service.getV2ResourceGraph({
        clusterName: 'test-cluster',
        namespace: 'default',
        name: 'my-composite',
        group: 'test.example.com',
        version: 'v1',
        plural: 'composites',
        scope: 'Cluster',
      });

      expect(result.resources).toHaveLength(1);
    });
  });
});

