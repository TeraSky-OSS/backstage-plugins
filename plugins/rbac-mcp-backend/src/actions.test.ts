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
const originalConsoleLog = console.log;
beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
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
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:rbac-mcp-backend' } } as any);
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
      expect(result.output.roles[0].source).toBe('rest');
    });

    it('should handle empty roles list', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      const result = await listRolesAction.action({ credentials: undefined });

      expect(result.output.roles).toHaveLength(0);
      expect(result.output.count).toBe(0);
    });

    it('should handle roles without metadata', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([
            { name: 'role:default/basic', memberReferences: [] },
          ]));
        }),
      );

      const result = await listRolesAction.action({ credentials: undefined });

      expect(result.output.roles[0].source).toBe('unknown');
      expect(result.output.roles[0].description).toBeUndefined();
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

    it('should get role details successfully', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/admin', (_req, res, ctx) => {
          return res(ctx.json([{ 
            name: 'role:default/admin', 
            memberReferences: ['user:default/admin'], 
            metadata: { description: 'Admin role', source: 'rest' } 
          }]));
        }),
        rest.get('http://permission-backend/policies/role/default/admin', (_req, res, ctx) => {
          return res(ctx.json([
            { permission: 'catalog-entity', policy: 'read', effect: 'allow', metadata: { source: 'rest' } },
          ]));
        }),
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 1, roleEntityRef: 'role:default/admin', pluginId: 'catalog', resourceType: 'catalog-entity', permissionMapping: ['read'], conditions: { rule: 'IS_ENTITY_OWNER' } },
          ]));
        }),
      );

      const result = await getRoleAction.action({
        input: { roleRef: 'role:default/admin' },
        credentials: undefined,
      });

      expect(result.output.role.name).toBe('role:default/admin');
      expect(result.output.permissions).toHaveLength(1);
      expect(result.output.conditionalPolicies).toHaveLength(1);
      expect(result.output.permissionCount).toBe(1);
      expect(result.output.conditionalPolicyCount).toBe(1);
    });

    it('should throw error for invalid role reference format - missing colon', async () => {
      await expect(
        getRoleAction.action({
          input: { roleRef: 'invalidref' },
          credentials: undefined,
        })
      ).rejects.toThrow('Invalid role reference format');
    });

    it('should throw error for invalid role reference format - missing slash', async () => {
      await expect(
        getRoleAction.action({
          input: { roleRef: 'role:defaultadmin' },
          credentials: undefined,
        })
      ).rejects.toThrow('Invalid role reference format');
    });

    it('should handle role not found', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/notfound', (_req, res, ctx) => {
          return res(ctx.status(404), ctx.text('Role not found'));
        }),
      );

      await expect(
        getRoleAction.action({
          input: { roleRef: 'role:default/notfound' },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });

    it('should handle non-array role response', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/admin', (_req, res, ctx) => {
          return res(ctx.json({ 
            name: 'role:default/admin', 
            memberReferences: ['user:default/admin'], 
            metadata: { description: 'Admin role', source: 'rest' } 
          }));
        }),
        rest.get('http://permission-backend/policies/role/default/admin', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      const result = await getRoleAction.action({
        input: { roleRef: 'role:default/admin' },
        credentials: undefined,
      });

      expect(result.output.role.name).toBe('role:default/admin');
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
            { pluginId: 'catalog', policies: [{ name: 'catalog.entity.read', policy: 'read', resourceType: 'catalog-entity' }] },
            { pluginId: 'scaffolder', policies: [{ name: 'scaffolder.task.read', policy: 'read' }] },
          ]));
        }),
      );

      const result = await listPermissionsAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.plugins).toHaveLength(2);
      expect(result.output.count).toBe(2);
      expect(result.output.totalPermissions).toBe(2);
    });

    it('should filter by pluginId', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/policies', (_req, res, ctx) => {
          return res(ctx.json([
            { pluginId: 'catalog', policies: [{ name: 'catalog.entity.read', policy: 'read' }] },
            { pluginId: 'scaffolder', policies: [{ name: 'scaffolder.task.read', policy: 'read' }] },
          ]));
        }),
      );

      const result = await listPermissionsAction.action({
        input: { pluginId: 'catalog' },
        credentials: undefined,
      });

      expect(result.output.plugins).toHaveLength(1);
      expect(result.output.plugins[0].pluginId).toBe('catalog');
    });

    it('should handle plugins without policies', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/policies', (_req, res, ctx) => {
          return res(ctx.json([
            { pluginId: 'catalog' },
          ]));
        }),
      );

      const result = await listPermissionsAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.totalPermissions).toBe(0);
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/policies', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        listPermissionsAction.action({ input: {}, credentials: undefined })
      ).rejects.toThrow();
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

    it('should create new role when role does not exist', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/newrole', (_req, res, ctx) => {
          return res(ctx.status(404));
        }),
        rest.post('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(201), ctx.json({ name: 'role:default/newrole' }));
        }),
      );

      const result = await grantRoleAction.action({
        input: {
          roleRef: 'role:default/newrole',
          members: ['user:default/john'],
          description: 'New role',
        },
        credentials: undefined,
      });

      expect(result.output.created).toBe(true);
      expect(result.output.roleRef).toBe('role:default/newrole');
      expect(result.output.memberReferences).toContain('user:default/john');
    });

    it('should update existing role', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.json([{ 
            name: 'role:default/existing', 
            memberReferences: ['user:default/existing'], 
            metadata: { description: 'Existing role' } 
          }]));
        }),
        rest.put('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.status(200));
        }),
      );

      const result = await grantRoleAction.action({
        input: {
          roleRef: 'role:default/existing',
          members: ['user:default/new'],
        },
        credentials: undefined,
      });

      expect(result.output.created).toBe(false);
      expect(result.output.memberReferences).toContain('user:default/existing');
      expect(result.output.memberReferences).toContain('user:default/new');
    });

    it('should throw error for invalid role reference', async () => {
      await expect(
        grantRoleAction.action({
          input: { roleRef: 'invalid', members: ['user:default/john'] },
          credentials: undefined,
        })
      ).rejects.toThrow('Invalid role reference format');
    });

    it('should handle create role failure', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/newrole', (_req, res, ctx) => {
          return res(ctx.status(404));
        }),
        rest.post('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ error: 'Invalid request' }));
        }),
      );

      await expect(
        grantRoleAction.action({
          input: { roleRef: 'role:default/newrole', members: ['user:default/john'] },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });

    it('should handle update role failure', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.json([{ name: 'role:default/existing', memberReferences: [] }]));
        }),
        rest.put('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.text('Update failed'));
        }),
      );

      await expect(
        grantRoleAction.action({
          input: { roleRef: 'role:default/existing', members: ['user:default/john'] },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });

    it('should handle check role existence failure', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Server error'));
        }),
      );

      await expect(
        grantRoleAction.action({
          input: { roleRef: 'role:default/existing', members: ['user:default/john'] },
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

    it('should assign permissions to existing role', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/admin', (_req, res, ctx) => {
          return res(ctx.json([{ name: 'role:default/admin' }]));
        }),
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(201));
        }),
      );

      const result = await assignPermissionsAction.action({
        input: {
          roleRef: 'role:default/admin',
          permissions: [
            { permission: 'catalog-entity', policy: 'read', effect: 'allow' },
          ],
        },
        credentials: undefined,
      });

      expect(result.output.roleRef).toBe('role:default/admin');
      expect(result.output.addedPermissions).toBe(1);
    });

    it('should throw error if role does not exist', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/notfound', (_req, res, ctx) => {
          return res(ctx.status(404));
        }),
      );

      await expect(
        assignPermissionsAction.action({
          input: {
            roleRef: 'role:default/notfound',
            permissions: [{ permission: 'catalog-entity', policy: 'read', effect: 'allow' }],
          },
          credentials: undefined,
        })
      ).rejects.toThrow('does not exist');
    });

    it('should throw error for invalid role reference', async () => {
      await expect(
        assignPermissionsAction.action({
          input: {
            roleRef: 'invalid',
            permissions: [{ permission: 'catalog-entity', policy: 'read', effect: 'allow' }],
          },
          credentials: undefined,
        })
      ).rejects.toThrow('Invalid role reference format');
    });

    it('should handle permissions assignment failure', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/admin', (_req, res, ctx) => {
          return res(ctx.json([{ name: 'role:default/admin' }]));
        }),
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ error: 'Invalid permission' }));
        }),
      );

      await expect(
        assignPermissionsAction.action({
          input: {
            roleRef: 'role:default/admin',
            permissions: [{ permission: 'invalid', policy: 'read', effect: 'allow' }],
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
        rest.post('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.status(201), ctx.json({ id: 1 }));
        }),
      );

      const result = await createConditionalAction.action({
        input: {
          roleRef: 'role:default/admin',
          pluginId: 'catalog',
          resourceType: 'catalog-entity',
          permissionMapping: ['read'],
          conditions: { rule: 'IS_ENTITY_OWNER' },
        },
        credentials: undefined,
      });

      expect(result.output.id).toBe(1);
      expect(result.output.roleRef).toBe('role:default/admin');
    });

    it('should handle API errors', async () => {
      server.use(
        rest.post('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.text('Invalid condition'));
        }),
      );

      await expect(
        createConditionalAction.action({
          input: {
            roleRef: 'role:default/admin',
            pluginId: 'catalog',
            resourceType: 'catalog-entity',
            permissionMapping: ['read'],
            conditions: { rule: 'INVALID' },
          },
          credentials: undefined,
        })
      ).rejects.toThrow();
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

    it('should list all conditional rules', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([
            { pluginId: 'catalog', rules: [{ name: 'IS_ENTITY_OWNER', description: 'Check ownership', resourceType: 'catalog-entity' }] },
          ]));
        }),
      );

      const result = await listRulesAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.plugins).toHaveLength(1);
      expect(result.output.totalRules).toBe(1);
    });

    it('should filter by pluginId', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([
            { pluginId: 'catalog', rules: [{ name: 'IS_ENTITY_OWNER' }] },
            { pluginId: 'scaffolder', rules: [{ name: 'IS_TASK_OWNER' }] },
          ]));
        }),
      );

      const result = await listRulesAction.action({
        input: { pluginId: 'catalog' },
        credentials: undefined,
      });

      expect(result.output.plugins).toHaveLength(1);
      expect(result.output.plugins[0].pluginId).toBe('catalog');
    });

    it('should handle plugins without rules', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.json([{ pluginId: 'catalog' }]));
        }),
      );

      const result = await listRulesAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.totalRules).toBe(0);
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://permission-backend/plugins/condition-rules', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        listRulesAction.action({ input: {}, credentials: undefined })
      ).rejects.toThrow();
    });
  });

  describe('get_user_effective_permissions action', () => {
    let getUserPermissionsAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      getUserPermissionsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_user_effective_permissions'
      )?.[0];
    });

    it('should get user effective permissions', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([
            { name: 'role:default/admin', memberReferences: ['user:default/john'], metadata: { description: 'Admin', source: 'rest' } },
          ]));
        }),
        rest.get('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.json([
            { entityReference: 'role:default/admin', permission: 'catalog-entity', policy: 'read', effect: 'allow', metadata: { source: 'rest' } },
          ]));
        }),
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 1, roleEntityRef: 'role:default/admin', pluginId: 'catalog', resourceType: 'catalog-entity', permissionMapping: ['read'], conditions: {} },
          ]));
        }),
      );

      const result = await getUserPermissionsAction.action({
        input: { memberRef: 'user:default/john' },
        credentials: undefined,
      });

      expect(result.output.memberRef).toBe('user:default/john');
      expect(result.output.roles).toHaveLength(1);
      expect(result.output.permissions).toHaveLength(1);
      expect(result.output.conditionalPolicies).toHaveLength(1);
    });

    it('should return empty arrays for user with no roles', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
        rest.get('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      const result = await getUserPermissionsAction.action({
        input: { memberRef: 'user:default/nobody' },
        credentials: undefined,
      });

      expect(result.output.roleCount).toBe(0);
      expect(result.output.permissionCount).toBe(0);
      expect(result.output.conditionalPolicyCount).toBe(0);
    });

    it('should handle API errors for roles', async () => {
      server.use(
        rest.get('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        getUserPermissionsAction.action({
          input: { memberRef: 'user:default/john' },
          credentials: undefined,
        })
      ).rejects.toThrow();
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

    it('should list all conditional policies', async () => {
      server.use(
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 1, roleEntityRef: 'role:default/admin', pluginId: 'catalog', resourceType: 'catalog-entity', permissionMapping: ['read'], conditions: {} },
            { id: 2, roleEntityRef: 'role:default/developer', pluginId: 'scaffolder', resourceType: 'scaffolder-template', permissionMapping: ['use'], conditions: {} },
          ]));
        }),
      );

      const result = await listPoliciesAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.policies).toHaveLength(2);
      expect(result.output.count).toBe(2);
    });

    it('should filter by roleRef', async () => {
      server.use(
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 1, roleEntityRef: 'role:default/admin', pluginId: 'catalog', resourceType: 'catalog-entity', permissionMapping: ['read'], conditions: {} },
            { id: 2, roleEntityRef: 'role:default/developer', pluginId: 'scaffolder', resourceType: 'scaffolder-template', permissionMapping: ['use'], conditions: {} },
          ]));
        }),
      );

      const result = await listPoliciesAction.action({
        input: { roleRef: 'role:default/admin' },
        credentials: undefined,
      });

      expect(result.output.policies).toHaveLength(1);
      expect(result.output.policies[0].roleRef).toBe('role:default/admin');
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://permission-backend/roles/conditions', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        }),
      );

      await expect(
        listPoliciesAction.action({ input: {}, credentials: undefined })
      ).rejects.toThrow();
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

    it('should create new role with permissions', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/newrole', (_req, res, ctx) => {
          return res(ctx.status(404));
        }),
        rest.post('http://permission-backend/roles', (_req, res, ctx) => {
          return res(ctx.status(201));
        }),
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(201));
        }),
      );

      const result = await createRoleAction.action({
        input: {
          roleRef: 'role:default/newrole',
          members: ['user:default/john'],
          description: 'New role',
          permissions: [
            { permission: 'catalog-entity', policy: 'read', effect: 'allow' },
          ],
        },
        credentials: undefined,
      });

      expect(result.output.created).toBe(true);
      expect(result.output.roleRef).toBe('role:default/newrole');
      expect(result.output.addedPermissions).toBe(1);
    });

    it('should update existing role with permissions', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.json([{ name: 'role:default/existing', memberReferences: ['user:default/existing'], metadata: {} }]));
        }),
        rest.put('http://permission-backend/roles/role/default/existing', (_req, res, ctx) => {
          return res(ctx.status(200));
        }),
        rest.post('http://permission-backend/policies', (_req, res, ctx) => {
          return res(ctx.status(201));
        }),
      );

      const result = await createRoleAction.action({
        input: {
          roleRef: 'role:default/existing',
          members: ['user:default/new'],
          permissions: [
            { permission: 'catalog-entity', policy: 'read', effect: 'allow' },
          ],
        },
        credentials: undefined,
      });

      expect(result.output.created).toBe(false);
      expect(result.output.memberReferences).toContain('user:default/existing');
      expect(result.output.memberReferences).toContain('user:default/new');
    });

    it('should throw error for invalid role reference', async () => {
      await expect(
        createRoleAction.action({
          input: {
            roleRef: 'invalid',
            members: ['user:default/john'],
            permissions: [{ permission: 'catalog-entity', policy: 'read', effect: 'allow' }],
          },
          credentials: undefined,
        })
      ).rejects.toThrow('Invalid role reference format');
    });

    it('should handle role check failure', async () => {
      server.use(
        rest.get('http://permission-backend/roles/role/default/newrole', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        }),
      );

      await expect(
        createRoleAction.action({
          input: {
            roleRef: 'role:default/newrole',
            members: ['user:default/john'],
            permissions: [{ permission: 'catalog-entity', policy: 'read', effect: 'allow' }],
          },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });

  describe('action schema validation', () => {
    it('should have valid schemas for all actions', () => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);

      mockActionsRegistry.register.mock.calls.forEach((call: any[]) => {
        const action = call[0];
        expect(action.name).toBeDefined();
        expect(action.title).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.schema).toBeDefined();
        expect(action.schema.input).toBeDefined();
        expect(action.schema.output).toBeDefined();
        expect(action.action).toBeDefined();
        expect(typeof action.action).toBe('function');
      });
    });
  });
});
