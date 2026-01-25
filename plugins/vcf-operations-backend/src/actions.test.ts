import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError } from '@backstage/errors';
import { VcfOperationsService } from './services/VcfOperationsService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockService = {
    getInstances: jest.fn(),
    getResourceMetrics: jest.fn(),
    getAlerts: jest.fn(),
    getResourceDetails: jest.fn(),
    getResources: jest.fn(),
    searchResources: jest.fn(),
  } as unknown as VcfOperationsService;

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

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_vcf_operations_instances');
    expect(registeredActions).toContain('get_vcf_operations_resource_metrics');
  });

  describe('get_vcf_operations_instances action', () => {
    let instancesAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      instancesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_vcf_operations_instances'
      )?.[0];
    });

    it('should return instances when authorized', async () => {
      (mockService.getInstances as jest.Mock).mockReturnValue([
        { name: 'instance-1', relatedVCFAInstances: ['vcfa-1'] },
      ]);

      const result = await instancesAction.action({
        credentials: undefined,
      });

      expect(result.output.instances).toHaveLength(1);
      expect(result.output.instances[0].name).toBe('instance-1');
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        instancesAction.action({ credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_operations_resource_metrics action', () => {
    let metricsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      metricsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_vcf_operations_resource_metrics'
      )?.[0];
    });

    it('should return metrics when authorized', async () => {
      (mockService.getResourceMetrics as jest.Mock).mockResolvedValue({
        values: [
          {
            resourceId: 'resource-1',
            stat: {
              statKey: { key: 'cpu|usage' },
              timestamps: [1000, 2000],
              data: [50, 60],
            },
          },
        ],
      });

      const result = await metricsAction.action({
        input: {
          resourceId: 'resource-1',
          statKeys: ['cpu|usage'],
        },
        credentials: undefined,
      });

      expect(result.output.values).toHaveLength(1);
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        metricsAction.action({
          input: {
            resourceId: 'resource-1',
            statKeys: ['cpu|usage'],
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getResourceMetrics as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(
        metricsAction.action({
          input: {
            resourceId: 'resource-1',
            statKeys: ['cpu|usage'],
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});

