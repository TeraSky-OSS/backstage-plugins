import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
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
    getV2ResourceGraph: jest.fn(),
  } as unknown as KubernetesService;

  const mockCatalog = {
    queryEntities: jest.fn(),
  };

  const mockPermissions = mockServices.permissions.mock();
  const mockAuth = mockServices.auth.mock();
  const mockConfig = new ConfigReader({});

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
      mockConfig,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(3);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_crossplane_resources');
    expect(registeredActions).toContain('get_crossplane_events');
    expect(registeredActions).toContain('get_crossplane_resource_graph');
  });

  describe('get_crossplane_resources action', () => {
    let resourcesAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalog as any,
        mockPermissions,
        mockAuth,
        mockConfig,
      );
      resourcesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_crossplane_resources'
      )?.[0];
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

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([
        { result: AuthorizeResult.DENY },
        { result: AuthorizeResult.DENY },
        { result: AuthorizeResult.DENY },
      ]);

      await expect(
        resourcesAction.action({
          input: { backstageEntityName: 'test-entity' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should fetch V1 resources when crossplane-version is v1', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/crossplane-version': 'v1',
              'terasky.backstage.io/claim-name': 'test-claim',
              'terasky.backstage.io/claim-group': 'test.example.com',
              'terasky.backstage.io/claim-version': 'v1',
              'terasky.backstage.io/claim-plural': 'testclaims',
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

      expect(mockService.getResources).toHaveBeenCalled();
      expect(result.output).toEqual(mockResult);
    });

    it('should fetch V2 resources when crossplane-version is v2', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/crossplane-version': 'v2',
              'terasky.backstage.io/crossplane-scope': 'Namespaced',
              'terasky.backstage.io/composite-name': 'test-composite',
              'terasky.backstage.io/composite-group': 'test.example.com',
              'terasky.backstage.io/composite-version': 'v1',
              'terasky.backstage.io/composite-plural': 'testcomposites',
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

      expect(mockService.getResources).toHaveBeenCalled();
      expect(result.output).toEqual(mockResult);
    });

    it('should throw InputError when missing required annotations', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/crossplane-version': 'v1',
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
  });

  describe('get_crossplane_events action', () => {
    let eventsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalog as any,
        mockPermissions,
        mockAuth,
        mockConfig,
      );
      eventsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_crossplane_events'
      )?.[0];
    });

    it('should throw InputError when all permissions denied', async () => {
      mockPermissions.authorize.mockResolvedValue([
        { result: AuthorizeResult.DENY },
        { result: AuthorizeResult.DENY },
        { result: AuthorizeResult.DENY },
      ]);

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

    it('should throw InputError when entity not found', async () => {
      mockCatalog.queryEntities.mockResolvedValue({ items: [] });

      await expect(
        eventsAction.action({
          input: {
            backstageEntityName: 'non-existent',
            kubernetesNamespace: 'default',
            kubernetesResourceName: 'test-resource',
            kubernetesResourceKind: 'Pod',
          },
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
        eventsAction.action({
          input: {
            backstageEntityName: 'ambiguous',
            kubernetesNamespace: 'default',
            kubernetesResourceName: 'test-resource',
            kubernetesResourceKind: 'Pod',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('get_crossplane_resource_graph action', () => {
    let graphAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockCatalog as any,
        mockPermissions,
        mockAuth,
        mockConfig,
      );
      graphAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_crossplane_resource_graph'
      )?.[0];
    });

    it('should throw InputError when all permissions denied', async () => {
      mockPermissions.authorize.mockResolvedValue([
        { result: AuthorizeResult.DENY },
        { result: AuthorizeResult.DENY },
      ]);

      await expect(
        graphAction.action({
          input: { backstageEntityName: 'test-entity' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when entity not found', async () => {
      mockCatalog.queryEntities.mockResolvedValue({ items: [] });

      await expect(
        graphAction.action({
          input: { backstageEntityName: 'non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should call getV2ResourceGraph for V2 entities', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/crossplane-version': 'v2',
              'terasky.backstage.io/crossplane-scope': 'Namespaced',
              'terasky.backstage.io/composite-name': 'test-composite',
              'terasky.backstage.io/composite-group': 'test.example.com',
              'terasky.backstage.io/composite-version': 'v1',
              'terasky.backstage.io/composite-plural': 'testcomposites',
            },
          },
        }],
      });

      const mockResult = { resources: [] };
      (mockService.getV2ResourceGraph as jest.Mock).mockResolvedValue(mockResult);

      const result = await graphAction.action({
        input: { backstageEntityName: 'test-entity' },
        credentials: undefined,
      });

      expect(mockService.getV2ResourceGraph).toHaveBeenCalled();
      expect(result.output).toEqual(mockResult);
    });

    it('should call getResourceGraph for V1 entities', async () => {
      mockCatalog.queryEntities.mockResolvedValue({
        items: [{
          metadata: {
            name: 'test-entity',
            namespace: 'default',
            annotations: {
              'backstage.io/managed-by-location': 'cluster: test-cluster',
              'terasky.backstage.io/crossplane-version': 'v1',
              'terasky.backstage.io/claim-name': 'test-claim',
              'terasky.backstage.io/claim-group': 'test.example.com',
              'terasky.backstage.io/claim-version': 'v1',
              'terasky.backstage.io/claim-plural': 'testclaims',
            },
          },
        }],
      });

      const mockResult = { resources: [] };
      (mockService.getResourceGraph as jest.Mock).mockResolvedValue(mockResult);

      const result = await graphAction.action({
        input: { backstageEntityName: 'test-entity' },
        credentials: undefined,
      });

      expect(mockService.getResourceGraph).toHaveBeenCalled();
      expect(result.output).toEqual(mockResult);
    });
  });
});

