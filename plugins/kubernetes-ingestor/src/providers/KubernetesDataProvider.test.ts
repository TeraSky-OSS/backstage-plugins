import { KubernetesDataProvider } from './KubernetesDataProvider';

describe('KubernetesDataProvider', () => {
  const mockResourceFetcher = {
    getClusters: jest.fn(),
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
  };

  const mockConfig = {
    getOptionalStringArray: jest.fn().mockReturnValue(undefined),
    getOptionalString: jest.fn().mockReturnValue(undefined),
    getOptionalBoolean: jest.fn().mockReturnValue(false),
    getOptionalConfigArray: jest.fn().mockReturnValue(undefined),
    getOptionalConfig: jest.fn().mockReturnValue(undefined),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.getOptionalStringArray.mockReturnValue(undefined);
    mockConfig.getOptionalString.mockReturnValue(undefined);
    mockConfig.getOptionalBoolean.mockReturnValue(false);
    mockConfig.getOptionalConfigArray.mockReturnValue(undefined);
    mockConfig.getOptionalConfig.mockReturnValue(undefined);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      expect(provider).toBeDefined();
    });
  });

  describe('fetchKubernetesObjects', () => {
    it('should return empty array when no clusters found', async () => {
      mockResourceFetcher.getClusters.mockResolvedValue([]);
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No clusters found.');
    });

    it('should use allowed clusters from config', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);
      mockConfig.getOptionalConfigArray.mockReturnValue(undefined);
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // With allowed clusters configured, the function should still work
      expect(Array.isArray(result)).toBe(true);
      expect(mockResourceFetcher.getClusters).not.toHaveBeenCalled();
    });

    it('should handle cluster discovery errors', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockRejectedValue(new Error('Discovery failed'));

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should fetch default workload types when not disabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return false;
        if (key === 'kubernetesIngestor.crossplane.enabled') return false;
        if (key === 'kubernetesIngestor.kro.enabled') return false;
        return false;
      });
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      await provider.fetchKubernetesObjects();

      // Should fetch deployments, statefulsets, daemonsets, cronjobs
      expect(mockResourceFetcher.fetchResources).toHaveBeenCalled();
    });

    it('should skip default workload types when disabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return true;
        return false;
      });
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should use custom workload types when configured', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return true;
        return false;
      });
      mockConfig.getOptionalConfigArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.customWorkloadTypes') {
          return [
            {
              getString: (k: string) => {
                if (k === 'group') return 'custom.io';
                if (k === 'apiVersion') return 'v1';
                if (k === 'plural') return 'myresources';
                return '';
              },
              getOptionalString: (k: string) => {
                if (k === 'defaultType') return undefined;
                return undefined;
              },
            },
          ];
        }
        return undefined;
      });
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      await provider.fetchKubernetesObjects();

      expect(mockResourceFetcher.fetchResources).toHaveBeenCalledWith(
        expect.objectContaining({
          resourcePath: 'custom.io/v1/myresources',
        }),
      );
    });

    it('should add workloadType to resources from customWorkloadTypes with defaultType', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return true;
        return false;
      });
      mockConfig.getOptionalConfigArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.customWorkloadTypes') {
          return [
            {
              getString: (k: string) => {
                if (k === 'group') return 'argoproj.io';
                if (k === 'apiVersion') return 'v1alpha1';
                if (k === 'plural') return 'cronworkflows';
                return '';
              },
              getOptionalString: (k: string) => {
                if (k === 'defaultType') return 'workflow';
                return undefined;
              },
            },
          ];
        }
        return undefined;
      });

      const mockCronWorkflow = {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'CronWorkflow',
        metadata: { name: 'test-workflow', namespace: 'default' },
        spec: {},
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([mockCronWorkflow]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const workflow = result.find((r: any) => r.metadata?.name === 'test-workflow');
      expect(workflow).toBeDefined();
      expect(workflow?.workloadType).toBe('workflow');
    });

    it('should not add workloadType when defaultType is not configured', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);
      mockConfig.getOptionalConfigArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.customWorkloadTypes') {
          return [
            {
              getString: (k: string) => {
                if (k === 'group') return 'batch';
                if (k === 'apiVersion') return 'v1';
                if (k === 'plural') return 'jobs';
                return '';
              },
              getOptionalString: (_k: string) => {
                // No defaultType configured
                return undefined;
              },
            },
          ];
        }
        return undefined;
      });

      const mockJob = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: { name: 'test-job', namespace: 'default' },
        spec: {},
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([mockJob]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const job = result.find((r: any) => r.metadata?.name === 'test-job');
      expect(job).toBeDefined();
      expect(job?.workloadType).toBeUndefined();
    });

    it('should add workloadType to multiple custom workload types', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return true;
        return false;
      });
      mockConfig.getOptionalConfigArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.customWorkloadTypes') {
          return [
            {
              getString: (k: string) => {
                if (k === 'group') return 'batch';
                if (k === 'apiVersion') return 'v1';
                if (k === 'plural') return 'jobs';
                return '';
              },
              getOptionalString: (k: string) => {
                if (k === 'defaultType') return 'batch-job';
                return undefined;
              },
            },
            {
              getString: (k: string) => {
                if (k === 'group') return 'batch';
                if (k === 'apiVersion') return 'v1';
                if (k === 'plural') return 'cronjobs';
                return '';
              },
              getOptionalString: (k: string) => {
                if (k === 'defaultType') return 'scheduled-task';
                return undefined;
              },
            },
          ];
        }
        return undefined;
      });

      const mockJob = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: { name: 'test-job', namespace: 'default' },
        spec: {},
      };

      const mockCronJob = {
        apiVersion: 'batch/v1',
        kind: 'CronJob',
        metadata: { name: 'test-cronjob', namespace: 'default' },
        spec: {},
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath }: any) => {
        if (resourcePath === 'batch/v1/jobs') return [mockJob];
        if (resourcePath === 'batch/v1/cronjobs') return [mockCronJob];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const job = result.find((r: any) => r.metadata?.name === 'test-job');
      expect(job?.workloadType).toBe('batch-job');

      const cronJob = result.find((r: any) => r.metadata?.name === 'test-cronjob');
      expect(cronJob?.workloadType).toBe('scheduled-task');
    });

    it('should add workloadType to Crossplane claims from customWorkloadTypes', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.enabled') return true;
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return true;
        return false;
      });
      mockConfig.getOptionalConfigArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.customWorkloadTypes') {
          return [
            {
              getString: (k: string) => {
                if (k === 'group') return 'database.example.com';
                if (k === 'apiVersion') return 'v1alpha1';
                if (k === 'plural') return 'postgresqlinstances';
                return '';
              },
              getOptionalString: (k: string) => {
                if (k === 'defaultType') return 'postgresql-database';
                return undefined;
              },
            },
          ];
        }
        return undefined;
      });

      const mockClaim = {
        apiVersion: 'database.example.com/v1alpha1',
        kind: 'PostgreSQLInstance',
        metadata: { name: 'my-db', namespace: 'default' },
        spec: {
          resourceRef: { name: 'my-db-xyz' },
        },
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath }: any) => {
        if (resourcePath === 'database.example.com/v1alpha1/postgresqlinstances') return [mockClaim];
        if (resourcePath === 'apiextensions.crossplane.io/v1/compositions') return [];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const claim = result.find((r: any) => r.metadata?.name === 'my-db');
      expect(claim).toBeDefined();
      expect(claim?.workloadType).toBe('postgresql-database');
    });

    it('should add workloadType to KRO instances from customWorkloadTypes', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return true;
        if (key === 'kubernetesIngestor.components.disableDefaultWorkloadTypes') return true;
        return false;
      });
      mockConfig.getOptionalConfigArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.customWorkloadTypes') {
          return [
            {
              getString: (k: string) => {
                if (k === 'group') return 'apps.example.com';
                if (k === 'apiVersion') return 'v1';
                if (k === 'plural') return 'webapplications';
                return '';
              },
              getOptionalString: (k: string) => {
                if (k === 'defaultType') return 'web-app';
                return undefined;
              },
            },
          ];
        }
        return undefined;
      });

      const rgdId = 'rgd-uid-456';
      const mockKROInstance = {
        apiVersion: 'apps.example.com/v1',
        kind: 'WebApplication',
        metadata: {
          name: 'my-app',
          namespace: 'default',
          labels: {
            'kro.run/resource-graph-definition-id': rgdId,
          },
        },
        spec: {},
      };

      const rgd = {
        metadata: { uid: rgdId, name: 'webapp-rgd' },
        status: { state: 'Active' },
        spec: {
          schema: {
            group: 'apps.example.com',
            kind: 'WebApplication',
          },
        },
      };

      const crd = {
        metadata: { name: 'webapplications.apps.example.com' },
        spec: {
          group: 'apps.example.com',
          names: { plural: 'webapplications', kind: 'WebApplication' },
          versions: [{ name: 'v1' }],
        },
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath, query }: any) => {
        if (resourcePath === 'kro.run/v1alpha1/resourcegraphdefinitions') return [rgd];
        if (resourcePath === 'apiextensions.k8s.io/v1/customresourcedefinitions') {
          if (query?.labelSelector?.includes(rgdId)) return [crd];
          return [];
        }
        if (resourcePath === 'apps.example.com/v1/webapplications') return [mockKROInstance];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const kroInstance = result.find((r: any) => r.metadata?.name === 'my-app');
      expect(kroInstance).toBeDefined();
      expect(kroInstance?.workloadType).toBe('web-app');
    });

    it('should filter out excluded namespaces', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        if (key === 'kubernetesIngestor.components.excludedNamespaces') return ['kube-system'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);

      const mockDeployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'test', namespace: 'kube-system' },
      };
      mockResourceFetcher.fetchResources.mockResolvedValue([mockDeployment]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // The deployment in kube-system should be filtered out
      expect(result.filter((r: any) => r.metadata?.namespace === 'kube-system')).toHaveLength(0);
    });

    it('should filter out resources with exclude annotation', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);
      mockConfig.getOptionalString.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.annotationPrefix') return 'terasky.backstage.io';
        return undefined;
      });

      const mockDeployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'test',
          namespace: 'default',
          annotations: {
            'terasky.backstage.io/exclude-from-catalog': 'true',
          },
        },
      };
      mockResourceFetcher.fetchResources.mockResolvedValue([mockDeployment]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // The deployment with exclude annotation should be filtered out
      expect(result.filter((r: any) => r.metadata?.name === 'test')).toHaveLength(0);
    });

    it('should only ingest annotated resources when configured', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.components.onlyIngestAnnotatedResources') return true;
        return false;
      });

      const nonAnnotatedDeployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'non-annotated', namespace: 'default' },
      };
      const annotatedDeployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'annotated',
          namespace: 'default',
          annotations: { 'terasky.backstage.io/add-to-catalog': 'true' },
        },
      };
      mockResourceFetcher.fetchResources.mockResolvedValue([nonAnnotatedDeployment, annotatedDeployment]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // Only annotated deployments should be included
      expect(result.filter((r: any) => r.metadata?.name === 'non-annotated')).toHaveLength(0);
    });

    it('should fetch resources with crossplane enabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.enabled') return true;
        return false;
      });
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      await provider.fetchKubernetesObjects();

      expect(mockResourceFetcher.fetchResources).toHaveBeenCalled();
    });

    it('should fetch resources with KRO enabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return true;
        if (key === 'kubernetesIngestor.kro.instances.ingestAllInstances') return true;
        return false;
      });
      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      await provider.fetchKubernetesObjects();

      // Should attempt to fetch RGDs
      expect(mockResourceFetcher.fetchResources).toHaveBeenCalledWith(
        expect.objectContaining({
          resourcePath: 'kro.run/v1alpha1/resourcegraphdefinitions',
        }),
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);
      mockResourceFetcher.fetchResources.mockRejectedValue(new Error('Fetch failed'));

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // Should handle the error and return empty result
      expect(Array.isArray(result)).toBe(true);
    });

    it('should process resources with Crossplane v2 compositionRef', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.enabled') return true;
        return false;
      });

      const v2Resource = {
        apiVersion: 'custom.io/v1',
        kind: 'MyResource',
        metadata: { name: 'test-resource', namespace: 'default' },
        spec: {
          crossplane: {
            compositionRef: { name: 'my-composition' },
          },
        },
      };

      const composition = {
        metadata: { name: 'my-composition' },
        spec: {
          pipeline: [
            { functionRef: { name: 'function-kcl' } },
            { functionRef: { name: 'function-auto-ready' } },
          ],
        },
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath }: any) => {
        if (resourcePath === 'apiextensions.crossplane.io/v1/compositionrevisions') return [];
        if (resourcePath === 'apiextensions.crossplane.io/v1/compositions') return [composition];
        if (resourcePath.includes('deployments')) return [v2Resource];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // Should add compositionData to the resource
      const processedResource = result.find((r: any) => r.metadata?.name === 'test-resource');
      expect(processedResource?.compositionData?.name).toBe('my-composition');
      expect(processedResource?.compositionData?.usedFunctions).toContain('function-kcl');
    });

    it('should process resources with Crossplane v1 compositionRef (claims)', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.enabled') return true;
        if (key === 'kubernetesIngestor.crossplane.claims.ingestAllClaims') return true;
        return false;
      });

      const claimResource = {
        apiVersion: 'custom.io/v1',
        kind: 'MyClaim',
        metadata: { name: 'test-claim', namespace: 'default' },
        spec: {
          compositionRef: { name: 'my-composition' },
        },
      };

      const composition = {
        metadata: { name: 'my-composition' },
        spec: {
          pipeline: [
            { functionRef: { name: 'function-go-templating' } },
          ],
        },
      };

      const claimCRD = {
        metadata: { name: 'myclaims.custom.io' },
        spec: {
          group: 'custom.io',
          names: { categories: ['claim'], plural: 'myclaims' },
          versions: [{ name: 'v1' }],
        },
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath }: any) => {
        if (resourcePath === 'apiextensions.k8s.io/v1/customresourcedefinitions') return [claimCRD];
        if (resourcePath === 'apiextensions.crossplane.io/v1/compositionrevisions') return [];
        if (resourcePath === 'apiextensions.crossplane.io/v1/compositions') return [composition];
        if (resourcePath.includes('myclaims')) return [claimResource];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const processedClaim = result.find((r: any) => r.metadata?.name === 'test-claim');
      expect(processedClaim?.compositionData?.name).toBe('my-composition');
    });

    it('should skip Crossplane resources when Crossplane is disabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.crossplane.enabled') return false;
        return false;
      });

      const crossplaneResource = {
        apiVersion: 'custom.io/v1',
        kind: 'MyResource',
        metadata: { name: 'crossplane-resource', namespace: 'default' },
        spec: {
          resourceRef: { name: 'some-resource' },
        },
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([crossplaneResource]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // Resource with resourceRef should be skipped when Crossplane is disabled
      const filtered = result.filter((r: any) => r.metadata?.name === 'crossplane-resource');
      expect(filtered).toHaveLength(0);
    });

    it('should skip KRO resources when KRO is disabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return false;
        return false;
      });

      const kroResource = {
        apiVersion: 'custom.io/v1',
        kind: 'MyResource',
        metadata: {
          name: 'kro-resource',
          namespace: 'default',
          labels: {
            'kro.run/resource-graph-definition-id': 'some-rgd-id',
          },
        },
      };

      mockResourceFetcher.fetchResources.mockResolvedValue([kroResource]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      // Resource with KRO label should be skipped when KRO is disabled
      const filtered = result.filter((r: any) => r.metadata?.name === 'kro-resource');
      expect(filtered).toHaveLength(0);
    });

    it('should process KRO instances when KRO is enabled', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.kro.enabled') return true;
        return false;
      });

      const rgdId = 'rgd-uid-123';
      const kroResource = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'kro-instance',
          namespace: 'default',
          labels: {
            'kro.run/resource-graph-definition-id': rgdId,
          },
        },
      };

      const rgd = {
        metadata: { uid: rgdId, name: 'test-rgd' },
        status: { state: 'Active' },
        spec: {
          schema: {
            group: 'apps',
            kind: 'deployment',
          },
        },
      };

      const crd = {
        metadata: { name: 'deployments.apps' },
        spec: {
          group: 'apps',
          names: { plural: 'deployments', kind: 'Deployment' },
          versions: [{ name: 'v1' }],
        },
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath, query }: any) => {
        if (resourcePath === 'kro.run/v1alpha1/resourcegraphdefinitions') return [rgd];
        if (resourcePath === 'apiextensions.k8s.io/v1/customresourcedefinitions') {
          if (query?.labelSelector?.includes(rgdId)) return [crd];
          return [];
        }
        if (resourcePath.includes('deployments')) return [kroResource];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      const processedResource = result.find((r: any) => r.metadata?.name === 'kro-instance');
      // KRO resources should have kroData when matched
      expect(processedResource?.kroData?.rgd?.metadata?.name).toBe('test-rgd');
    });

    it('should handle generic CRD templates with label selector', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });
      mockConfig.getOptionalBoolean.mockReturnValue(false);
      mockConfig.getOptionalConfig.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.genericCRDTemplates.crdLabelSelector') {
          return {
            getString: (k: string) => {
              if (k === 'key') return 'app.kubernetes.io/managed-by';
              if (k === 'value') return 'backstage';
              return '';
            },
          };
        }
        return undefined;
      });

      const genericCRD = {
        metadata: { name: 'myresources.custom.io' },
        spec: {
          group: 'custom.io',
          names: { plural: 'myresources', kind: 'MyResource' },
          versions: [{ name: 'v1', storage: true }],
        },
      };

      const genericResource = {
        apiVersion: 'custom.io/v1',
        kind: 'MyResource',
        metadata: { name: 'generic-resource', namespace: 'default' },
      };

      mockResourceFetcher.fetchResources.mockImplementation(async ({ resourcePath }: any) => {
        if (resourcePath === 'apiextensions.k8s.io/v1/customresourcedefinitions') return [genericCRD];
        if (resourcePath === 'custom.io/v1/myresources') return [genericResource];
        return [];
      });

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchKubernetesObjects();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('fetchCRDMapping', () => {
    it('should return empty object when no clusters found', async () => {
      mockResourceFetcher.getClusters.mockResolvedValue([]);
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchCRDMapping();

      expect(result).toEqual({});
      expect(mockLogger.warn).toHaveBeenCalledWith('No clusters found for CRD mapping.');
    });

    it('should return empty object when cluster discovery fails', async () => {
      mockConfig.getOptionalStringArray.mockReturnValue(undefined);
      mockResourceFetcher.getClusters.mockRejectedValue(new Error('Discovery failed'));

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchCRDMapping();

      expect(result).toEqual({});
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should fetch CRD mapping successfully', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });

      const crds = [
        {
          spec: {
            names: { kind: 'Deployment', plural: 'deployments' },
          },
        },
        {
          spec: {
            names: { kind: 'Service', plural: 'services' },
          },
        },
      ];

      mockResourceFetcher.fetchResources.mockResolvedValue(crds);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchCRDMapping();

      expect(result).toEqual({
        Deployment: 'deployments',
        Service: 'services',
      });
    });

    it('should handle errors when fetching CRDs for a cluster', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });

      mockResourceFetcher.fetchResources.mockRejectedValue(new Error('Fetch failed'));

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchCRDMapping();

      expect(result).toEqual({});
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions when fetching CRDs', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1'];
        return undefined;
      });

      mockResourceFetcher.fetchResources.mockRejectedValue('String error');

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      const result = await provider.fetchCRDMapping();

      expect(result).toEqual({});
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use allowed clusters from config for CRD mapping', async () => {
      mockConfig.getOptionalStringArray.mockImplementation((key: string) => {
        if (key === 'kubernetesIngestor.allowedClusterNames') return ['cluster1', 'cluster2'];
        return undefined;
      });

      mockResourceFetcher.fetchResources.mockResolvedValue([]);

      const provider = new KubernetesDataProvider(
        mockResourceFetcher as any,
        mockConfig as any,
        mockLogger as any,
      );

      await provider.fetchCRDMapping();

      // Should not call getClusters when allowed clusters are configured
      expect(mockResourceFetcher.getClusters).not.toHaveBeenCalled();
    });
  });
});

