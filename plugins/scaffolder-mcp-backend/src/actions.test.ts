import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

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
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:scaffolder-mcp-backend' } } as any);
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
            metadata: { name: 'template-1', title: 'Template 1', description: 'First template', tags: ['java'], namespace: 'default' },
          },
          {
            kind: 'Template',
            metadata: { name: 'template-2', title: 'Template 2', tags: ['python', 'backend'], namespace: 'default' },
          },
        ],
      });

      const result = await listTemplatesAction.action({ credentials: undefined });

      expect(result.output.templates).toHaveLength(2);
      expect(result.output.count).toBe(2);
      expect(result.output.templates[0].name).toBe('template-1');
      expect(result.output.templates[0].tags).toContain('java');
      expect(result.output.templates[0].entityRef).toBe('template:default/template-1');
    });

    it('should handle templates without tags', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'template-1', namespace: 'default' },
          },
        ],
      });

      const result = await listTemplatesAction.action({ credentials: undefined });

      expect(result.output.templates[0].tags).toEqual([]);
      expect(result.output.templates[0].title).toBe('template-1');
    });

    it('should handle templates without title', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'no-title-template', namespace: 'default' },
          },
        ],
      });

      const result = await listTemplatesAction.action({ credentials: undefined });

      expect(result.output.templates[0].title).toBe('no-title-template');
    });

    it('should handle empty templates list', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({ items: [] });

      const result = await listTemplatesAction.action({ credentials: undefined });

      expect(result.output.templates).toHaveLength(0);
      expect(result.output.count).toBe(0);
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

    it('should get template parameter schema', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', title: 'My Template', description: 'A test template', namespace: 'default' },
            spec: {
              parameters: [
                { title: 'Step 1', properties: { name: { type: 'string' } }, required: ['name'] },
              ],
            },
          },
        ],
      });

      const result = await getSchemaAction.action({
        input: { templateNameOrRef: 'my-template' },
        credentials: undefined,
      });

      expect(result.output.templateName).toBe('my-template');
      expect(result.output.templateTitle).toBe('My Template');
      expect(result.output.parameters).toHaveLength(1);
      expect(result.output.entityRef).toBe('template:default/my-template');
    });

    it('should handle full entity ref', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'custom' },
            spec: { parameters: [] },
          },
        ],
      });

      const result = await getSchemaAction.action({
        input: { templateNameOrRef: 'template:custom/my-template' },
        credentials: undefined,
      });

      expect(result.output.entityRef).toBe('template:custom/my-template');
    });

    it('should handle parameters as single object', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: {
              parameters: { title: 'Single Step', properties: { name: { type: 'string' } } },
            },
          },
        ],
      });

      const result = await getSchemaAction.action({
        input: { templateNameOrRef: 'my-template' },
        credentials: undefined,
      });

      expect(result.output.parameters).toHaveLength(1);
    });

    it('should handle template without parameters', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: {},
          },
        ],
      });

      const result = await getSchemaAction.action({
        input: { templateNameOrRef: 'my-template' },
        credentials: undefined,
      });

      expect(result.output.parameters).toEqual([]);
    });

    it('should throw error when template not found', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({ items: [] });

      await expect(
        getSchemaAction.action({
          input: { templateNameOrRef: 'nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow('No template found');
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
          input: { templateNameOrRef: 'my-template' },
          credentials: undefined,
        })
      ).rejects.toThrow('Multiple templates found');
    });

    it('should throw error if entity is not a template', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          { kind: 'Component', metadata: { name: 'my-component', namespace: 'default' } },
        ],
      });

      await expect(
        getSchemaAction.action({
          input: { templateNameOrRef: 'my-component' },
          credentials: undefined,
        })
      ).rejects.toThrow('is not a Template');
    });
  });

  describe('run_software_template action', () => {
    let runTemplateAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
      runTemplateAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'run_software_template'
      )?.[0];
    });

    it('should run template successfully', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: { parameters: [] },
          },
        ],
      });

      server.use(
        http.post('http://scaffolder-backend/v2/tasks', () => {
          return HttpResponse.json({ id: 'task-123' });
        }),
        http.get('http://scaffolder-backend/v2/tasks/task-123', () => {
          return HttpResponse.json({ status: 'completed', output: { repoUrl: 'https://github.com/test/repo' } });
        }),
      );

      const result = await runTemplateAction.action({
        input: {
          templateNameOrRef: 'my-template',
          parameters: { name: 'test-project' },
        },
        credentials: undefined,
      });

      expect(result.output.taskId).toBe('task-123');
      expect(result.output.status).toBe('completed');
      expect(result.output.output.repoUrl).toBe('https://github.com/test/repo');
    });

    it('should handle template execution failure', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: { parameters: [] },
          },
        ],
      });

      server.use(
        http.post('http://scaffolder-backend/v2/tasks', () => {
          return new HttpResponse('Invalid parameters', { status: 400 });
        }),
      );

      await expect(
        runTemplateAction.action({
          input: { templateNameOrRef: 'my-template', parameters: {} },
          credentials: undefined,
        })
      ).rejects.toThrow('Failed to execute template');
    });

    it('should handle task failed status', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: { parameters: [] },
          },
        ],
      });

      server.use(
        http.post('http://scaffolder-backend/v2/tasks', () => {
          return HttpResponse.json({ id: 'task-123' });
        }),
        http.get('http://scaffolder-backend/v2/tasks/task-123', () => {
          return HttpResponse.json({ status: 'failed', error: { message: 'Step failed' } });
        }),
      );

      await expect(
        runTemplateAction.action({
          input: { templateNameOrRef: 'my-template', parameters: {} },
          credentials: undefined,
        })
      ).rejects.toThrow('Template execution failed');
    });

    it('should handle task cancelled status', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: { parameters: [] },
          },
        ],
      });

      server.use(
        http.post('http://scaffolder-backend/v2/tasks', () => {
          return HttpResponse.json({ id: 'task-123' });
        }),
        http.get('http://scaffolder-backend/v2/tasks/task-123', () => {
          return HttpResponse.json({ status: 'cancelled' });
        }),
      );

      await expect(
        runTemplateAction.action({
          input: { templateNameOrRef: 'my-template', parameters: {} },
          credentials: undefined,
        })
      ).rejects.toThrow('Template execution was cancelled');
    });

    it('should handle task status fetch error', async () => {
      mockCatalogService.queryEntities.mockResolvedValue({
        items: [
          {
            kind: 'Template',
            metadata: { name: 'my-template', namespace: 'default' },
            spec: { parameters: [] },
          },
        ],
      });

      server.use(
        http.post('http://scaffolder-backend/v2/tasks', () => {
          return HttpResponse.json({ id: 'task-123' });
        }),
        http.get('http://scaffolder-backend/v2/tasks/task-123', () => {
          return new HttpResponse('Server error', { status: 500 });
        }),
      );

      await expect(
        runTemplateAction.action({
          input: { templateNameOrRef: 'my-template', parameters: {} },
          credentials: undefined,
        })
      ).rejects.toThrow('Failed to fetch task status');
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
        http.get('http://scaffolder-backend/v2/actions', () => {
          return HttpResponse.json([
            { id: 'fetch:plain', description: 'Fetch plain files' },
            { id: 'publish:github', description: 'Publish to GitHub' },
          ]);
        }),
      );

      const result = await listActionsAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.actions).toHaveLength(2);
      expect(result.output.count).toBe(2);
    });

    it('should filter actions by string', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return HttpResponse.json([
            { id: 'fetch:plain', description: 'Fetch plain files' },
            { id: 'publish:github', description: 'Publish to GitHub' },
            { id: 'publish:gitlab', description: 'Publish to GitLab' },
          ]);
        }),
      );

      const result = await listActionsAction.action({
        input: { filter: 'publish' },
        credentials: undefined,
      });

      expect(result.output.actions).toHaveLength(2);
      expect(result.output.actions.every((a: any) => a.id.includes('publish'))).toBe(true);
    });

    it('should filter actions by description', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return HttpResponse.json([
            { id: 'fetch:plain', description: 'Fetch plain files' },
            { id: 'publish:github', description: 'Publish to GitHub' },
          ]);
        }),
      );

      const result = await listActionsAction.action({
        input: { filter: 'github' },
        credentials: undefined,
      });

      expect(result.output.actions).toHaveLength(1);
      expect(result.output.actions[0].id).toBe('publish:github');
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return new HttpResponse('Server error', { status: 500 });
        }),
      );

      await expect(
        listActionsAction.action({ input: {}, credentials: undefined })
      ).rejects.toThrow('Failed to fetch actions');
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

    it('should get action details', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return HttpResponse.json([
            {
              id: 'fetch:plain',
              description: 'Fetch plain files',
              schema: { input: { type: 'object' }, output: { type: 'object' } },
              examples: [{ title: 'Example', description: 'An example' }],
            },
          ]);
        }),
      );

      const result = await getActionDetailsAction.action({
        input: { actionId: 'fetch:plain' },
        credentials: undefined,
      });

      expect(result.output.id).toBe('fetch:plain');
      expect(result.output.description).toBe('Fetch plain files');
      expect(result.output.schema).toBeDefined();
      expect(result.output.examples).toHaveLength(1);
    });

    it('should handle action without schema', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return HttpResponse.json([
            { id: 'fetch:plain', description: 'Fetch plain files' },
          ]);
        }),
      );

      const result = await getActionDetailsAction.action({
        input: { actionId: 'fetch:plain' },
        credentials: undefined,
      });

      expect(result.output.schema).toEqual({});
      expect(result.output.examples).toEqual([]);
    });

    it('should throw error when action not found', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return HttpResponse.json([]);
        }),
      );

      await expect(
        getActionDetailsAction.action({
          input: { actionId: 'nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow('No action found');
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/actions', () => {
          return new HttpResponse('Server error', { status: 500 });
        }),
      );

      await expect(
        getActionDetailsAction.action({
          input: { actionId: 'fetch:plain' },
          credentials: undefined,
        })
      ).rejects.toThrow('Failed to fetch actions');
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

    it('should list all extensions', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({
            filters: {
              parseRepoUrl: { description: 'Parse repository URL' },
              parseEntityRef: { description: 'Parse entity reference' },
            },
            globals: {
              functions: {
                uuid: { description: 'Generate UUID' },
              },
              values: {
                timestamp: { description: 'Current timestamp', value: '2025-01-01' },
              },
            },
          });
        }),
      );

      const result = await listExtensionsAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.extensions).toHaveLength(4);
      expect(result.output.count).toBe(4);
      expect(result.output.extensions.filter((e: any) => e.type === 'filter')).toHaveLength(2);
      expect(result.output.extensions.filter((e: any) => e.type === 'function')).toHaveLength(1);
      expect(result.output.extensions.filter((e: any) => e.type === 'value')).toHaveLength(1);
    });

    it('should filter extensions by name', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({
            filters: {
              parseRepoUrl: { description: 'Parse repository URL' },
              parseEntityRef: { description: 'Parse entity reference' },
            },
          });
        }),
      );

      const result = await listExtensionsAction.action({
        input: { filter: 'repo' },
        credentials: undefined,
      });

      expect(result.output.extensions).toHaveLength(1);
      expect(result.output.extensions[0].name).toBe('parseRepoUrl');
    });

    it('should filter extensions by description', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({
            filters: {
              parseRepoUrl: { description: 'Parse repository URL' },
              parseEntityRef: { description: 'Parse entity reference' },
            },
          });
        }),
      );

      const result = await listExtensionsAction.action({
        input: { filter: 'entity' },
        credentials: undefined,
      });

      expect(result.output.extensions).toHaveLength(1);
      expect(result.output.extensions[0].name).toBe('parseEntityRef');
    });

    it('should handle empty response', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({});
        }),
      );

      const result = await listExtensionsAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.extensions).toHaveLength(0);
      expect(result.output.count).toBe(0);
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return new HttpResponse('Server error', { status: 500 });
        }),
      );

      await expect(
        listExtensionsAction.action({ input: {}, credentials: undefined })
      ).rejects.toThrow('Failed to fetch template extensions');
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

    it('should get filter extension details', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({
            filters: {
              parseRepoUrl: {
                description: 'Parse repository URL',
                schema: { type: 'object' },
                examples: [{ title: 'Example' }],
              },
            },
          });
        }),
      );

      const result = await getExtensionAction.action({
        input: { extensionName: 'parseRepoUrl' },
        credentials: undefined,
      });

      expect(result.output.name).toBe('parseRepoUrl');
      expect(result.output.type).toBe('filter');
      expect(result.output.description).toBe('Parse repository URL');
    });

    it('should get function extension details', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({
            globals: {
              functions: {
                uuid: {
                  description: 'Generate UUID',
                  schema: { type: 'string' },
                },
              },
            },
          });
        }),
      );

      const result = await getExtensionAction.action({
        input: { extensionName: 'uuid' },
        credentials: undefined,
      });

      expect(result.output.name).toBe('uuid');
      expect(result.output.type).toBe('function');
    });

    it('should get value extension details', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({
            globals: {
              values: {
                timestamp: {
                  description: 'Current timestamp',
                  value: '2025-01-01',
                },
              },
            },
          });
        }),
      );

      const result = await getExtensionAction.action({
        input: { extensionName: 'timestamp' },
        credentials: undefined,
      });

      expect(result.output.name).toBe('timestamp');
      expect(result.output.type).toBe('value');
      expect(result.output.value).toBe('2025-01-01');
    });

    it('should throw error when extension not found', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return HttpResponse.json({ filters: {} });
        }),
      );

      await expect(
        getExtensionAction.action({
          input: { extensionName: 'nonexistent' },
          credentials: undefined,
        })
      ).rejects.toThrow('No template extension found');
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('http://scaffolder-backend/v2/templating-extensions', () => {
          return new HttpResponse('Server error', { status: 500 });
        }),
      );

      await expect(
        getExtensionAction.action({
          input: { extensionName: 'parseRepoUrl' },
          credentials: undefined,
        })
      ).rejects.toThrow('Failed to fetch template extensions');
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
