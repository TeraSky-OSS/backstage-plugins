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
    mockDiscovery.getBaseUrl.mockResolvedValue('http://rbac-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
  });

  it('should register MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockDiscovery,
      mockAuth,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalled();
  });

  describe('registered actions', () => {
    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockDiscovery,
        mockAuth,
      );
    });

    it('should register RBAC-related actions', () => {
      const registeredActions = mockActionsRegistry.register.mock.calls.map(
        (call: any[]) => call[0].name
      );

      // Check that some RBAC actions are registered
      expect(registeredActions.length).toBeGreaterThan(0);
    });
  });
});

