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
        'database.example.com|PostgreSQLInstance': 'postgresqlinstances',
        'database.example.com|XPostgreSQLInstance': 'xpostgresqlinstances',
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

    it('should ingest as Resource when per-workload-type ingestAsResources is true', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: 'my-app-ingress',
          namespace: 'default',
          uid: 'ingest-res-1',
        },
        spec: {},
        clusterName: 'test-cluster',
        workloadType: 'ingress',
        ingestAsResources: true,
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      const resourceEntity = entities.find((e: any) => e.kind === 'Resource');
      expect(resourceEntity).toBeDefined();
      expect(resourceEntity.spec.type).toBe('ingress');
    });

    it('should ingest as Component when per-workload-type ingestAsResources is false even if global is true', async () => {
      const globalResourceConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: true,
            ingestAsResources: true,
            taskRunner: { frequency: 60, timeout: 600 },
          },
          crossplane: { enabled: true },
          kro: { enabled: false },
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
        globalResourceConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: 'my-app-ingress',
          namespace: 'default',
          uid: 'ingest-res-2',
        },
        spec: {},
        clusterName: 'test-cluster',
        workloadType: 'ingress',
        ingestAsResources: false,
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeDefined();
    });

    it('should fall back to global ingestAsResources when per-workload-type is not set', async () => {
      const globalResourceConfig = new ConfigReader({
        kubernetesIngestor: {
          components: {
            enabled: true,
            ingestAsResources: true,
            taskRunner: { frequency: 60, timeout: 600 },
          },
          crossplane: { enabled: true },
          kro: { enabled: false },
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
        globalResourceConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          uid: 'ingest-res-3',
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      const resourceEntity = entities.find((e: any) => e.kind === 'Resource');
      expect(resourceEntity).toBeDefined();
      const componentEntity = entities.find((e: any) => e.kind === 'Component');
      expect(componentEntity).toBeUndefined();
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
        'database.example.com|PostgreSQLInstance': 'postgresqlinstances',
        'database.example.com|XPostgreSQLInstance': 'xpostgresqlinstances',
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
        'database.example.com|PostgreSQLInstance': 'postgresqlinstances',
        'database.example.com|XPostgreSQLInstance': 'xpostgresqlinstances',
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
        'database.example.com|PostgreSQLInstance': 'postgresqlinstances',
        'database.example.com|XPostgreSQLInstance': 'xpostgresqlinstances',
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

    describe('custom backstage tags', () => {
      it('extracts backstage-tag annotations for regular k8s resources', async () => {
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
              // include a couple of entries that sanitize to empty keys/values and should be ignored
            'terasky.backstage.io/backstage-tags':
              'team:Platform\n' +   // valid entry with uppercase and special char in value to test sanitization
              'Env:Prod-1\n' +      // keys and values should be sanitized to lowercase and special chars replaced with dashes
              'DotEnv:Dev.1\n' +    // value with dot should be sanitized to "dotenv:dev-1"
              '!!!:shouldDrop\n' +  // key "!!!" becomes empty after sanitize
              'badkey:!!!\n',       // value "!!!" becomes empty after sanitize
            },
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
        const comp = entities.find((e: any) => e.kind === 'Component');
        expect(comp).toBeDefined();
        expect(comp.metadata.tags).toEqual(
          expect.arrayContaining(['team:platform', 'env:prod-1', 'dotenv:dev-1']),
        );
        // the malformed entries should have been dropped completely
        expect(comp.metadata.tags).not.toEqual(
          expect.arrayContaining(['shoulddrop', 'badkey:']),
        );
      });

      it('extracts backstage-tag annotations for Crossplane claims', async () => {
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
            annotations: {
              'terasky.backstage.io/backstage-tags': 'owner:DBTeam',
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
        };

        const crdMapping = {
          'database.example.com|PostgreSQLInstance': 'postgresqlinstances',
          'database.example.com|XPostgreSQLInstance': 'xpostgresqlinstances',
        };

        const entities = await (provider as any).translateCrossplaneClaimToEntity(
          mockClaim,
          'test-cluster',
          crdMapping,
        );
        const comp = entities[0];
        expect(comp).toBeDefined();
        expect(comp.metadata.tags).toEqual(expect.arrayContaining(['owner:dbteam']));
      });

      it('extracts backstage-tag annotations for Crossplane XRs', async () => {
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
            annotations: {
              'terasky.backstage.io/backstage-tags': 'tier:gold',
            },
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const compositeKindLookup = {
          'XPostgreSQLInstance|database.example.com|v1alpha1': {
            scope: 'Cluster',
            spec: { names: { plural: 'xpostgresqlinstances' } },
          },
        };

        const entities = await (provider as any).translateCrossplaneCompositeToEntity(
          mockXR,
          'test-cluster',
          compositeKindLookup,
        );
        const comp = entities[0];
        expect(comp).toBeDefined();
        expect(comp.metadata.tags).toEqual(expect.arrayContaining(['tier:gold']));
      });

      it('extracts backstage-tag annotations for KRO instances', async () => {
        const kroConfig = new ConfigReader({
          kubernetesIngestor: {
            components: { enabled: true },
            kro: { enabled: true },
            annotationPrefix: 'terasky.backstage.io',
          },
          kubernetes: {
            clusterLocatorMethods: [
              { type: 'config', clusters: [{ name: 'test-cluster', url: 'http://k8s.example.com' }] },
            ],
          },
        });

        const provider = new KubernetesEntityProvider(
          { run: jest.fn() } as any,
          mockLogger,
          kroConfig,
          mockResourceFetcher as any,
        );

        const instance = {
          apiVersion: 'app.example.com/v1',
          kind: 'WebApp',
          metadata: {
            name: 'app1',
            namespace: 'apps',
            uid: 'k1',
            labels: { 'kro.run/resource-graph-definition-id': 'webapp-rgd' },
            annotations: { 'terasky.backstage.io/backstage-tags': 'zone:eu-west' },
          },
          spec: {},
          clusterName: 'test-cluster',
        };

        const rgd = {
          'WebApp|app.example.com|v1': {
            rgd: { metadata: { name: 'webapps' }, spec: { names: { kind: 'WebApp', plural: 'webapps' }, resources: [] } },
            spec: { names: { kind: 'WebApp', plural: 'webapps' }, group: 'app.example.com', version: 'v1' },
          },
        };

        const entities = await (provider as any).translateKROInstanceToEntity(instance, 'test-cluster', rgd);
        const comp = entities[0];
        expect(comp).toBeDefined();
        expect(comp.metadata.tags).toEqual(expect.arrayContaining(['zone:eu-west']));
      });
    });
  });

  describe('links parsing', () => {
    it('should parse links including the type field', async () => {
      const customConfig = new ConfigReader({
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
          annotationPrefix: 'custom.backstage.io',
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

      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        customConfig,
        mockResourceFetcher as any,
      );

      const mockResource = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: 'test-service',
          namespace: 'default',
          annotations: {
            'custom.backstage.io/links': JSON.stringify([
              {
                url: 'https://example.com',
                title: 'Example',
                icon: 'dashboard',
                type: 'admin-dashboard',
              },
            ]),
          },
        },
        spec: {},
        clusterName: 'test-cluster',
      };

      const entities = await (provider as any).translateKubernetesObjectsToEntities(mockResource);
      const componentEntity = entities.find((e: any) => e.kind === 'Component');

      expect(componentEntity).toBeDefined();
      expect(componentEntity.metadata.links).toBeDefined();
      expect(componentEntity.metadata.links).toHaveLength(1);
      expect(componentEntity.metadata.links[0]).toEqual({
        url: 'https://example.com',
        title: 'Example',
        icon: 'dashboard',
        type: 'admin-dashboard',
      });
    });
  });

  describe('deltaUpdate', () => {
    it('should throw error when not connected', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      await expect(provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      })).rejects.toThrow('Connection not initialized');
    });

    it('should perform delta upsert for a regular K8s resource', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      // Mock the proxy request to return a full resource
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          uid: 'delta-123',
        },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      // Find the delta mutation call (not the full mutation from connect)
      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);
      expect(deltaCalls[0][0].type).toBe('delta');
      expect(deltaCalls[0][0].added.length).toBeGreaterThan(0);
      expect(deltaCalls[0][0].removed).toEqual([]);
    });

    it('should perform delta delete for a regular K8s resource', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      await provider.deltaUpdate({
        action: 'delete',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);
      expect(deltaCalls[0][0].type).toBe('delta');
      expect(deltaCalls[0][0].added).toEqual([]);
      expect(deltaCalls[0][0].removed.length).toBeGreaterThan(0);
    });

    it('should handle resource fetch failure gracefully on upsert', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      mockResourceFetcher.proxyKubernetesRequest.mockRejectedValueOnce(new Error('Not found'));

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'missing-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      // Should not have called applyMutation with delta (only the full from connect)
      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(0);
    });

    it('should construct correct API path for namespaced resources', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'my-app', namespace: 'production' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'my-app',
        namespace: 'production',
        clusterName: 'test-cluster',
      });

      // Verify the proxy was called with the correct path
      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
        (call: any[]) => call[1]?.path?.includes('deployments'),
      );
      expect(proxyCalls).toHaveLength(1);
      expect(proxyCalls[0][0]).toBe('test-cluster');
      expect(proxyCalls[0][1].path).toBe('/apis/apps/v1/namespaces/production/deployments/my-app');
    });

    it('should construct correct API path for core API resources', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'my-service', namespace: 'default' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'v1',
        kind: 'Service',
        name: 'my-service',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls.filter(
        (call: any[]) => call[1]?.path?.includes('services'),
      );
      expect(proxyCalls).toHaveLength(1);
      expect(proxyCalls[0][1].path).toBe('/api/v1/namespaces/default/services/my-service');
    });

    it('should not fetch resource from cluster on delete', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;
      mockResourceFetcher.proxyKubernetesRequest.mockClear();

      await provider.deltaUpdate({
        action: 'delete',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'deleted-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      // proxyKubernetesRequest should NOT be called for deletes
      expect(mockResourceFetcher.proxyKubernetesRequest).not.toHaveBeenCalled();

      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);
      expect(deltaCalls[0][0].removed.length).toBeGreaterThan(0);
    });

    it('should filter out System entities from delta delete removals', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      await provider.deltaUpdate({
        action: 'delete',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);

      const removed = deltaCalls[0][0].removed;
      // Should have removed entities but none of them should be System kind
      expect(removed.length).toBeGreaterThan(0);
      const systemEntities = removed.filter((e: any) => e.entity.kind === 'System');
      expect(systemEntities).toHaveLength(0);
    });

    it('should include System entities in delta upsert additions', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test-deployment',
          namespace: 'default',
          uid: 'uid-123',
        },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test-deployment',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);

      const added = deltaCalls[0][0].added;
      // Upserts should include System entities (unlike deletes)
      const systemEntities = added.filter((e: any) => e.entity.kind === 'System');
      expect(systemEntities.length).toBeGreaterThan(0);
    });

    it('should use cachedCrdMapping with composite group|kind key for API path', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      // Populate cachedCrdMapping with a custom plural for a CRD kind
      (provider as any).cachedCrdMapping = {
        'example.io|Widget': 'widgets',
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'example.io/v1',
        kind: 'Widget',
        metadata: { name: 'my-widget', namespace: 'default' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'example.io/v1',
        kind: 'Widget',
        name: 'my-widget',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls;
      expect(proxyCalls).toHaveLength(1);
      expect(proxyCalls[0][1].path).toBe('/apis/example.io/v1/namespaces/default/widgets/my-widget');
    });

    it('should not collide when same Kind exists in different API groups', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      // Two different groups both define a "Policy" kind with different plurals
      (provider as any).cachedCrdMapping = {
        'security.io|Policy': 'securitypolicies',
        'networking.io|Policy': 'networkpolicies',
      };

      // First call: security.io/v1 Policy
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'security.io/v1',
        kind: 'Policy',
        metadata: { name: 'sec-policy', namespace: 'default' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'security.io/v1',
        kind: 'Policy',
        name: 'sec-policy',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      // Second call: networking.io/v1 Policy
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'networking.io/v1',
        kind: 'Policy',
        metadata: { name: 'net-policy', namespace: 'default' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'networking.io/v1',
        kind: 'Policy',
        name: 'net-policy',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls;
      expect(proxyCalls).toHaveLength(2);
      expect(proxyCalls[0][1].path).toBe('/apis/security.io/v1/namespaces/default/securitypolicies/sec-policy');
      expect(proxyCalls[1][1].path).toBe('/apis/networking.io/v1/namespaces/default/networkpolicies/net-policy');
    });

    it('should fall back to pluralize when kind is not in cachedCrdMapping', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;
      (provider as any).cachedCrdMapping = {}; // empty mapping

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'custom.io/v1beta1',
        kind: 'Gadget',
        metadata: { name: 'my-gadget', namespace: 'tools' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'custom.io/v1beta1',
        kind: 'Gadget',
        name: 'my-gadget',
        namespace: 'tools',
        clusterName: 'test-cluster',
      });

      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls;
      expect(proxyCalls).toHaveLength(1);
      // pluralize('Gadget') => 'gadgets'
      expect(proxyCalls[0][1].path).toBe('/apis/custom.io/v1beta1/namespaces/tools/gadgets/my-gadget');
    });

    it('should use correct plural for CRD-mapped kind and fallback for unmapped kind in same group', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      // Only Mouse is mapped, Goose is not
      (provider as any).cachedCrdMapping = {
        'animals.io|Mouse': 'mice',
      };

      // Mouse uses CRD mapping
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'animals.io/v1',
        kind: 'Mouse',
        metadata: { name: 'jerry', namespace: 'default' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'animals.io/v1',
        kind: 'Mouse',
        name: 'jerry',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      // Goose falls back to pluralize
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'animals.io/v1',
        kind: 'Goose',
        metadata: { name: 'honk', namespace: 'default' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'animals.io/v1',
        kind: 'Goose',
        name: 'honk',
        namespace: 'default',
        clusterName: 'test-cluster',
      });

      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls;
      expect(proxyCalls).toHaveLength(2);
      expect(proxyCalls[0][1].path).toBe('/apis/animals.io/v1/namespaces/default/mice/jerry');
      expect(proxyCalls[1][1].path).toBe('/apis/animals.io/v1/namespaces/default/geese/honk');
    });

    it('should handle delete with explicit entityNames including various ref formats', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      await provider.deltaUpdate({
        action: 'delete',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test',
        clusterName: 'test-cluster',
        entityNames: [
          'Component:prod/my-app',       // kind:namespace/name
          'Resource:my-resource',          // kind:name (no namespace)
          'API:default/my-api',            // API kind
          'just-a-name',                   // bare name (no colon)
        ],
      });

      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);
      const removed = deltaCalls[0][0].removed;
      expect(removed).toHaveLength(4);

      // Component:prod/my-app
      expect(removed[0].entity.kind).toBe('Component');
      expect(removed[0].entity.metadata.namespace).toBe('prod');
      expect(removed[0].entity.metadata.name).toBe('my-app');

      // Resource:my-resource (no slash = default namespace)
      expect(removed[1].entity.kind).toBe('Resource');
      expect(removed[1].entity.metadata.namespace).toBe('default');
      expect(removed[1].entity.metadata.name).toBe('my-resource');

      // API:default/my-api
      expect(removed[2].entity.kind).toBe('API');
      expect(removed[2].entity.metadata.namespace).toBe('default');
      expect(removed[2].entity.metadata.name).toBe('my-api');

      // bare name defaults to Component kind and default namespace
      expect(removed[3].entity.kind).toBe('Component');
      expect(removed[3].entity.metadata.namespace).toBe('default');
      expect(removed[3].entity.metadata.name).toBe('just-a-name');
    });

    it('should not filter System entities when using explicit entityNames on delete', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      // Explicit entityNames path does NOT filter — user is in control
      await provider.deltaUpdate({
        action: 'delete',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test',
        clusterName: 'test-cluster',
        entityNames: [
          'System:default/my-system',
          'Component:default/my-component',
        ],
      });

      const deltaCalls = mockConnection.applyMutation.mock.calls.filter(
        (call: any[]) => call[0].type === 'delta',
      );
      expect(deltaCalls).toHaveLength(1);
      const removed = deltaCalls[0][0].removed;
      expect(removed).toHaveLength(2);
      expect(removed[0].entity.kind).toBe('System');
      expect(removed[1].entity.kind).toBe('Component');
    });

    it('should reject delta update when full sync has not completed', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      // fullSyncCompleted is false by default

      await expect(provider.deltaUpdate({
        action: 'delete',
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'test',
        clusterName: 'test-cluster',
      })).rejects.toThrow('initial full sync has not completed');
    });

    it('should handle cluster-scoped resource (no namespace) paths correctly', async () => {
      const provider = new KubernetesEntityProvider(
        { run: jest.fn() } as any,
        mockLogger,
        mockConfig,
        mockResourceFetcher as any,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);
      (provider as any).fullSyncCompleted = true;

      (provider as any).cachedCrdMapping = {
        'rbac.authorization.k8s.io|ClusterRole': 'clusterroles',
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        metadata: { name: 'admin' },
        spec: {},
      });

      await provider.deltaUpdate({
        action: 'upsert',
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        name: 'admin',
        clusterName: 'test-cluster',
        // no namespace
      });

      const proxyCalls = mockResourceFetcher.proxyKubernetesRequest.mock.calls;
      expect(proxyCalls).toHaveLength(1);
      // No namespace in path for cluster-scoped resources
      expect(proxyCalls[0][1].path).toBe('/apis/rbac.authorization.k8s.io/v1/clusterroles/admin');
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
