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
    getLatestResourceMetrics: jest.fn(),
    getResourceDetails: jest.fn(),
    getAvailableMetrics: jest.fn(),
    searchResources: jest.fn(),
    findResourceByName: jest.fn(),
    findResourceByProperty: jest.fn(),
  } as unknown as VcfOperationsService;

  const mockPermissions = mockServices.permissions.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:vcf-operations-backend' } } as any);
    mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);
  });

  const getAction = (name: string) => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockService,
      mockPermissions,
      mockAuth,
    );
    return mockActionsRegistry.register.mock.calls.find(
      (call: any[]) => call[0].name === name
    )?.[0];
  };

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
    expect(registeredActions).toContain('get_latest_vcf_operations_resource_metrics');
    expect(registeredActions).toContain('get_vcf_operations_resource_details');
    expect(registeredActions).toContain('get_available_metrics_from_vcf_operations');
    expect(registeredActions).toContain('search_vcf_operations_resources');
    expect(registeredActions).toContain('find_vcf_operations_resource_by_name');
    expect(registeredActions).toContain('find_vcf_operations_resource_by_property');
  });

  describe('get_vcf_operations_instances action', () => {
    it('should return instances when authorized', async () => {
      (mockService.getInstances as jest.Mock).mockReturnValue([
        { name: 'instance-1', relatedVCFAInstances: ['vcfa-1'] },
      ]);

      const action = getAction('get_vcf_operations_instances');
      const result = await action.action({ credentials: undefined });

      expect(result.output.instances).toHaveLength(1);
      expect(result.output.instances[0].name).toBe('instance-1');
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('get_vcf_operations_instances');
      await expect(action.action({ credentials: undefined })).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getInstances as jest.Mock).mockImplementation(() => {
        throw new Error('Service error');
      });

      const action = getAction('get_vcf_operations_instances');
      await expect(action.action({ credentials: undefined })).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_operations_resource_metrics action', () => {
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

      const action = getAction('get_vcf_operations_resource_metrics');
      const result = await action.action({
        input: {
          resourceId: 'resource-1',
          statKeys: ['cpu|usage'],
        },
        credentials: undefined,
      });

      expect(result.output.values).toHaveLength(1);
    });

    it('should pass optional parameters to service', async () => {
      (mockService.getResourceMetrics as jest.Mock).mockResolvedValue({ values: [] });

      const action = getAction('get_vcf_operations_resource_metrics');
      await action.action({
        input: {
          resourceId: 'resource-1',
          statKeys: ['cpu|usage'],
          begin: 1000,
          end: 2000,
          rollUpType: 'AVERAGE',
          instanceName: 'vcfo-1',
        },
        credentials: undefined,
      });

      expect(mockService.getResourceMetrics).toHaveBeenCalledWith(
        'resource-1',
        ['cpu|usage'],
        1000,
        2000,
        'AVERAGE',
        'vcfo-1',
      );
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('get_vcf_operations_resource_metrics');
      await expect(
        action.action({
          input: { resourceId: 'resource-1', statKeys: ['cpu|usage'] },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getResourceMetrics as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const action = getAction('get_vcf_operations_resource_metrics');
      await expect(
        action.action({
          input: { resourceId: 'resource-1', statKeys: ['cpu|usage'] },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_latest_vcf_operations_resource_metrics action', () => {
    it('should return latest metrics when authorized', async () => {
      (mockService.getLatestResourceMetrics as jest.Mock).mockResolvedValue({
        values: [{ resourceId: 'res-1', stat: { statKey: { key: 'cpu' }, timestamps: [], data: [] } }],
      });

      const action = getAction('get_latest_vcf_operations_resource_metrics');
      const result = await action.action({
        input: { resourceIds: ['res-1'], statKeys: ['cpu'] },
        credentials: undefined,
      });

      expect(result.output.values).toHaveLength(1);
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('get_latest_vcf_operations_resource_metrics');
      await expect(
        action.action({
          input: { resourceIds: ['res-1'], statKeys: ['cpu'] },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getLatestResourceMetrics as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const action = getAction('get_latest_vcf_operations_resource_metrics');
      await expect(
        action.action({
          input: { resourceIds: ['res-1'], statKeys: ['cpu'] },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_operations_resource_details action', () => {
    it('should return resource details when authorized', async () => {
      (mockService.getResourceDetails as jest.Mock).mockResolvedValue({
        identifier: 'res-1',
        name: 'Resource 1',
      });

      const action = getAction('get_vcf_operations_resource_details');
      const result = await action.action({
        input: { resourceId: 'res-1' },
        credentials: undefined,
      });

      expect(result.output.resource.name).toBe('Resource 1');
    });

    it('should pass instanceName to service', async () => {
      (mockService.getResourceDetails as jest.Mock).mockResolvedValue({ identifier: 'res-1' });

      const action = getAction('get_vcf_operations_resource_details');
      await action.action({
        input: { resourceId: 'res-1', instanceName: 'vcfo-1' },
        credentials: undefined,
      });

      expect(mockService.getResourceDetails).toHaveBeenCalledWith('res-1', 'vcfo-1');
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('get_vcf_operations_resource_details');
      await expect(
        action.action({
          input: { resourceId: 'res-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getResourceDetails as jest.Mock).mockRejectedValue(
        new Error('Resource not found')
      );

      const action = getAction('get_vcf_operations_resource_details');
      await expect(
        action.action({
          input: { resourceId: 'res-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_available_metrics_from_vcf_operations action', () => {
    it('should return available metrics when authorized', async () => {
      (mockService.getAvailableMetrics as jest.Mock).mockResolvedValue({
        'stat-key': [{ key: 'cpu|usage' }, { key: 'memory|usage' }],
      });

      const action = getAction('get_available_metrics_from_vcf_operations');
      const result = await action.action({
        input: { resourceId: 'res-1' },
        credentials: undefined,
      });

      expect(result.output.metrics).toHaveLength(2);
    });

    it('should return empty array when stat-key is missing', async () => {
      (mockService.getAvailableMetrics as jest.Mock).mockResolvedValue({});

      const action = getAction('get_available_metrics_from_vcf_operations');
      const result = await action.action({
        input: { resourceId: 'res-1' },
        credentials: undefined,
      });

      expect(result.output.metrics).toEqual([]);
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('get_available_metrics_from_vcf_operations');
      await expect(
        action.action({
          input: { resourceId: 'res-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getAvailableMetrics as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const action = getAction('get_available_metrics_from_vcf_operations');
      await expect(
        action.action({
          input: { resourceId: 'res-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('search_vcf_operations_resources action', () => {
    it('should return resources when authorized', async () => {
      (mockService.searchResources as jest.Mock).mockResolvedValue({
        resourceList: [{ identifier: 'res-1', name: 'VM-1' }],
      });

      const action = getAction('search_vcf_operations_resources');
      const result = await action.action({
        input: { name: 'VM' },
        credentials: undefined,
      });

      expect(result.output.resources).toHaveLength(1);
    });

    it('should pass all parameters to service', async () => {
      (mockService.searchResources as jest.Mock).mockResolvedValue({ resourceList: [] });

      const action = getAction('search_vcf_operations_resources');
      await action.action({
        input: {
          name: 'VM',
          adapterKind: 'VMWARE',
          resourceKind: 'VirtualMachine',
          instanceName: 'vcfo-1',
        },
        credentials: undefined,
      });

      expect(mockService.searchResources).toHaveBeenCalledWith(
        'VM',
        'VMWARE',
        'VirtualMachine',
        'vcfo-1',
      );
    });

    it('should return empty array when resourceList is missing', async () => {
      (mockService.searchResources as jest.Mock).mockResolvedValue({});

      const action = getAction('search_vcf_operations_resources');
      const result = await action.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.resources).toEqual([]);
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('search_vcf_operations_resources');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.searchResources as jest.Mock).mockRejectedValue(
        new Error('Search failed')
      );

      const action = getAction('search_vcf_operations_resources');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('find_vcf_operations_resource_by_name action', () => {
    it('should return resource when found', async () => {
      (mockService.findResourceByName as jest.Mock).mockResolvedValue({
        identifier: 'res-1',
        name: 'VM-1',
      });

      const action = getAction('find_vcf_operations_resource_by_name');
      const result = await action.action({
        input: { resourceName: 'VM-1' },
        credentials: undefined,
      });

      expect(result.output.resource).not.toBeNull();
      expect(result.output.resource.name).toBe('VM-1');
    });

    it('should return null when resource not found', async () => {
      (mockService.findResourceByName as jest.Mock).mockResolvedValue(null);

      const action = getAction('find_vcf_operations_resource_by_name');
      const result = await action.action({
        input: { resourceName: 'non-existent' },
        credentials: undefined,
      });

      expect(result.output.resource).toBeNull();
    });

    it('should pass resourceType to service', async () => {
      (mockService.findResourceByName as jest.Mock).mockResolvedValue(null);

      const action = getAction('find_vcf_operations_resource_by_name');
      await action.action({
        input: { resourceName: 'VM-1', instanceName: 'vcfo-1', resourceType: 'vm' },
        credentials: undefined,
      });

      expect(mockService.findResourceByName).toHaveBeenCalledWith('VM-1', 'vcfo-1', 'vm');
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('find_vcf_operations_resource_by_name');
      await expect(
        action.action({
          input: { resourceName: 'VM-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.findResourceByName as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const action = getAction('find_vcf_operations_resource_by_name');
      await expect(
        action.action({
          input: { resourceName: 'VM-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('find_vcf_operations_resource_by_property action', () => {
    it('should return resource when found', async () => {
      (mockService.findResourceByProperty as jest.Mock).mockResolvedValue({
        identifier: 'res-1',
        name: 'VM-1',
      });

      const action = getAction('find_vcf_operations_resource_by_property');
      const result = await action.action({
        input: { propertyKey: 'uuid', propertyValue: 'abc-123' },
        credentials: undefined,
      });

      expect(result.output.resource).not.toBeNull();
      expect(result.output.resource.name).toBe('VM-1');
    });

    it('should return null when resource not found', async () => {
      (mockService.findResourceByProperty as jest.Mock).mockResolvedValue(null);

      const action = getAction('find_vcf_operations_resource_by_property');
      const result = await action.action({
        input: { propertyKey: 'uuid', propertyValue: 'not-found' },
        credentials: undefined,
      });

      expect(result.output.resource).toBeNull();
    });

    it('should pass instanceName to service', async () => {
      (mockService.findResourceByProperty as jest.Mock).mockResolvedValue(null);

      const action = getAction('find_vcf_operations_resource_by_property');
      await action.action({
        input: { propertyKey: 'uuid', propertyValue: 'abc', instanceName: 'vcfo-1' },
        credentials: undefined,
      });

      expect(mockService.findResourceByProperty).toHaveBeenCalledWith('uuid', 'abc', 'vcfo-1');
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      const action = getAction('find_vcf_operations_resource_by_property');
      await expect(
        action.action({
          input: { propertyKey: 'uuid', propertyValue: 'abc' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service error', async () => {
      (mockService.findResourceByProperty as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const action = getAction('find_vcf_operations_resource_by_property');
      await expect(
        action.action({
          input: { propertyKey: 'uuid', propertyValue: 'abc' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});
