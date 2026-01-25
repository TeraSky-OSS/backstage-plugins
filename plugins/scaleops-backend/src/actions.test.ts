import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { InputError } from '@backstage/errors';
import { ScaleOpsService } from './service/ScaleOpsService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockService = {
    getWorkloadsByLabels: jest.fn(),
    getWorkloadCostDetails: jest.fn(),
    generateDashboardUrl: jest.fn(),
    checkNetworkCostEnabled: jest.fn(),
    getWorkloadNetworkUsage: jest.fn(),
    getPolicyByName: jest.fn(),
  } as unknown as ScaleOpsService;

  const mockCatalogApi = {
    getEntityByRef: jest.fn(),
  };

  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
    (mockService.generateDashboardUrl as jest.Mock).mockReturnValue('http://scaleops/dashboard');
  });

  it('should register all MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockService,
      mockCatalogApi as any,
      mockAuth,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(5);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_scaleops_data_for_entity');
    expect(registeredActions).toContain('get_scaleops_cost_analysis_for_entity');
    expect(registeredActions).toContain('get_scaleops_recommendations_for_entity');
    expect(registeredActions).toContain('get_scaleops_network_usage_for_entity');
    expect(registeredActions).toContain('get_scaleops_policy_definitions_for_entity');
  });

  describe('get_scaleops_data_for_entity action', () => {
    let dataAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalogApi as any,
        mockAuth,
      );
      dataAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_scaleops_data_for_entity'
      )?.[0];
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue(null);

      await expect(
        dataAction.action({
          input: { entityRef: 'component:default/non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity has no label selector', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: { name: 'test-entity', annotations: {} },
        kind: 'Component',
      });

      await expect(
        dataAction.action({
          input: { entityRef: 'component:default/test-entity' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return workload data successfully', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            clusterName: 'test-cluster',
            namespace: 'default',
            workloadName: 'test-workload',
            type: 'Deployment',
            policyName: 'default',
            auto: true,
            cpuRequests: 100,
            memRequests: 256000000,
            cpuRecommended: 50,
            memRecommended: 128000000,
            isUnderProvisioned: false,
            isOverProvisioned: true,
            savingsAvailable: 10,
            activeSavings: 5,
          },
        ],
      });

      const result = await dataAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.entity.name).toBe('test-entity');
      expect(result.output.workloads).toHaveLength(1);
      expect(result.output.summary.totalWorkloads).toBe(1);
      expect(result.output.summary.automatedWorkloads).toBe(1);
      expect(result.output.summary.overProvisionedCount).toBe(1);
    });

    it('should handle empty workloads response', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: null,
      });

      const result = await dataAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloads).toEqual([]);
      expect(result.output.summary.totalWorkloads).toBe(0);
    });
  });

  describe('get_scaleops_cost_analysis_for_entity action', () => {
    let costAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalogApi as any,
        mockAuth,
      );
      costAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_scaleops_cost_analysis_for_entity'
      )?.[0];
    });

    it('should return empty cost analysis when no workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [],
      });

      const result = await costAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.costAnalysis).toEqual([]);
      expect(result.output.summary.totalCost).toBe(0);
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue(null);

      await expect(
        costAction.action({
          input: { entityRef: 'component:default/non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity has no label selector', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: { name: 'test', annotations: {} },
        kind: 'Component',
      });

      await expect(
        costAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return cost analysis with workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            id: 'workload-1',
            clusterName: 'test-cluster',
            namespace: 'default',
            workloadName: 'test-workload',
            type: 'Deployment',
          },
        ],
      });

      (mockService.getWorkloadCostDetails as jest.Mock).mockResolvedValue({
        aggregatedWorkloads: [
          {
            id: 'workload-1',
            workloadName: 'test-workload',
            totalCost: 100,
            hourlyCost: 4.17,
            spotPercent: 50,
            onDemandPercent: 50,
            savingsAvailable: 20,
          },
        ],
      });

      const result = await costAction.action({
        input: { entityRef: 'component:default/test-entity', range: '7d' },
        credentials: undefined,
      });

      expect(result.output.costAnalysis).toHaveLength(1);
      expect(result.output.summary.totalCost).toBe(100);
    });

    it('should throw InputError on service exception', async () => {
      mockCatalogApi.getEntityByRef.mockRejectedValue(new Error('Service error'));

      await expect(
        costAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_scaleops_recommendations_for_entity action', () => {
    let recsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalogApi as any,
        mockAuth,
      );
      recsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_scaleops_recommendations_for_entity'
      )?.[0];
    });

    it('should generate recommendations for problematic workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            workloadName: 'over-provisioned',
            namespace: 'default',
            clusterName: 'test-cluster',
            type: 'Deployment',
            isOverProvisioned: true,
            isUnderProvisioned: false,
            auto: false,
            savingsAvailable: 50,
            cpuRequests: 1000,
            cpuRecommended: 100,
            memRequests: 1000000000,
            memRecommended: 100000000,
          },
          {
            workloadName: 'under-provisioned',
            namespace: 'default',
            clusterName: 'test-cluster',
            type: 'Deployment',
            isOverProvisioned: false,
            isUnderProvisioned: true,
            auto: true,
            savingsAvailable: 0,
            cpuRequests: 50,
            cpuRecommended: 500,
            memRequests: 50000000,
            memRecommended: 500000000,
          },
        ],
      });

      const result = await recsAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.recommendations).toHaveLength(2);
      expect(result.output.summary.highPriority).toBe(2);
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue(null);

      await expect(
        recsAction.action({
          input: { entityRef: 'component:default/non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity has no label selector', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: { name: 'test', annotations: {} },
        kind: 'Component',
      });

      await expect(
        recsAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty recommendations when no workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [],
      });

      const result = await recsAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.recommendations).toEqual([]);
      expect(result.output.summary.totalRecommendations).toBe(0);
    });

    it('should filter by minSavingsThreshold', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            workloadName: 'low-savings',
            namespace: 'default',
            clusterName: 'test-cluster',
            type: 'Deployment',
            isOverProvisioned: true,
            auto: false,
            savingsAvailable: 5,
          },
          {
            workloadName: 'high-savings',
            namespace: 'default',
            clusterName: 'test-cluster',
            type: 'Deployment',
            isOverProvisioned: true,
            auto: false,
            savingsAvailable: 100,
          },
        ],
      });

      const result = await recsAction.action({
        input: { entityRef: 'component:default/test-entity', minSavingsThreshold: 50 },
        credentials: undefined,
      });

      expect(result.output.recommendations).toHaveLength(1);
      expect(result.output.recommendations[0].workloadName).toBe('high-savings');
    });

    it('should set medium priority for not-automated workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            workloadName: 'not-automated',
            namespace: 'default',
            clusterName: 'test-cluster',
            type: 'Deployment',
            isOverProvisioned: false,
            isUnderProvisioned: false,
            auto: false,
            savingsAvailable: 10,
          },
        ],
      });

      const result = await recsAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.recommendations[0].priority).toBe('medium');
      expect(result.output.recommendations[0].issue).toBe('not-automated');
    });

    it('should set low priority for automated over-provisioned workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            workloadName: 'auto-over',
            namespace: 'default',
            clusterName: 'test-cluster',
            type: 'Deployment',
            isOverProvisioned: true,
            isUnderProvisioned: false,
            auto: true,
            savingsAvailable: 10,
          },
        ],
      });

      const result = await recsAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.recommendations[0].priority).toBe('low');
    });

    it('should throw InputError on service exception', async () => {
      mockCatalogApi.getEntityByRef.mockRejectedValue(new Error('Service error'));

      await expect(
        recsAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_scaleops_network_usage_for_entity action', () => {
    let networkAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalogApi as any,
        mockAuth,
      );
      networkAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_scaleops_network_usage_for_entity'
      )?.[0];
    });

    it('should return network usage data', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            workloadName: 'test-workload',
            clusterName: 'test-cluster',
            namespace: 'default',
            type: 'Deployment',
          },
        ],
      });

      (mockService.checkNetworkCostEnabled as jest.Mock).mockResolvedValue({
        networkCostEnabled: { 'test-cluster': true },
      });

      (mockService.getWorkloadNetworkUsage as jest.Mock).mockResolvedValue({
        destinations: [],
      });

      const result = await networkAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadNetworkData).toHaveLength(1);
      expect(result.output.workloadNetworkData[0].networkCostEnabled).toBe(true);
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue(null);

      await expect(
        networkAction.action({
          input: { entityRef: 'component:default/non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity has no label selector', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: { name: 'test', annotations: {} },
        kind: 'Component',
      });

      await expect(
        networkAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty data when no workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [],
      });

      const result = await networkAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadNetworkData).toEqual([]);
      expect(result.output.summary.totalWorkloads).toBe(0);
    });

    it('should filter by specific workload name', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'workload-1', clusterName: 'test-cluster', namespace: 'default', type: 'Deployment' },
          { workloadName: 'workload-2', clusterName: 'test-cluster', namespace: 'default', type: 'Deployment' },
        ],
      });

      (mockService.checkNetworkCostEnabled as jest.Mock).mockResolvedValue({
        networkCostEnabled: { 'test-cluster': false },
      });

      const result = await networkAction.action({
        input: { entityRef: 'component:default/test-entity', workloadName: 'workload-1' },
        credentials: undefined,
      });

      expect(result.output.workloadNetworkData).toHaveLength(1);
      expect(result.output.workloadNetworkData[0].workloadName).toBe('workload-1');
    });

    it('should throw InputError when specific workload not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'other-workload', clusterName: 'test-cluster', namespace: 'default', type: 'Deployment' },
        ],
      });

      await expect(
        networkAction.action({
          input: { entityRef: 'component:default/test-entity', workloadName: 'non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should handle network data as array', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'test-workload', clusterName: 'test-cluster', namespace: 'default', type: 'Deployment' },
        ],
      });

      (mockService.checkNetworkCostEnabled as jest.Mock).mockResolvedValue({
        networkCostEnabled: { 'test-cluster': true },
      });

      (mockService.getWorkloadNetworkUsage as jest.Mock).mockResolvedValue([
        { Name: 'dest-workload', Namespace: 'default', totalCost: { total: 10 }, totalTraffic: { total: 1000 } },
      ]);

      const result = await networkAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadNetworkData[0].destinations).toHaveLength(1);
      expect(result.output.summary.totalNetworkCost).toBe(10);
      expect(result.output.summary.totalTraffic).toBe(1000);
    });

    it('should handle network data fetch failure gracefully', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'test-workload', clusterName: 'test-cluster', namespace: 'default', type: 'Deployment' },
        ],
      });

      (mockService.checkNetworkCostEnabled as jest.Mock).mockResolvedValue({
        networkCostEnabled: { 'test-cluster': true },
      });

      (mockService.getWorkloadNetworkUsage as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await networkAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadNetworkData[0].networkCostEnabled).toBe(false);
      expect(result.output.workloadNetworkData[0].destinations).toEqual([]);
    });

    it('should throw InputError on service exception', async () => {
      mockCatalogApi.getEntityByRef.mockRejectedValue(new Error('Service error'));

      await expect(
        networkAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_scaleops_policy_definitions_for_entity action', () => {
    let policyAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalogApi as any,
        mockAuth,
      );
      policyAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_scaleops_policy_definitions_for_entity'
      )?.[0];
    });

    it('should return policy definitions for workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          {
            workloadName: 'test-workload',
            clusterName: 'test-cluster',
            namespace: 'default',
            policyName: 'default-policy',
          },
        ],
      });

      (mockService.getPolicyByName as jest.Mock).mockResolvedValue({
        apiVersion: 'scaleops.sh/v1',
        kind: 'Policy',
        metadata: { name: 'default-policy' },
        spec: {},
      });

      const result = await policyAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadPolicies).toHaveLength(1);
      expect(result.output.workloadPolicies[0].policyDefinition).toBeDefined();
      expect(result.output.summary.workloadsWithPolicies).toBe(1);
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue(null);

      await expect(
        policyAction.action({
          input: { entityRef: 'component:default/non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity has no label selector', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: { name: 'test', annotations: {} },
        kind: 'Component',
      });

      await expect(
        policyAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty data when no workloads', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [],
      });

      const result = await policyAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadPolicies).toEqual([]);
      expect(result.output.summary.totalWorkloads).toBe(0);
    });

    it('should filter by specific workload name', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'workload-1', clusterName: 'test-cluster', namespace: 'default', policyName: 'policy-1' },
          { workloadName: 'workload-2', clusterName: 'test-cluster', namespace: 'default', policyName: 'policy-2' },
        ],
      });

      (mockService.getPolicyByName as jest.Mock).mockResolvedValue({ metadata: { name: 'policy-1' } });

      const result = await policyAction.action({
        input: { entityRef: 'component:default/test-entity', workloadName: 'workload-1' },
        credentials: undefined,
      });

      expect(result.output.workloadPolicies).toHaveLength(1);
      expect(result.output.workloadPolicies[0].workloadName).toBe('workload-1');
    });

    it('should throw InputError when specific workload not found', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'other-workload', clusterName: 'test-cluster', namespace: 'default' },
        ],
      });

      await expect(
        policyAction.action({
          input: { entityRef: 'component:default/test-entity', workloadName: 'non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should handle workloads with N/A policy name', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'test-workload', clusterName: 'test-cluster', namespace: 'default', policyName: 'N/A' },
        ],
      });

      const result = await policyAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadPolicies[0].policyName).toBe('N/A');
      expect(result.output.workloadPolicies[0].policyDefinition).toBeNull();
      expect(result.output.summary.uniquePolicies).toEqual([]);
    });

    it('should handle policy fetch failure gracefully', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'test-workload', clusterName: 'test-cluster', namespace: 'default', policyName: 'failing-policy' },
        ],
      });

      (mockService.getPolicyByName as jest.Mock).mockRejectedValue(new Error('Policy not found'));

      const result = await policyAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadPolicies[0].policyDefinition).toBeNull();
      expect(result.output.summary.workloadsWithPolicies).toBe(0);
    });

    it('should throw InputError on service exception', async () => {
      mockCatalogApi.getEntityByRef.mockRejectedValue(new Error('Service error'));

      await expect(
        policyAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should handle workloads with no policy name', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          namespace: 'default',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [
          { workloadName: 'test-workload', clusterName: 'test-cluster', namespace: 'default' },
        ],
      });

      const result = await policyAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.workloadPolicies[0].policyName).toBe('N/A');
    });
  });

  describe('get_scaleops_data_for_entity action - additional cases', () => {
    let dataAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalogApi as any,
        mockAuth,
      );
      dataAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_scaleops_data_for_entity'
      )?.[0];
    });

    it('should throw InputError on service exception', async () => {
      mockCatalogApi.getEntityByRef.mockRejectedValue(new Error('Service error'));

      await expect(
        dataAction.action({
          input: { entityRef: 'component:default/test' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should handle entity without namespace', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValue({
        metadata: {
          name: 'test-entity',
          annotations: {
            'backstage.io/kubernetes-label-selector': 'app=test',
          },
        },
        kind: 'Component',
      });

      (mockService.getWorkloadsByLabels as jest.Mock).mockResolvedValue({
        workloads: [],
      });

      const result = await dataAction.action({
        input: { entityRef: 'component:default/test-entity' },
        credentials: undefined,
      });

      expect(result.output.entity.namespace).toBe('default');
    });
  });
});

