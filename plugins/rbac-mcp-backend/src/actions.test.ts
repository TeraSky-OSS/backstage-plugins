import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Suppress console output during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockDiscovery = mockServices.discovery.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://permission-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
  });

  it('should register all 10 MCP actions', () => {
    registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('list_rbac_roles');
    expect(registeredActions).toContain('get_role_details');
    expect(registeredActions).toContain('list_available_permissions');
    expect(registeredActions).toContain('grant_role_to_members');
    expect(registeredActions).toContain('assign_permissions_to_role');
    expect(registeredActions).toContain('create_conditional_permission');
    expect(registeredActions).toContain('list_conditional_rules');
    expect(registeredActions).toContain('get_user_effective_permissions');
    expect(registeredActions).toContain('list_conditional_policies');
    expect(registeredActions).toContain('create_role_with_permissions');
    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(10);
  });

  describe('list_rbac_roles action', () => {
    let listRolesAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      listRolesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_rbac_roles'
      )?.[0];
    });

    it('should list all roles', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([
            { name: 'role:default/admin', memberReferences: ['user:default/admin'], metadata: { description: 'Admin role', source: 'rest' } },
            { name: 'role:default/developer', memberReferences: ['group:default/devs'], metadata: { source: 'configuration' } },
          ]));
        }),
      );

      const result = await listRolesAction.action({ credentials: undefined });

      expect(result.output.roles).toHaveLength(2);
      expect(result.output.count).toBe(2);
      expect(result.output.roles[0].name).toBe('role:default/admin');
      expect(result.output.roles[0].description).toBe('Admin role');
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(listRolesAction.action({ credentials: undefined })).rejects.toThrow();
    });
  });

  describe('get_role_details action', () => {
    let getRoleAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      getRoleAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_role_details'
      )?.[0];
    });

    it('should get role details with permissions', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([
            { name: 'role:default/admin', memberReferences: ['user:default/admin'], metadata: { description: 'Admin', source: 'rest' } },
          ]));
        }),
        rest.get('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.json([
            { entityReference: 'role:default/admin', permission: 'catalog.entity.read', policy: 'allow', effect: 'allow' },
          ]));
        }),
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      const result = await getRoleAction.action({
        input: { roleRef: 'role:default/admin' },
        credentials: undefined,
      });

      expect(result.output.role.name).toBe('role:default/admin');
      expect(result.output.permissions).toHaveLength(1);
    });

    it('should throw error when role not found', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      await expect(
        getRoleAction.action({
          input: { roleRef: 'role:default/nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });

  describe('list_available_permissions action', () => {
    let listPermissionsAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      listPermissionsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_available_permissions'
      )?.[0];
    });

    it('should list all available permissions', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/policies', (_req, res, ctx) => {
          return res(ctx.json([
            { pluginId: 'catalog', policies: [{ permission: 'catalog.entity.read', policy: 'read' }] },
          ]));
        }),
      );

      const result = await listPermissionsAction.action({ credentials: undefined });

      expect(result.output.plugins).toBeDefined();
      expect(result.output.totalPermissions).toBeGreaterThan(0);
    });
  });

  describe('grant_role_to_members action', () => {
    let grantRoleAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      grantRoleAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'grant_role_to_members'
      )?.[0];
    });

    it('should grant role to members', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([
            { name: 'role:default/admin', memberReferences: ['user:default/existing'] },
          ]));
        }),
        rest.put('http://permission-backend/roles/role/default/admin', (_req, res, ctx) => {
          return res(ctx.status(200), ctx.json({ success: true }));
        }),
      );

      const result = await grantRoleAction.action({
        input: { roleRef: 'role:default/admin', members: ['user:default/newuser'] },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
    });

    it('should throw error when role not found', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      await expect(
        grantRoleAction.action({
          input: { roleRef: 'role:default/nonexistent', members: ['user:default/user'] },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });

  describe('assign_permissions_to_role action', () => {
    let assignPermissionsAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      assignPermissionsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'assign_permissions_to_role'
      )?.[0];
    });

    it('should assign permissions to role', async () => {
      server.use(
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(201), ctx.json({ success: true }));
        }),
      );

      const result = await assignPermissionsAction.action({
        input: {
          roleRef: 'role:default/admin',
          permissions: [{ permission: 'catalog.entity.read', policy: 'read', effect: 'allow' }],
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
    });

    it('should handle API errors', async () => {
      server.use(
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
        }),
      );

      await expect(
        assignPermissionsAction.action({
          input: {
            roleRef: 'role:default/admin',
            permissions: [{ permission: 'test', policy: 'read', effect: 'allow' }],
          },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });

  describe('create_conditional_permission action', () => {
    let createConditionalAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      createConditionalAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'create_conditional_permission'
      )?.[0];
    });

    it('should create conditional permission', async () => {
      server.use(
        rest.post('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.status(201), ctx.json({ id: 1 }));
        }),
      );

      const result = await createConditionalAction.action({
        input: {
          roleRef: 'role:default/admin',
          pluginId: 'catalog',
          resourceType: 'catalog-entity',
          permission: 'catalog.entity.read',
          conditions: { rule: 'IS_ENTITY_OWNER', params: {} },
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
    });
  });

  describe('list_conditional_rules action', () => {
    let listRulesAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      listRulesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_conditional_rules'
      )?.[0];
    });

    it('should list conditional rules', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json({
            catalog: [{ name: 'IS_ENTITY_OWNER', description: 'Check entity owner', resourceType: 'catalog-entity' }],
          }));
        }),
      );

      const result = await listRulesAction.action({ credentials: undefined });

      expect(result.output.plugins).toBeDefined();
    });
  });

  describe('get_user_effective_permissions action', () => {
    let getEffectiveAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      getEffectiveAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_user_effective_permissions'
      )?.[0];
    });

    it('should get user effective permissions', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([
            { name: 'role:default/admin', memberReferences: ['user:default/testuser'] },
          ]));
        }),
        rest.get('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.json([
            { entityReference: 'role:default/admin', permission: 'catalog.entity.read', policy: 'allow', effect: 'allow' },
          ]));
        }),
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      const result = await getEffectiveAction.action({
        input: { userRef: 'user:default/testuser' },
        credentials: undefined,
      });

      expect(result.output.userRef).toBe('user:default/testuser');
      expect(result.output.roles).toBeDefined();
    });
  });

  describe('list_conditional_policies action', () => {
    let listPoliciesAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      listPoliciesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_conditional_policies'
      )?.[0];
    });

    it('should list conditional policies', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 1, roleEntityRef: 'role:default/admin', result: 'CONDITIONAL', pluginId: 'catalog' },
          ]));
        }),
      );

      const result = await listPoliciesAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.policies).toBeDefined();
    });

    it('should filter by roleRef', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 1, roleEntityRef: 'role:default/admin', result: 'CONDITIONAL', pluginId: 'catalog' },
            { id: 2, roleEntityRef: 'role:default/dev', result: 'CONDITIONAL', pluginId: 'catalog' },
          ]));
        }),
      );

      const result = await listPoliciesAction.action({
        input: { roleRef: 'role:default/admin' },
        credentials: undefined,
      });

      expect(result.output.policies.filter((p: any) => p.roleEntityRef === 'role:default/admin')).toBeDefined();
    });
  });

  describe('create_role_with_permissions action', () => {
    let createRoleAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      createRoleAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'create_role_with_permissions'
      )?.[0];
    });

    it('should create role with permissions', async () => {
      server.use(
        rest.post('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(201), ctx.json({ success: true }));
        }),
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(201), ctx.json({ success: true }));
        }),
      );

      const result = await createRoleAction.action({
        input: {
          roleName: 'test-role',
          namespace: 'default',
          members: ['user:default/testuser'],
          permissions: [{ permission: 'catalog.entity.read', policy: 'read', effect: 'allow' }],
          description: 'Test role',
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
      expect(result.output.roleRef).toBe('role:default/test-role');
    });

    it('should handle role creation failure', async () => {
      server.use(
        rest.post('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Failed' }));
        }),
      );

      await expect(
        createRoleAction.action({
          input: {
            roleName: 'test-role',
            namespace: 'default',
            members: ['user:default/testuser'],
            permissions: [],
          },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });
});
