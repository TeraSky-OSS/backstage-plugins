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
    it('should fetch KRO resources', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/kro.run/v1alpha1/resourcegraphdefinitions/test-rgd', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'kro.run/v1alpha1',
            kind: 'ResourceGraphDefinition',
            metadata: { name: 'test-rgd' },
            spec: {
              resources: [
                {
                  id: 'deployment',
                  template: {
                    apiVersion: 'apps/v1',
                    kind: 'Deployment',
                    metadata: { name: 'test-deployment' },
                  },
                },
              ],
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/apiextensions.k8s.io/v1/customresourcedefinitions/tests.kro.run', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'apiextensions.k8s.io/v1',
            kind: 'CustomResourceDefinition',
            metadata: { name: 'tests.kro.run' },
            spec: {
              group: 'kro.run',
              names: { plural: 'tests' },
              versions: [{ name: 'v1alpha1', served: true, storage: true }],
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/kro.run/v1alpha1/namespaces/default/tests/test-entity', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'kro.run/v1alpha1',
            kind: 'Test',
            metadata: {
              name: 'test-entity',
              namespace: 'default',
              uid: 'instance-123',
              creationTimestamp: '2024-01-01T00:00:00Z',
            },
            spec: { name: 'test' },
            status: {
              conditions: [
                { type: 'InstanceSynced', status: 'True' },
              ],
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/apps/v1/namespaces/default/deployments', (req, res, ctx) => {
          return res(ctx.json({ items: [] }));
        }),
      );

      const result = await service.getResources(
        'test-cluster',
        'default',
        'test-rgd',
        'rgd-123',
        'instance-123',
        'test-entity',
        'tests.kro.run',
      );

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('Instance');
      expect(result.supportingResources).toHaveLength(2);
    });

    it('should throw error on failed request', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/*', (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      await expect(
        service.getResources(
          'test-cluster',
          'default',
          'test-rgd',
          'rgd-123',
          'instance-123',
          'test-entity',
          'tests.kro.run',
        )
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

      const result = await service.getEvents(
        'test-cluster',
        'default',
        'my-pod',
        'Pod',
      );

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe('Created');
    });

    it('should throw error on failed request', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/*', (req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        service.getEvents('test-cluster', 'default', 'my-pod', 'Pod')
      ).rejects.toThrow();
    });
  });

  describe('getResourceGraph', () => {
    it('should fetch resource graph', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/kro.run/v1alpha1/resourcegraphdefinitions/test-rgd', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'kro.run/v1alpha1',
            kind: 'ResourceGraphDefinition',
            metadata: { name: 'test-rgd' },
            spec: {
              group: 'kro.run',
              names: { plural: 'tests' },
              resources: [],
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/apiextensions.k8s.io/v1/customresourcedefinitions/tests.kro.run', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'apiextensions.k8s.io/v1',
            kind: 'CustomResourceDefinition',
            metadata: { name: 'tests.kro.run' },
            spec: {
              group: 'kro.run',
              names: { plural: 'tests' },
              versions: [{ name: 'v1alpha1', served: true, storage: true }],
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/kro.run/v1alpha1/namespaces/default/tests/test-entity', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'kro.run/v1alpha1',
            kind: 'Test',
            metadata: {
              name: 'test-entity',
              namespace: 'default',
            },
            spec: { name: 'test' },
          }));
        }),
      );

      const result = await service.getResourceGraph(
        'test-cluster',
        'default',
        'test-rgd',
        'rgd-123',
        'instance-123',
        'test-entity',
      );

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getPluralKind', () => {
    it('should handle special plural forms', () => {
      // Access private method via any
      const getPluralKind = (service as any).getPluralKind.bind(service);
      
      expect(getPluralKind('Ingress')).toBe('ingresses');
      expect(getPluralKind('Proxy')).toBe('proxies');
      expect(getPluralKind('Index')).toBe('indices');
      expect(getPluralKind('Matrix')).toBe('matrices');
      expect(getPluralKind('Vertex')).toBe('vertices');
      expect(getPluralKind('Pod')).toBe('pods');
      expect(getPluralKind('Deployment')).toBe('deployments');
    });
  });

  describe('getApiGroup', () => {
    it('should extract API group from apiVersion', () => {
      // Access private method via any
      const getApiGroup = (service as any).getApiGroup.bind(service);
      
      expect(getApiGroup('apps/v1')).toBe('apps');
      expect(getApiGroup('networking.k8s.io/v1')).toBe('networking.k8s.io');
      expect(getApiGroup('v1')).toBe('core');
      expect(getApiGroup(undefined)).toBe('Unknown');
    });
  });
});

