import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Suppress console output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockCatalogService = {
    queryEntities: jest.fn(),
  };

  const mockDiscovery = mockServices.discovery.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://scaffolder-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
  });

  it('should register all 7 MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockCatalogService as any,
      mockDiscovery,
      mockAuth,
    );

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('list_software_templates');
    expect(registeredActions).toContain('get_software_template_parameter_schema');
    expect(registeredActions).toContain('run_software_template');
    expect(registeredActions).toContain('list_software_template_actions');
    expect(registeredActions).toContain('get_software_template_action_details');
    expect(registeredActions).toContain('list_software_template_extensions');
    expect(registeredActions).toContain('get_software_template_extension_details');
    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(7);
  });

  describe('list_software_templates action', () => {
    let listTemplatesAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      listTemplatesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_software_templates'
      )?.[0];
    });

    it('should list all templates', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'template-1', title: 'Template 1', description: 'First template', tags: ['java'] },
          },
          {
            kind: 'Template',
            metadata: { name: 'template-2', title: 'Template 2', tags: ['python', 'backend'] },
          },
        ],
      });

      const result = await listTemplatesAction.action({ credentials: undefined });

      expect(result.output.templates).toHaveLength(2);
      expect(result.output.count).toBe(2);
      expect(result.output.templates[0].name).toBe('template-1');
      expect(result.output.templates[0].tags).toContain('java');
    });

    it('should handle templates without tags', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'template-1' },
          },
        ],
      });

      const result = await listTemplatesAction.action({ credentials: undefined });

      expect(result.output.templates[0].tags).toEqual([]);
      expect(result.output.templates[0].title).toBe('template-1');
    });
  });

  describe('get_software_template_parameter_schema action', () => {
    let getSchemaAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      getSchemaAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_software_template_parameter_schema'
      )?.[0];
    });

    it('should throw error when template not found', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({ items: [] });

      await expect(
        getSchemaAction.action({
          input: { templateName: 'nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });

    it('should throw error when multiple templates found', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          { kind: 'Template', metadata: { name: 'my-template', namespace: 'default' } },
          { kind: 'Template', metadata: { name: 'my-template', namespace: 'other' } },
        ],
      });

      await expect(
        getSchemaAction.action({
          input: { templateName: 'my-template' },
          credentials: undefined,
        })
      ).rejects.toThrow('Multiple templates found');
    });
  });

  describe('list_software_template_actions action', () => {
    let listActionsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      listActionsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_software_template_actions'
      )?.[0];
    });

    it('should list all scaffolder actions', async () => {
      server.use(
        rest.get('http://scaffolder-backend/v2/actions', (_req, res, ctx) => {
          return res(ctx.json([
            { id: 'fetch:plain', name: 'fetch:plain', description: 'Fetch plain files' },
            { id: 'publish:github', name: 'publish:github', description: 'Publish to GitHub' },
          ]));
        }),
      );

      const result = await listActionsAction.action({ credentials: undefined });

      expect(result.output.actions).toHaveLength(2);
      expect(result.output.count).toBe(2);
    });
  });

  describe('get_software_template_action_details action', () => {
    let getActionDetailsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      getActionDetailsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_software_template_action_details'
      )?.[0];
    });

    it('should throw error when action not found', async () => {
      server.use(
        rest.get('http://scaffolder-backend/v2/actions', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      await expect(
        getActionDetailsAction.action({
          input: { actionId: 'nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });

  describe('list_software_template_extensions action', () => {
    let listExtensionsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      listExtensionsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'list_software_template_extensions'
      )?.[0];
    });

    it('should handle empty extensions list', async () => {
      server.use(
        rest.get('http://scaffolder-backend/v2/extensions', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      const result = await listExtensionsAction.action({ credentials: undefined });

      expect(result.output.extensions).toEqual([]);
      expect(result.output.count).toBe(0);
    });
  });

  describe('get_software_template_extension_details action', () => {
    let getExtensionAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      getExtensionAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_software_template_extension_details'
      )?.[0];
    });

    it('should throw error when extension not found', async () => {
      server.use(
        rest.get('http://scaffolder-backend/v2/extensions', (_req, res, ctx) => {
          return res(ctx.json([]));
        }),
      );

      await expect(
        getExtensionAction.action({
          input: { extensionId: 'nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow();
    });
  });

  describe('action schema validation', () => {
    it('should have valid schemas for all actions', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );

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
