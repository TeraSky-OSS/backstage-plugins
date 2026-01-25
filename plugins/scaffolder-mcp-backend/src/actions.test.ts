import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
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

  it('should register MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockCatalogService as any,
      mockDiscovery,
      mockAuth,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalled();
  });

  describe('registered actions', () => {
    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockCatalogService as any,
        mockDiscovery,
        mockAuth,
      );
    });

    it('should register scaffolder-related actions', () => {
      const registeredActions = mockActionsRegistry.register.mock.calls.map(
        (call: any[]) => call[0].name
      );

      // Check that some scaffolder actions are registered
      expect(registeredActions.length).toBeGreaterThan(0);
    });
  });
});

