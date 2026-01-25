import { KubernetesService } from './KubernetesService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
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
  const mockConfig = new ConfigReader({});

  let service: KubernetesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://kubernetes-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });

    service = new KubernetesService(mockLogger, mockDiscovery, mockAuth, mockConfig);
  });

  describe('getPolicyReports', () => {
    it('should fetch policy reports for entity workloads', async () => {
      server.use(
        rest.post('http://kubernetes-backend/services/test-entity', (req, res, ctx) => {
          return res(ctx.json({
            items: [
              {
                cluster: { name: 'test-cluster' },
                resources: [
                  {
                    resources: [
                      {
                        metadata: {
                          uid: 'pod-uid-123',
                          namespace: 'default',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/wgpolicyk8s.io/v1alpha2/namespaces/default/policyreports/pod-uid-123', (req, res, ctx) => {
          return res(ctx.json({
            metadata: { uid: 'report-123', namespace: 'default' },
            scope: { kind: 'Pod', name: 'test-pod' },
            summary: { error: 0, fail: 1, pass: 5, skip: 0, warn: 0 },
            results: [],
          }));
        }),
      );

      const result = await service.getPolicyReports({
        entity: {
          metadata: { name: 'test-entity', namespace: 'default' },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].clusterName).toBe('test-cluster');
    });

    it('should handle missing metadata gracefully', async () => {
      server.use(
        rest.post('http://kubernetes-backend/services/test-entity', (req, res, ctx) => {
          return res(ctx.json({
            items: [
              {
                cluster: { name: 'test-cluster' },
                resources: [
                  {
                    resources: [
                      {
                        metadata: {},
                      },
                    ],
                  },
                ],
              },
            ],
          }));
        }),
      );

      const result = await service.getPolicyReports({
        entity: {
          metadata: { name: 'test-entity', namespace: 'default' },
        },
      });

      expect(result).toHaveLength(0);
    });

    it('should throw error when workloads fetch fails', async () => {
      server.use(
        rest.post('http://kubernetes-backend/services/test-entity', (req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        service.getPolicyReports({
          entity: {
            metadata: { name: 'test-entity', namespace: 'default' },
          },
        })
      ).rejects.toThrow('Failed to fetch workloads');
    });
  });

  describe('getPolicy', () => {
    it('should fetch cluster policy', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/kyverno.io/v1/clusterpolicies/test-policy', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'kyverno.io/v1',
            kind: 'ClusterPolicy',
            metadata: { name: 'test-policy' },
            spec: { rules: [] },
          }));
        }),
      );

      const result = await service.getPolicy('test-cluster', undefined, 'test-policy');

      expect(result.kind).toBe('ClusterPolicy');
      expect(result.metadata.name).toBe('test-policy');
    });

    it('should fetch namespaced policy when cluster policy not found', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/kyverno.io/v1/clusterpolicies/test-policy', (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/kyverno.io/v1/namespaces/default/policies/test-policy', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'kyverno.io/v1',
            kind: 'Policy',
            metadata: { name: 'test-policy', namespace: 'default' },
            spec: { rules: [] },
          }));
        }),
      );

      const result = await service.getPolicy('test-cluster', 'default', 'test-policy');

      expect(result.kind).toBe('Policy');
      expect(result.metadata.namespace).toBe('default');
    });

    it('should throw error when policy not found', async () => {
      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/kyverno.io/v1/clusterpolicies/non-existent', (req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Not Found'));
        }),
      );

      await expect(
        service.getPolicy('test-cluster', undefined, 'non-existent')
      ).rejects.toThrow();
    });
  });

  describe('getCrossplanePolicyReports', () => {
    it('should fetch policy reports for v1 crossplane resources', async () => {
      const entity = {
        metadata: {
          name: 'test-entity',
          annotations: {
            'backstage.io/managed-by-location': 'cluster: test-cluster',
            'backstage.io/kubernetes-label-selector': 'crossplane.io/claim-namespace=default',
            'terasky.backstage.io/crossplane-version': 'v1',
            'terasky.backstage.io/claim-plural': 'testclaims',
            'terasky.backstage.io/claim-group': 'test.example.com',
            'terasky.backstage.io/claim-version': 'v1alpha1',
            'terasky.backstage.io/claim-name': 'my-claim',
          },
        },
      };

      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1alpha1/namespaces/default/testclaims/my-claim', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1alpha1',
            kind: 'TestClaim',
            metadata: {
              name: 'my-claim',
              namespace: 'default',
              uid: 'claim-uid-123',
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/wgpolicyk8s.io/v1alpha2/namespaces/default/policyreports/claim-uid-123', (req, res, ctx) => {
          return res(ctx.json({
            metadata: { uid: 'report-123', namespace: 'default' },
            scope: { kind: 'TestClaim', name: 'my-claim' },
            summary: { error: 0, fail: 0, pass: 3, skip: 0, warn: 0 },
          }));
        }),
      );

      const result = await service.getCrossplanePolicyReports({ entity });

      expect(result).toHaveLength(1);
      expect(result[0].clusterName).toBe('test-cluster');
    });

    it('should fetch policy reports for v2 namespaced composite', async () => {
      const entity = {
        metadata: {
          name: 'test-entity',
          annotations: {
            'backstage.io/managed-by-location': 'cluster: test-cluster',
            'backstage.io/kubernetes-label-selector': 'crossplane.io/composite-namespace=default',
            'terasky.backstage.io/crossplane-version': 'v2',
            'terasky.backstage.io/composite-plural': 'composites',
            'terasky.backstage.io/composite-group': 'test.example.com',
            'terasky.backstage.io/composite-version': 'v1alpha1',
            'terasky.backstage.io/composite-name': 'my-composite',
            'terasky.backstage.io/crossplane-scope': 'Namespaced',
          },
        },
      };

      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1alpha1/namespaces/default/composites/my-composite', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1alpha1',
            kind: 'Composite',
            metadata: {
              name: 'my-composite',
              namespace: 'default',
              uid: 'composite-uid-123',
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/wgpolicyk8s.io/v1alpha2/namespaces/default/policyreports/composite-uid-123', (req, res, ctx) => {
          return res(ctx.json({
            metadata: { uid: 'report-123', namespace: 'default' },
            scope: { kind: 'Composite', name: 'my-composite' },
            summary: { error: 0, fail: 0, pass: 5, skip: 0, warn: 0 },
          }));
        }),
      );

      const result = await service.getCrossplanePolicyReports({ entity });

      expect(result).toHaveLength(1);
    });

    it('should fetch cluster-scoped policy reports', async () => {
      const entity = {
        metadata: {
          name: 'test-entity',
          annotations: {
            'backstage.io/managed-by-location': 'cluster: test-cluster',
            'terasky.backstage.io/crossplane-version': 'v2',
            'terasky.backstage.io/composite-plural': 'composites',
            'terasky.backstage.io/composite-group': 'test.example.com',
            'terasky.backstage.io/composite-version': 'v1alpha1',
            'terasky.backstage.io/composite-name': 'my-composite',
            'terasky.backstage.io/crossplane-scope': 'Cluster',
          },
        },
      };

      server.use(
        rest.get('http://kubernetes-backend/proxy/apis/test.example.com/v1alpha1/composites/my-composite', (req, res, ctx) => {
          return res(ctx.json({
            apiVersion: 'test.example.com/v1alpha1',
            kind: 'Composite',
            metadata: {
              name: 'my-composite',
              uid: 'composite-uid-123',
            },
          }));
        }),
        rest.get('http://kubernetes-backend/proxy/apis/wgpolicyk8s.io/v1alpha2/clusterpolicyreports/composite-uid-123', (req, res, ctx) => {
          return res(ctx.json({
            metadata: { uid: 'report-123' },
            scope: { kind: 'Composite', name: 'my-composite' },
            summary: { error: 0, fail: 0, pass: 5, skip: 0, warn: 0 },
          }));
        }),
      );

      const result = await service.getCrossplanePolicyReports({ entity });

      expect(result).toHaveLength(1);
    });

    it('should throw error when cluster annotation is missing', async () => {
      const entity = {
        metadata: {
          name: 'test-entity',
          annotations: {},
        },
      };

      await expect(
        service.getCrossplanePolicyReports({ entity })
      ).rejects.toThrow('Missing cluster annotation');
    });
  });

  describe('getAnnotation', () => {
    it('should use custom annotation prefix from config', () => {
      const customConfig = new ConfigReader({
        kubernetesIngestor: {
          annotationPrefix: 'custom.example.com',
        },
      });

      const customService = new KubernetesService(
        mockLogger,
        mockDiscovery,
        mockAuth,
        customConfig,
      );

      // Access private method via any
      const getAnnotation = (customService as any).getAnnotation.bind(customService);
      
      const annotations = {
        'custom.example.com/test-key': 'custom-value',
        'terasky.backstage.io/test-key': 'default-value',
      };

      expect(getAnnotation(annotations, 'test-key')).toBe('custom-value');
    });

    it('should fall back to default prefix', () => {
      // Access private method via any
      const getAnnotation = (service as any).getAnnotation.bind(service);
      
      const annotations = {
        'terasky.backstage.io/test-key': 'default-value',
      };

      expect(getAnnotation(annotations, 'test-key')).toBe('default-value');
    });
  });
});

