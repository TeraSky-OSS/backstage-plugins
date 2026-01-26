import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { InputError } from '@backstage/errors';
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

  const mockDiscovery = mockServices.discovery.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://catalog-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
  });

  it('should register all MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockDiscovery,
      mockAuth,
    );

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_entities_by_owner');
    expect(registeredActions).toContain('get_entities_by_annotation');
    expect(registeredActions).toContain('get_entity_types_for_kind');
    expect(registeredActions).toContain('get_all_entities_by_kind_and_type');
    expect(registeredActions).toContain('get_entities_with_custom_query');
    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(5);
  });

  describe('get_entities_by_owner action', () => {
    let ownerAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockDiscovery,
        mockAuth,
      );
      ownerAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_entities_by_owner'
      )?.[0];
    });

    it('should fetch entities by owner', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { metadata: { name: 'entity-1' }, spec: { owner: 'user:default/test-user' } },
              { metadata: { name: 'entity-2' }, spec: { owner: 'user:default/test-user' } },
            ],
          }));
        }),
      );

      const result = await ownerAction.action({
        input: { owner: 'user:default/test-user' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(2);
      expect(result.output.count).toBe(2);
      expect(result.output.owner).toBe('user:default/test-user');
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        }),
      );

      await expect(
        ownerAction.action({
          input: { owner: 'user:default/test-user' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty array when no entities found', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({ items: [] }));
        }),
      );

      const result = await ownerAction.action({
        input: { owner: 'user:default/non-existent' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(0);
      expect(result.output.count).toBe(0);
    });

    it('should use provided credentials', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({ items: [] }));
        }),
      );

      const credentials = { principal: { type: 'user', userEntityRef: 'user:default/test' } };
      await ownerAction.action({
        input: { owner: 'user:default/test-user' },
        credentials,
      });

      expect(mockAuth.getPluginRequestToken).toHaveBeenCalledWith({
        onBehalfOf: credentials,
        targetPluginId: 'catalog',
      });
    });
  });

  describe('get_entities_by_annotation action', () => {
    let annotationAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockDiscovery,
        mockAuth,
      );
      annotationAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_entities_by_annotation'
      )?.[0];
    });

    it('should fetch entities by annotation key only', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { metadata: { name: 'entity-1', annotations: { 'backstage.io/techdocs-ref': 'dir:.' } } },
            ],
          }));
        }),
      );

      const result = await annotationAction.action({
        input: { annotation: 'backstage.io/techdocs-ref' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(1);
      expect(result.output.count).toBe(1);
      expect(result.output.annotation).toBe('backstage.io/techdocs-ref');
      expect(result.output.value).toBeUndefined();
    });

    it('should fetch entities by annotation key and value', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { metadata: { name: 'entity-1', annotations: { 'github.com/project-slug': 'org/repo' } } },
            ],
          }));
        }),
      );

      const result = await annotationAction.action({
        input: { annotation: 'github.com/project-slug', value: 'org/repo' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(1);
      expect(result.output.annotation).toBe('github.com/project-slug');
      expect(result.output.value).toBe('org/repo');
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        }),
      );

      await expect(
        annotationAction.action({
          input: { annotation: 'test-annotation' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty array when no entities match', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({ items: [] }));
        }),
      );

      const result = await annotationAction.action({
        input: { annotation: 'non-existent-annotation' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(0);
      expect(result.output.count).toBe(0);
    });
  });

  describe('get_entity_types_for_kind action', () => {
    let typesAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockDiscovery,
        mockAuth,
      );
      typesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_entity_types_for_kind'
      )?.[0];
    });

    it('should return unique types for a kind', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { kind: 'Component', spec: { type: 'service' } },
              { kind: 'Component', spec: { type: 'website' } },
              { kind: 'Component', spec: { type: 'service' } }, // duplicate
              { kind: 'Component', spec: { type: 'library' } },
            ],
          }));
        }),
      );

      const result = await typesAction.action({
        input: { kind: 'Component' },
        credentials: undefined,
      });

      expect(result.output.types).toEqual(['library', 'service', 'website']); // sorted
      expect(result.output.count).toBe(3);
      expect(result.output.kind).toBe('Component');
    });

    it('should handle entities without type', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { kind: 'Component', spec: { type: 'service' } },
              { kind: 'Component', spec: {} }, // no type
              { kind: 'Component' }, // no spec
            ],
          }));
        }),
      );

      const result = await typesAction.action({
        input: { kind: 'Component' },
        credentials: undefined,
      });

      expect(result.output.types).toEqual(['service']);
      expect(result.output.count).toBe(1);
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        }),
      );

      await expect(
        typesAction.action({
          input: { kind: 'Component' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty array when no entities found', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({ items: [] }));
        }),
      );

      const result = await typesAction.action({
        input: { kind: 'NonExistentKind' },
        credentials: undefined,
      });

      expect(result.output.types).toHaveLength(0);
      expect(result.output.count).toBe(0);
    });
  });

  describe('get_all_entities_by_kind_and_type action', () => {
    let kindTypeAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockDiscovery,
        mockAuth,
      );
      kindTypeAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_all_entities_by_kind_and_type'
      )?.[0];
    });

    it('should fetch entities by kind and type', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { kind: 'Component', metadata: { name: 'service-1' }, spec: { type: 'service' } },
              { kind: 'Component', metadata: { name: 'service-2' }, spec: { type: 'service' } },
            ],
          }));
        }),
      );

      const result = await kindTypeAction.action({
        input: { kind: 'Component', type: 'service' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(2);
      expect(result.output.count).toBe(2);
      expect(result.output.kind).toBe('Component');
      expect(result.output.type).toBe('service');
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        }),
      );

      await expect(
        kindTypeAction.action({
          input: { kind: 'Component', type: 'service' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should return empty array when no entities match', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({ items: [] }));
        }),
      );

      const result = await kindTypeAction.action({
        input: { kind: 'API', type: 'grpc' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(0);
      expect(result.output.count).toBe(0);
    });
  });

  describe('get_entities_with_custom_query action', () => {
    let customQueryAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockDiscovery,
        mockAuth,
      );
      customQueryAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_entities_with_custom_query'
      )?.[0];
    });

    it('should fetch entities with filter', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { kind: 'Component', metadata: { name: 'test-1' } },
            ],
          }));
        }),
      );

      const result = await customQueryAction.action({
        input: { filter: 'kind=Component' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(1);
      expect(result.output.filter).toBe('kind=Component');
    });

    it('should fetch entities with filter and fields', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (req, res, ctx) => {
          expect(req.url.searchParams.get('filter')).toBe('kind=Component');
          expect(req.url.searchParams.get('fields')).toBe('kind,metadata.name');
          return res(ctx.json({
            items: [
              { kind: 'Component', metadata: { name: 'test-1' } },
            ],
          }));
        }),
      );

      const result = await customQueryAction.action({
        input: { filter: 'kind=Component', fields: 'kind,metadata.name' },
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(1);
      expect(result.output.filter).toBe('kind=Component');
      expect(result.output.fields).toBe('kind,metadata.name');
    });

    it('should fetch all entities when no filter provided', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.json({
            items: [
              { kind: 'Component', metadata: { name: 'test-1' } },
              { kind: 'API', metadata: { name: 'api-1' } },
            ],
          }));
        }),
      );

      const result = await customQueryAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.entities).toHaveLength(2);
      expect(result.output.filter).toBeUndefined();
      expect(result.output.fields).toBeUndefined();
    });

    it('should handle API errors', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        }),
      );

      await expect(
        customQueryAction.action({
          input: { filter: 'kind=Component' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should handle non-JSON error responses', async () => {
      server.use(
        rest.get('http://catalog-backend/entities/by-query', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Plain text error'));
        }),
      );

      await expect(
        customQueryAction.action({
          input: { filter: 'kind=Component' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});
