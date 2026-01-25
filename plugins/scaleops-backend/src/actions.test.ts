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
  });
});

