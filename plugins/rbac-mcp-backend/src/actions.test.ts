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
    it('should be registered', () => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      const getRoleAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_role_details'
      )?.[0];
      expect(getRoleAction).toBeDefined();
    });
  });

  describe('list_available_permissions action', () => {
    it('should be registered', () => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      const listPermissionsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_available_permissions'
      )?.[0];
      expect(listPermissionsAction).toBeDefined();
    });
  });

  describe('list_conditional_rules action', () => {
    it('should be registered', () => {
      registerMcpActions(mockActionsRegistry as any, mockDiscovery, mockAuth);
      const listRulesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_conditional_rules'
      )?.[0];
      expect(listRulesAction).toBeDefined();
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
