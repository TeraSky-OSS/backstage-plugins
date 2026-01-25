import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { InputError } from '@backstage/errors';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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
        rest.get('http://catalog-backend/entities/by-query', (req, res, ctx) => {
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
        rest.get('http://catalog-backend/entities/by-query', (req, res, ctx) => {
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
        rest.get('http://catalog-backend/entities/by-query', (req, res, ctx) => {
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
  });
});

