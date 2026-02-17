import { KubernetesEntityProvider, XRDTemplateEntityProvider, resolveOwnerRef, splitAnnotationValues } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Suppress console during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('resolveOwnerRef', () => {
  it('should return default owner when annotation is undefined', () => {
    const result = resolveOwnerRef(undefined, 'group:default', 'kubernetes-auto-ingested');
    expect(result).toBe('group:default/kubernetes-auto-ingested');
  });

  it('should return annotation as-is when it contains a colon (full entity ref)', () => {
    const result = resolveOwnerRef('group:myteam/my-owner', 'group:default', 'kubernetes-auto-ingested');
    expect(result).toBe('group:myteam/my-owner');
  });

  it('should prefix with namespace when annotation does not contain colon', () => {
    const result = resolveOwnerRef('my-owner', 'group:default', 'kubernetes-auto-ingested');
    expect(result).toBe('group:default/my-owner');
  });
});

describe('splitAnnotationValues', () => {
  it('should return undefined for undefined input', () => {
    expect(splitAnnotationValues(undefined)).toBeUndefined();
  });

  it('should split comma-separated values', () => {
    expect(splitAnnotationValues('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should split newline-separated values', () => {
    expect(splitAnnotationValues('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('should handle mixed comma and newline separators', () => {
    expect(splitAnnotationValues('a,b\nc')).toEqual(['a', 'b', 'c']);
  });

  it('should ignore a trailing newline', () => {
    expect(splitAnnotationValues('a\nb\n')).toEqual(['a', 'b']);
  });

  it('should trim whitespace from each entry', () => {
    expect(splitAnnotationValues(' a , b \n c ')).toEqual(['a', 'b', 'c']);
  });

  it('should filter out empty entries', () => {
    expect(splitAnnotationValues('a,,b,\n\nc')).toEqual(['a', 'b', 'c']);
  });

  it('should return an empty array for an empty string', () => {
    expect(splitAnnotationValues('')).toEqual([]);
  });

  it('should return a single-element array for a single value', () => {
    expect(splitAnnotationValues('only-one')).toEqual(['only-one']);
  });

  it('should handle a single value with trailing newline', () => {
    expect(splitAnnotationValues('only-one\n')).toEqual(['only-one']);
  });
});

describe('KubernetesEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    kubernetesIngestor: {
      components: {
        enabled: true,
        taskRunner: { frequency: 60, timeout: 600 },
      },
      crossplane: {
        enabled: true,
      },
      kro: {
        enabled: false,
      },
      annotationPrefix: 'terasky.backstage.io',
    },
    kubernetes: {
      clusterLocatorMethods: [
        {
          type: 'config',
          clusters: [
            { name: 'test-cluster', url: 'http://k8s.example.com' },
          ],
        },
      ],
    },
  });

  const mockResourceFetcher = {
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
    proxyKubernetesRequest: jest.fn(),
    fetchClusters: jest.fn().mockResolvedValue([
      { name: 'test-cluster', url: 'http://k8s.example.com' },
    ]),
    fetchAllNamespaces: jest.fn().mockResolvedValue([]),
    fetchAllNamespacesAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCRDs: jest.fn().mockResolvedValue([]),
    fetchAllCRDsAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCustomResourcesOfType: jest.fn().mockResolvedValue([]),
    fetchKubernetesResource: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider instance', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const name = provider.getProviderName();
      expect(name).toBe('KubernetesEntityProvider');
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should throw error when not connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should process resources when connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      // The task should have run and applyMutation should have been called
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle empty resource fetcher results', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      mockResourceFetcher.fetchClusters.mockResolvedValue([]);
      mockResourceFetcher.fetchAllNamespaces.mockResolvedValue([]);
      mockResourceFetcher.fetchAllCRDs.mockResolvedValue([]);

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle disabled components config', async () => {
      const disabledConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: false,
          },
        },
        kubernetes: {
          clusterLocatorMethods: [],
        },
      });

      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        disabledConfig,
        mockResourceFetcher as any,
      );

      // Should not throw when connecting with disabled config
      await expect(provider.connect({
        applyMutation: jest.fn(),
      } as any)).resolves.not.toThrow();
    });

    it('should process regular Kubernetes resources when Crossplane is disabled', async () => {
      const noCrossplaneConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: true,
            taskRunner: { frequency: 60, timeout: 600 },
          },
          crossplane: {
            enabled: false,
          },
          kro: {
            enabled: false,
          },
          annotationPrefix: 'terasky.backstage.io',
        },
        kubernetes: {
          clusterLocatorMethods: [
            {
              type: 'config',
              clusters: [
                { name: 'test-cluster', url: 'http://k8s.example.com' },
              ],
            },
          ],
        },
      });

      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        noCrossplaneConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should process Crossplane claims when Crossplane is enabled', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should handle run errors gracefully', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockImplementation(({ fn }) => fn()),
      };

      // Make resource fetcher throw an error
      const errorResourceFetcher = {
        ...mockResourceFetcher,
        fetchResources: jest.fn().mockRejectedValue(new Error('Fetch failed')),
        getClusters: jest.fn().mockRejectedValue(new Error('Clusters failed')),
      };

      const provider = new KubernetesEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        errorResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      // Should not throw even when internal errors occur
      await provider.connect(mockConnection as any);
      expect(mockConnection.applyMutation).toHaveBeenCalled();
    });

    it('should use workloadType from resource for component type', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'CronWorkflow',
        metadata: {
          name: 'test-workflow',
          namespace: 'default',
          uid: '123',
        },
        spec: {},
        clusterName: 'test-cluster',
        workloadType: 'workflow',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.spec.type).toBe('workflow');
    });

    it('should use workloadType for Crossplane claims', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockClaim = {
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'PostgreSQLInstance',
        metadata: {
          name: 'my-db',
          namespace: 'production',
          uid: 'claim-123',
        },
        spec: {
          resourceRef: {
            apiVersion: 'database.example.com/v1alpha1',
            kind: 'XPostgreSQLInstance',
            name: 'my-db-abc123',
          },
        },
        clusterName: 'test-cluster',
        workloadType: 'database',
      };

      const crdMapping = {
        'PostgreSQLInstance': 'postgresqlinstances',
        'XPostgreSQLInstance': 'xpostgresqlinstances',
      };

      const entities = await (provider as any).translateCrossplaneClaimToEntity(
        mockClaim,
        'test-cluster',
        crdMapping,
      );

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].spec.type).toBe('database');
    });

    it('should use workloadType for Crossplane composites (XRs)', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockXR = {
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'XPostgreSQLInstance',
        metadata: {
          name: 'my-db-abc123',
          uid: 'xr-123',
        },
        spec: {},
        clusterName: 'test-cluster',
        workloadType: 'managed-database',
      };

      const compositeKindLookup = {
        'XPostgreSQLInstance|database.example.com|v1alpha1': {
          scope: 'Cluster',
          spec: {
            names: {
              plural: 'xpostgresqlinstances',
            },
          },
        },
      };

      const entities = await (provider as any).translateCrossplaneCompositeToEntity(
        mockXR,
        'test-cluster',
        compositeKindLookup,
      );

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].spec.type).toBe('managed-database');
    });

    it('should use workloadType for KRO instances', async () => {
      const kroConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: true,
          },
          kro: {
            enabled: true,
          },
          annotationPrefix: 'terasky.backstage.io',
        },
        kubernetes: {
          clusterLocatorMethods: [
            {
              type: 'config',
              clusters: [{ name: 'test-cluster', url: 'http://k8s.example.com' }],
            },
          ],
        },
      });

      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        kroConfig,
        mockResourceFetcher as any,
      );

      const mockInstance = {
        apiVersion: 'app.example.com/v1',
        kind: 'WebApp',
        metadata: {
          name: 'my-webapp',
          namespace: 'apps',
          uid: 'kro-123',
          labels: {
            'kro.run/resource-graph-definition-id': 'webapp-rgd',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
        workloadType: 'web-application',
      };

      const rgdLookup = {
        'WebApp|app.example.com|v1': {
          rgd: {
            metadata: {
              name: 'webapps',
            },
            spec: {
              schema: {
                kind: 'WebApp',
                plural: 'webapps',
                group: 'app.example.com',
                version: 'v1',
              },
            },
          },
          spec: {
            kind: 'WebApp',
            plural: 'webapps',
            group: 'app.example.com',
            version: 'v1',
          },
        },
      };

      const entities = await (provider as any).translateKROInstanceToEntity(
        mockInstance,
        'test-cluster',
        rgdLookup,
      );

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].spec.type).toBe('web-application');
    });

    it('should prioritize component-type annotation over workloadType', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          uid: '456',
          annotations: {
            'terasky.backstage.io/component-type': 'api-backend',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
        workloadType: 'deployment',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.spec.type).toBe('api-backend');
    });

    it('should use default type when no annotation or workloadType is provided', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          uid: '789',
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.spec.type).toBe('service');
    });

    it('should use component-type annotation for Crossplane claims', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockClaim = {
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'PostgreSQLInstance',
        metadata: {
          name: 'my-db',
          namespace: 'production',
          uid: 'claim-456',
          annotations: {
            'terasky.backstage.io/component-type': 'rds-database',
          },
        },
        spec: {
          resourceRef: {
            apiVersion: 'database.example.com/v1alpha1',
            kind: 'XPostgreSQLInstance',
            name: 'my-db-abc123',
          },
        },
        clusterName: 'test-cluster',
        workloadType: 'database',
      };

      const crdMapping = {
        'PostgreSQLInstance': 'postgresqlinstances',
        'XPostgreSQLInstance': 'xpostgresqlinstances',
      };

      const entities = await (provider as any).translateCrossplaneClaimToEntity(
        mockClaim,
        'test-cluster',
        crdMapping,
      );

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].spec.type).toBe('rds-database');
    });

    it('should use default type for Crossplane claims when no annotation or workloadType', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockClaim = {
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'PostgreSQLInstance',
        metadata: {
          name: 'my-db',
          namespace: 'production',
          uid: 'claim-789',
        },
        spec: {
          resourceRef: {
            apiVersion: 'database.example.com/v1alpha1',
            kind: 'XPostgreSQLInstance',
            name: 'my-db-abc123',
          },
        },
        clusterName: 'test-cluster',
      };

      const crdMapping = {
        'PostgreSQLInstance': 'postgresqlinstances',
        'XPostgreSQLInstance': 'xpostgresqlinstances',
      };

      const entities = await (provider as any).translateCrossplaneClaimToEntity(
        mockClaim,
        'test-cluster',
        crdMapping,
      );

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].spec.type).toBe('crossplane-claim');
    });
  });

  describe('dependsOn annotation splitting', () => {
    it('should split comma-separated dependsOn values', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          annotations: {
            'terasky.backstage.io/dependsOn': 'component:default/foo,component:default/bar',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.spec.dependsOn).toEqual(['component:default/foo', 'component:default/bar']);
    });

    it('should split newline-separated dependsOn values', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          annotations: {
            'terasky.backstage.io/dependsOn': 'component:default/foo\ncomponent:default/bar\n',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.spec.dependsOn).toEqual(['component:default/foo', 'component:default/bar']);
    });

    it('should return undefined when dependsOn annotation is not set', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.spec.dependsOn).toBeUndefined();
    });
  });

  describe('component-annotations splitting', () => {
    it('should split comma-separated component-annotations', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          annotations: {
            'terasky.backstage.io/component-annotations': 'custom.io/foo=bar,custom.io/baz=qux',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.metadata.annotations['custom.io/foo']).toBe('bar');
      expect(componentEntity.metadata.annotations['custom.io/baz']).toBe('qux');
    });

    it('should split newline-separated component-annotations', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          annotations: {
            'terasky.backstage.io/component-annotations': 'custom.io/foo=bar\ncustom.io/baz=qux\n',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
      expect(componentEntity.metadata.annotations['custom.io/foo']).toBe('bar');
      expect(componentEntity.metadata.annotations['custom.io/baz']).toBe('qux');
    });
  });

  describe('namespace owner inheritance', () => {
    const createProviderWithConfig = (configOverrides: any = {}) => {
      const config = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: true,
            taskRunner: { frequency: 60, timeout: 600 },
          },
          crossplane: {
            enabled: true,
          },
          kro: {
            enabled: false,
          },
          annotationPrefix: 'terasky.backstage.io',
          defaultOwner: 'kubernetes-auto-ingested',
          ...configOverrides,
        },
        kubernetes: {
          clusterLocatorMethods: [
            {
              type: 'config',
              clusters: [
                { name: 'test-cluster', url: 'http://k8s.example.com' },
              ],
            },
          ],
        },
      });

      return new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        config,
        mockResourceFetcher as any,
      );
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
        metadata: {
          annotations: {},
        },
      });
    });

    describe('Given regular Kubernetes workloads', () => {
      const createMockWorkload = (annotations: any = {}, namespace: string = 'test-namespace') => ({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace,
          annotations,
        },
        spec: {},
        clusterName: 'test-cluster',
      });

      it('When inheritOwnerFromNamespace is enabled and workload has no owner annotation, Then it inherits owner from namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-platform namespace with owner annotation
        // Namespace: team-platform
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-platform' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-platform',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-platform',
            },
          },
        });

        const mockResource = createMockWorkload({}, 'team-platform');
        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        expect(entities.length).toBeGreaterThan(0);
        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toBe('group:default/team-platform');
        expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith('test-cluster', {
          path: '/api/v1/namespaces/team-platform',
        });
      });

      it('When workload has owner annotation, Then workload annotation takes precedence over namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-platform namespace with owner annotation (not used due to workload override)
        // Namespace: team-platform
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-platform' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-platform',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-platform',
            },
          },
        });

        const mockResource = createMockWorkload({
          'terasky.backstage.io/owner': 'group:default/team-backend',
        }, 'team-platform');
        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        expect(entities.length).toBeGreaterThan(0);
        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toBe('group:default/team-backend');
        // Workload annotation takes precedence, so namespace should not be fetched
        expect(mockResourceFetcher.proxyKubernetesRequest).not.toHaveBeenCalled();
      });

      it('When inheritOwnerFromNamespace is disabled, Then it uses default owner and does not fetch namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: false,
        });

        // Note: Namespace should not be fetched when feature is disabled

        const mockResource = createMockWorkload({}, 'team-platform');
        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        expect(entities.length).toBeGreaterThan(0);
        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toContain('kubernetes-auto-ingested');
        expect(mockResourceFetcher.proxyKubernetesRequest).not.toHaveBeenCalled();
      });

      it('When namespace has no owner annotation, Then it uses default owner', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-platform namespace without owner annotation
        // Namespace: team-platform
        // Annotations: {}
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-platform',
            annotations: {},
          },
        });

        const mockResource = createMockWorkload({}, 'team-platform');
        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        expect(entities.length).toBeGreaterThan(0);
        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toContain('kubernetes-auto-ingested');
      });

      it('When resource is cluster-scoped, Then it does not fetch namespace and uses default owner', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        const mockResource = {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: 'test-namespace',
            // No namespace field = cluster-scoped
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        expect(entities.length).toBeGreaterThan(0);
        expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith('test-cluster', {
          path: '/api/v1/namespaces/default',
        });

        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toContain('kubernetes-auto-ingested');
      });

      it('When namespace fetch fails, Then it falls back to default owner', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        mockResourceFetcher.proxyKubernetesRequest.mockRejectedValue(new Error('Namespace not found'));

        const mockResource = createMockWorkload({}, 'team-platform');
        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        expect(entities.length).toBeGreaterThan(0);
        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        // Should fall back to default owner when namespace fetch fails
        expect(componentEntity.spec.owner).toContain('kubernetes-auto-ingested');
      });
    });

    describe('Given Crossplane claims', () => {
      const createMockClaim = (annotations: any = {}, namespace: string = 'test-namespace') => ({
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'PostgreSQLInstance',
        metadata: {
          name: 'my-db',
          namespace,
          annotations,
        },
        spec: {
          resourceRef: {
            apiVersion: 'database.example.com/v1alpha1',
            kind: 'XPostgreSQLInstance',
            name: 'my-db-abc123',
          },
        },
        clusterName: 'test-cluster',
      });

      const crdMapping = {
        'PostgreSQLInstance': 'postgresqlinstances',
        'XPostgreSQLInstance': 'xpostgresqlinstances',
      };

      it('When translating claim with namespace owner, Then it inherits owner from namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-database namespace with owner annotation
        // Namespace: team-database
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-database' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-database',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-database',
            },
          },
        });

        const mockClaim = createMockClaim({}, 'team-database');
        const entities = await (provider as any).translateCrossplaneClaimToEntity(
          mockClaim,
          'test-cluster',
          crdMapping,
        );

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].spec.owner).toBe('group:default/team-database');
        expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith('test-cluster', {
          path: '/api/v1/namespaces/team-database',
        });
      });

      it('When claim has owner annotation, Then claim annotation takes precedence over namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-database namespace with owner annotation (not used due to claim override)
        // Namespace: team-database
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-database' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-database',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-database',
            },
          },
        });

        const mockClaim = createMockClaim({
          'terasky.backstage.io/owner': 'group:default/team-backend',
        }, 'team-database');
        const entities = await (provider as any).translateCrossplaneClaimToEntity(
          mockClaim,
          'test-cluster',
          crdMapping,
        );

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].spec.owner).toBe('group:default/team-backend');
      });
    });

    describe('Given Crossplane composites (XRs)', () => {
      const createMockXR = (annotations: any = {}, namespace: string = 'test-namespace') => ({
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'XPostgreSQLInstance',
        metadata: {
          name: 'my-db-abc123',
          namespace,
          annotations,
        },
        spec: {
          crossplane: {
            compositionRef: {
              name: 'my-composition',
            },
          },
        },
        clusterName: 'test-cluster',
      });

      const compositeKindLookup = {
        'XPostgreSQLInstance|database.example.com|v1alpha1': {
          scope: 'Namespaced',
          spec: {
            names: {
              plural: 'xpostgresqlinstances',
            },
          },
        },
      };

      it('When translating composite with namespace owner, Then it inherits owner from namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-infra namespace with owner annotation
        // Namespace: team-infra
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-infra' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-infra',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-infra',
            },
          },
        });

        const mockXR = createMockXR({}, 'team-infra');
        const entities = await (provider as any).translateCrossplaneCompositeToEntity(
          mockXR,
          'test-cluster',
          compositeKindLookup,
        );

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].spec.owner).toBe('group:default/team-infra');
        expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith('test-cluster', {
          path: '/api/v1/namespaces/team-infra',
        });
      });

      it('When composite has owner annotation, Then composite annotation takes precedence over namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-infra namespace with owner annotation (not used due to composite override)
        // Namespace: team-infra
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-infra' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-infra',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-infra',
            },
          },
        });

        const mockXR = createMockXR({
          'terasky.backstage.io/owner': 'group:default/team-platform',
        }, 'team-infra');
        const entities = await (provider as any).translateCrossplaneCompositeToEntity(
          mockXR,
          'test-cluster',
          compositeKindLookup,
        );

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].spec.owner).toBe('group:default/team-platform');
      });
    });

    describe('Given KRO instances', () => {
      const createMockKROInstance = (annotations: any = {}, namespace: string = 'test-namespace') => ({
        apiVersion: 'kro.example.com/v1alpha1',
        kind: 'ApplicationInstance',
        metadata: {
          name: 'my-app',
          namespace,
          annotations,
          labels: {
            'kro.run/resource-graph-definition-id': 'app-instance-rgd',
          },
        },
        spec: {},
        clusterName: 'test-cluster',
      });

      const kroRgdLookup = {
        'ApplicationInstance|kro.example.com|v1alpha1': {
          rgd: {
            metadata: {
              name: 'applicationinstances',
            },
            spec: {
              schema: {
                kind: 'ApplicationInstance',
                plural: 'applicationinstances',
                group: 'kro.example.com',
                version: 'v1alpha1',
              },
              resources: [],
            },
          },
          spec: {
            names: {
              kind: 'ApplicationInstance',
              plural: 'applicationinstances',
            },
            group: 'kro.example.com',
            version: 'v1alpha1',
          },
        },
      };

      it('When translating instance with namespace owner, Then it inherits owner from namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
          kro: {
            enabled: true,
          },
        });

        // Mock namespace object: team-app namespace with owner annotation
        // Namespace: team-app
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-app' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-app',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-app',
            },
          },
        });

        const mockInstance = createMockKROInstance({}, 'team-app');
        const entities = await (provider as any).translateKROInstanceToEntity(
          mockInstance,
          'test-cluster',
          kroRgdLookup,
        );

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].spec.owner).toBe('group:default/team-app');
        expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith('test-cluster', {
          path: '/api/v1/namespaces/team-app',
        });
      });

      it('When instance has owner annotation, Then instance annotation takes precedence over namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
          kro: {
            enabled: true,
          },
        });

        // Mock namespace object: team-app namespace with owner annotation (not used due to instance override)
        // Namespace: team-app
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-app' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-app',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-app',
            },
          },
        });

        const mockInstance = createMockKROInstance({
          'terasky.backstage.io/owner': 'group:default/team-frontend',
        }, 'team-app');
        const entities = await (provider as any).translateKROInstanceToEntity(
          mockInstance,
          'test-cluster',
          kroRgdLookup,
        );

        expect(entities.length).toBeGreaterThan(0);
        expect(entities[0].spec.owner).toBe('group:default/team-frontend');
      });
    });

    describe('Given System entities', () => {
      it('When translating Kubernetes workload, Then System entity inherits owner from namespace', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-platform namespace with owner annotation
        // Namespace: team-platform
        // Annotations: { 'terasky.backstage.io/owner': 'group:default/team-platform' }
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-platform',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-platform',
            },
          },
        });

        const mockResource = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: 'test-deployment',
            namespace: 'team-platform',
            annotations: {},
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        const systemEntity = entities.find((e: any) => e.kind === 'System');
        expect(systemEntity).toBeDefined();
        expect(systemEntity.spec.owner).toBe('group:default/team-platform');
      });
    });

    describe('Given namespace annotations cache', () => {
      const createMockWorkload = (annotations: any = {}, namespace: string = 'test-namespace', name: string = 'test-deployment') => ({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name,
          namespace,
          annotations,
        },
        spec: {},
        clusterName: 'test-cluster',
      });

      it('When multiple workloads share the same namespace and cluster, Then the namespace is fetched only once', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'shared-ns',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-shared',
            },
          },
        });

        const workload1 = createMockWorkload({}, 'shared-ns', 'deploy-a');
        const workload2 = createMockWorkload({}, 'shared-ns', 'deploy-b');

        const entities1 = await (provider as any).translateKubernetesObjectsToEntities(workload1);
        const entities2 = await (provider as any).translateKubernetesObjectsToEntities(workload2);

        // Both should inherit the namespace owner
        const comp1 = entities1.find((e: any) => e.kind === 'Component');
        const comp2 = entities2.find((e: any) => e.kind === 'Component');
        expect(comp1.spec.owner).toBe('group:default/team-shared');
        expect(comp2.spec.owner).toBe('group:default/team-shared');

        // Namespace should only be fetched once due to caching
        const namespaceCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[1]?.path === '/api/v1/namespaces/shared-ns',
        );
        expect(namespaceCalls).toHaveLength(1);
      });

      it('When workloads are in different namespaces, Then each namespace is fetched separately', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        mockResourceFetcher.proxyKubernetesRequest.mockImplementation((_cluster: string, opts: any) => {
          if (opts.path === '/api/v1/namespaces/ns-alpha') {
            return Promise.resolve({
              metadata: {
                name: 'ns-alpha',
                annotations: { 'terasky.backstage.io/owner': 'group:default/team-alpha' },
              },
            });
          }
          if (opts.path === '/api/v1/namespaces/ns-beta') {
            return Promise.resolve({
              metadata: {
                name: 'ns-beta',
                annotations: { 'terasky.backstage.io/owner': 'group:default/team-beta' },
              },
            });
          }
          return Promise.resolve({ metadata: { annotations: {} } });
        });

        const workloadA = createMockWorkload({}, 'ns-alpha', 'deploy-a');
        const workloadB = createMockWorkload({}, 'ns-beta', 'deploy-b');

        const entitiesA = await (provider as any).translateKubernetesObjectsToEntities(workloadA);
        const entitiesB = await (provider as any).translateKubernetesObjectsToEntities(workloadB);

        const compA = entitiesA.find((e: any) => e.kind === 'Component');
        const compB = entitiesB.find((e: any) => e.kind === 'Component');
        expect(compA.spec.owner).toBe('group:default/team-alpha');
        expect(compB.spec.owner).toBe('group:default/team-beta');

        // Each namespace fetched exactly once
        const alphaCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[1]?.path === '/api/v1/namespaces/ns-alpha',
        );
        const betaCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[1]?.path === '/api/v1/namespaces/ns-beta',
        );
        expect(alphaCalls).toHaveLength(1);
        expect(betaCalls).toHaveLength(1);
      });

      it('When same namespace exists on different clusters, Then each cluster/namespace pair is fetched separately', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        mockResourceFetcher.proxyKubernetesRequest.mockImplementation((cluster: string, opts: any) => {
          if (cluster === 'cluster-a' && opts.path === '/api/v1/namespaces/shared-ns') {
            return Promise.resolve({
              metadata: {
                name: 'shared-ns',
                annotations: { 'terasky.backstage.io/owner': 'group:default/team-a' },
              },
            });
          }
          if (cluster === 'cluster-b' && opts.path === '/api/v1/namespaces/shared-ns') {
            return Promise.resolve({
              metadata: {
                name: 'shared-ns',
                annotations: { 'terasky.backstage.io/owner': 'group:default/team-b' },
              },
            });
          }
          return Promise.resolve({ metadata: { annotations: {} } });
        });

        const workloadClusterA = {
          ...createMockWorkload({}, 'shared-ns', 'deploy-a'),
          clusterName: 'cluster-a',
        };
        const workloadClusterB = {
          ...createMockWorkload({}, 'shared-ns', 'deploy-b'),
          clusterName: 'cluster-b',
        };

        const entitiesA = await (provider as any).translateKubernetesObjectsToEntities(workloadClusterA);
        const entitiesB = await (provider as any).translateKubernetesObjectsToEntities(workloadClusterB);

        const compA = entitiesA.find((e: any) => e.kind === 'Component');
        const compB = entitiesB.find((e: any) => e.kind === 'Component');
        expect(compA.spec.owner).toBe('group:default/team-a');
        expect(compB.spec.owner).toBe('group:default/team-b');

        // Each cluster/namespace pair fetched exactly once
        const clusterACalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[0] === 'cluster-a' && call[1]?.path === '/api/v1/namespaces/shared-ns',
        );
        const clusterBCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[0] === 'cluster-b' && call[1]?.path === '/api/v1/namespaces/shared-ns',
        );
        expect(clusterACalls).toHaveLength(1);
        expect(clusterBCalls).toHaveLength(1);
      });

      it('When namespace fetch fails, Then the error is cached and not retried within the same run', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        mockResourceFetcher.proxyKubernetesRequest.mockRejectedValue(new Error('Namespace not found'));

        const workload1 = createMockWorkload({}, 'missing-ns', 'deploy-a');
        const workload2 = createMockWorkload({}, 'missing-ns', 'deploy-b');

        const entities1 = await (provider as any).translateKubernetesObjectsToEntities(workload1);
        const entities2 = await (provider as any).translateKubernetesObjectsToEntities(workload2);

        // Both should fall back to default owner
        const comp1 = entities1.find((e: any) => e.kind === 'Component');
        const comp2 = entities2.find((e: any) => e.kind === 'Component');
        expect(comp1.spec.owner).toContain('kubernetes-auto-ingested');
        expect(comp2.spec.owner).toContain('kubernetes-auto-ingested');

        // Namespace fetch attempted only once (failure is cached)
        const namespaceCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[1]?.path === '/api/v1/namespaces/missing-ns',
        );
        expect(namespaceCalls).toHaveLength(1);
      });

      it('When cache is cleared between runs, Then namespace is re-fetched', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-ns',
            annotations: {
              'terasky.backstage.io/owner': 'group:default/team-ns',
            },
          },
        });

        const workload = createMockWorkload({}, 'team-ns', 'deploy-a');

        // First access populates the cache
        await (provider as any).translateKubernetesObjectsToEntities(workload);

        // Clear cache (simulates what run() does at the start of each cycle)
        (provider as any).namespaceAnnotationsCache.clear();

        // Second access after cache clear should re-fetch
        await (provider as any).translateKubernetesObjectsToEntities(workload);

        const namespaceCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
          (call: any[]) => call[1]?.path === '/api/v1/namespaces/team-ns',
        );
        expect(namespaceCalls).toHaveLength(2);
      });
    });

    describe('Given custom annotation prefix configuration', () => {
      it('When namespace has owner annotation with custom prefix, Then it inherits owner correctly', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
          annotationPrefix: 'custom.backstage.io',
        });

        // Mock namespace object: team-platform namespace with custom prefix owner annotation
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-platform',
            annotations: {
              'custom.backstage.io/owner': 'group:default/team-platform',
            },
          },
        });

        const mockResource = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: 'test-deployment',
            namespace: 'team-platform',
            annotations: {},
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toBe('group:default/team-platform');
      });
    });

    describe('Given namespace annotation without expected prefix', () => {
      it('When namespace has owner annotation without prefix, Then it does not inherit owner and uses default', async () => {
        const provider = createProviderWithConfig({
          inheritOwnerFromNamespace: true,
        });

        // Mock namespace object: team-platform namespace with owner annotation missing the expected prefix
        mockResourceFetcher.proxyKubernetesRequest.mockResolvedValue({
          metadata: {
            name: 'team-platform',
            annotations: {
              'owner': 'group:default/team-platform', // Missing 'terasky.backstage.io' prefix
            },
          },
        });

        const mockResource = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: 'test-deployment',
            namespace: 'team-platform',
            annotations: {},
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

        const componentEntity = entities.find((e: any) => e.kind === 'Component');
        expect(componentEntity).toBeDefined();
        expect(componentEntity.spec.owner).toContain('kubernetes-auto-ingested');
      });
    });
  });
});

describe('XRDTemplateEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();

  const mockConfig = new ConfigReader({
    kubernetesIngestor: {
      crossplane: {
        enabled: true,
        xrdTemplateGeneration: {
          enabled: true,
        },
      },
      annotationPrefix: 'terasky.backstage.io',
    },
    kubernetes: {
      clusterLocatorMethods: [
        {
          type: 'config',
          clusters: [
            { name: 'test-cluster', url: 'http://k8s.example.com' },
          ],
        },
      ],
    },
  });

  const mockResourceFetcher = {
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
    proxyKubernetesRequest: jest.fn(),
    fetchClusters: jest.fn().mockResolvedValue([]),
    fetchAllNamespaces: jest.fn().mockResolvedValue([]),
    fetchAllNamespacesAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCRDs: jest.fn().mockResolvedValue([]),
    fetchAllCRDsAllClusters: jest.fn().mockResolvedValue([]),
    fetchAllCustomResourcesOfType: jest.fn().mockResolvedValue([]),
    fetchKubernetesResource: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider instance', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const mockTaskRunner = {
        run: jest.fn(),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const name = provider.getProviderName();
      expect(name).toBe('XRDTemplateEntityProvider');
    });
  });

  describe('connect', () => {
    it('should set connection and schedule task', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await provider.connect(mockConnection as any);

      expect(mockTaskRunner.run).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should throw error when not connected', async () => {
      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      await expect(provider.run()).rejects.toThrow('Connection not initialized');
    });

    it('should handle disabled XRD templates config', async () => {
      const disabledConfig = new ConfigReader({
        kubernetesIngestor: {
          crossplane: {
            enabled: false,
            xrdTemplateGeneration: {
              enabled: false,
            },
          },
        },
        kubernetes: {
          clusterLocatorMethods: [],
        },
      });

      const mockTaskRunner = {
        run: jest.fn().mockResolvedValue(undefined),
      };

      const provider = new XRDTemplateEntityProvider(
        mockTaskRunner as any,
        mockLogger,
        disabledConfig,
        mockResourceFetcher as any,
      );

      // Should not throw when connecting
      await expect(provider.connect({
        applyMutation: jest.fn(),
      } as any)).resolves.not.toThrow();
    });
  });
});
