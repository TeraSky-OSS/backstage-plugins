import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError } from '@backstage/errors';
import { KubernetesService } from './service/KubernetesService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockService = {
    getPolicyReports: jest.fn(),
    getPolicy: jest.fn(),
    getCrossplanePolicyReports: jest.fn(),
  } as unknown as KubernetesService;

  const mockPermissions = mockServices.permissions.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);
  });

  it('should register all MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockService,
      mockPermissions,
      mockAuth,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(3);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_kyverno_policy_reports');
    expect(registeredActions).toContain('get_kyverno_policy');
    expect(registeredActions).toContain('get_kyverno_crossplane_policy_reports');
  });

  describe('get_kyverno_policy_reports action', () => {
    let reportsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      reportsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_kyverno_policy_reports'
      )?.[0];
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        reportsAction.action({
          input: {
            entity: {
              metadata: { name: 'test-entity', namespace: 'default' },
            },
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch policy reports successfully', async () => {
      const mockReports = [
        {
          metadata: { uid: 'report-1', namespace: 'default' },
          scope: { kind: 'Deployment', name: 'test-deployment' },
          summary: { error: 0, fail: 1, pass: 5, skip: 0, warn: 0 },
          results: [],
          clusterName: 'test-cluster',
        },
      ];

      (mockService.getPolicyReports as jest.Mock).mockResolvedValue(mockReports);

      const result = await reportsAction.action({
        input: {
          entity: {
            metadata: { name: 'test-entity', namespace: 'default' },
          },
        },
        credentials: undefined,
      });

      expect(mockService.getPolicyReports).toHaveBeenCalledWith({
        entity: {
          metadata: { name: 'test-entity', namespace: 'default' },
        },
      });
      expect(result.output.reports).toEqual(mockReports);
    });

    it('should throw InputError on service failure', async () => {
      (mockService.getPolicyReports as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        reportsAction.action({
          input: {
            entity: {
              metadata: { name: 'test-entity', namespace: 'default' },
            },
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_kyverno_policy action', () => {
    let policyAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      policyAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_kyverno_policy'
      )?.[0];
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        policyAction.action({
          input: {
            clusterName: 'test-cluster',
            policyName: 'test-policy',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch policy details successfully', async () => {
      const mockPolicy = {
        apiVersion: 'kyverno.io/v1',
        kind: 'ClusterPolicy',
        metadata: { name: 'test-policy' },
        spec: {
          rules: [
            { name: 'test-rule', match: {} },
          ],
        },
      };

      (mockService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);

      const result = await policyAction.action({
        input: {
          clusterName: 'test-cluster',
          policyName: 'test-policy',
        },
        credentials: undefined,
      });

      expect(mockService.getPolicy).toHaveBeenCalledWith(
        'test-cluster',
        undefined,
        'test-policy'
      );
      expect(result.output.policy).toEqual(mockPolicy);
    });

    it('should fetch namespaced policy', async () => {
      const mockPolicy = {
        apiVersion: 'kyverno.io/v1',
        kind: 'Policy',
        metadata: { name: 'test-policy', namespace: 'default' },
        spec: {
          rules: [],
        },
      };

      (mockService.getPolicy as jest.Mock).mockResolvedValue(mockPolicy);

      const result = await policyAction.action({
        input: {
          clusterName: 'test-cluster',
          namespace: 'default',
          policyName: 'test-policy',
        },
        credentials: undefined,
      });

      expect(mockService.getPolicy).toHaveBeenCalledWith(
        'test-cluster',
        'default',
        'test-policy'
      );
      expect(result.output.policy).toEqual(mockPolicy);
    });

    it('should throw InputError on service failure', async () => {
      (mockService.getPolicy as jest.Mock).mockRejectedValue(
        new Error('Policy not found')
      );

      await expect(
        policyAction.action({
          input: {
            clusterName: 'test-cluster',
            policyName: 'non-existent',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_kyverno_crossplane_policy_reports action', () => {
    let crossplaneReportsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      crossplaneReportsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_kyverno_crossplane_policy_reports'
      )?.[0];
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        crossplaneReportsAction.action({
          input: {
            entity: {
              metadata: {
                name: 'test-entity',
                namespace: 'default',
                annotations: {},
              },
            },
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch crossplane policy reports successfully', async () => {
      const mockReports = [
        {
          metadata: { uid: 'report-1' },
          scope: { kind: 'Claim', name: 'test-claim' },
          summary: { error: 0, fail: 0, pass: 3, skip: 0, warn: 0 },
          results: [],
          clusterName: 'test-cluster',
        },
      ];

      (mockService.getCrossplanePolicyReports as jest.Mock).mockResolvedValue(mockReports);

      const result = await crossplaneReportsAction.action({
        input: {
          entity: {
            metadata: {
              name: 'test-entity',
              namespace: 'default',
              annotations: {
                'terasky.backstage.io/claim-name': 'test-claim',
              },
            },
          },
        },
        credentials: undefined,
      });

      expect(mockService.getCrossplanePolicyReports).toHaveBeenCalled();
      expect(result.output.reports).toEqual(mockReports);
    });

    it('should throw InputError on service failure', async () => {
      (mockService.getCrossplanePolicyReports as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        crossplaneReportsAction.action({
          input: {
            entity: {
              metadata: {
                name: 'test-entity',
                namespace: 'default',
                annotations: {},
              },
            },
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});

