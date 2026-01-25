import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError, ConflictError } from '@backstage/errors';
import { KubernetesService } from './service/KubernetesService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockService = {
    getResources: jest.fn(),
    getEvents: jest.fn(),
    getResourceGraph: jest.fn(),
  } as unknown as KubernetesService;

  const mockCatalog = {
    queryEntities: jest.fn(),
  };

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
      mockCatalog as any,
      mockPermissions,
      mockAuth,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(3);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_kro_resources');
    expect(registeredActions).toContain('get_kro_resource_events');
    expect(registeredActions).toContain('get_kro_resource_graph');
  });

  describe('get_kro_resources action', () => {
    let resourcesAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalog as any,
        mockPermissions,
        mockAuth,
      );
      resourcesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_kro_resources'
      )?.[0];
    });

    it('should throw InputError when all permissions denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        resourcesAction.action({
          input: { backstageEntityName: 'test-entity' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalog.queryEntities.mockResolvedValue({ items: [] });

      await expect(
        resourcesAction.action({
          input: { backstageEntityName: 'non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw ConflictError when multiple entities found', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [
          { metadata: { name: 'entity1' } },
          { metadata: { name: 'entity2' } },
        ],
      });

      await expect(
        resourcesAction.action({
          input: { backstageEntityName: 'ambiguous' },
          credentials: undefined,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw InputError when missing required annotations', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
            },
          },
        }],
      });

      await expect(
        resourcesAction.action({
          input: { backstageEntityName: 'test-entity' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch resources successfully', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/kro-rgd-name': 'test-rgd',
              'terasky.backstage.io/kro-rgd-id': 'rgd-123',
              'terasky.backstage.io/kro-instance-uid': 'instance-123',
              'terasky.backstage.io/kro-rgd-crd-name': 'tests.kro.run',
            },
          },
        }],
      });

      const mockResult = { resources: [], supportingResources: [] };
      (mockService.getResources as jest.Mock).mockResolvedValue(mockResult);

      const result = await resourcesAction.action({
        input: { backstageEntityName: 'test-entity' },
        credentials: undefined,
      });

      expect(mockService.getResources).toHaveBeenCalledWith(
        'test-cluster',
        'default',
        'test-rgd',
        'rgd-123',
        'instance-123',
        'test-entity',
        'tests.kro.run',
      );
      expect(result.output).toEqual(mockResult);
    });
  });

  describe('get_kro_resource_events action', () => {
    let eventsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalog as any,
        mockPermissions,
        mockAuth,
      );
      eventsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_kro_resource_events'
      )?.[0];
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        eventsAction.action({
          input: {
            backstageEntityName: 'test-entity',
            kubernetesNamespace: 'default',
            kubernetesResourceName: 'test-resource',
            kubernetesResourceKind: 'Pod',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch events successfully', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/kro-rgd-name': 'test-rgd',
              'terasky.backstage.io/kro-rgd-id': 'rgd-123',
              'terasky.backstage.io/kro-instance-uid': 'instance-123',
              'terasky.backstage.io/kro-rgd-crd-name': 'tests.kro.run',
            },
          },
        }],
      });

      const mockEvents = [{ reason: 'Created', message: 'Resource created' }];
      (mockService.getEvents as jest.Mock).mockResolvedValue(mockEvents);

      const result = await eventsAction.action({
        input: {
          backstageEntityName: 'test-entity',
          kubernetesNamespace: 'default',
          kubernetesResourceName: 'test-resource',
          kubernetesResourceKind: 'Pod',
        },
        credentials: undefined,
      });

      expect(mockService.getEvents).toHaveBeenCalled();
      expect(result.output.events).toEqual(mockEvents);
    });
  });

  describe('get_kro_resource_graph action', () => {
    let graphAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalog as any,
        mockPermissions,
        mockAuth,
      );
      graphAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_kro_resource_graph'
      )?.[0];
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        graphAction.action({
          input: { backstageEntityName: 'test-entity' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch resource graph successfully', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/kro-rgd-name': 'test-rgd',
              'terasky.backstage.io/kro-rgd-id': 'rgd-123',
              'terasky.backstage.io/kro-instance-uid': 'instance-123',
              'terasky.backstage.io/kro-rgd-crd-name': 'tests.kro.run',
            },
          },
        }],
      });

      const mockResources = [{ kind: 'Pod', name: 'test-pod' }];
      (mockService.getResourceGraph as jest.Mock).mockResolvedValue(mockResources);

      const result = await graphAction.action({
        input: { backstageEntityName: 'test-entity' },
        credentials: undefined,
      });

      expect(mockService.getResourceGraph).toHaveBeenCalled();
      expect(result.output.resources).toEqual(mockResources);
    });
  });
});

