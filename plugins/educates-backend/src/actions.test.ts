import { registerMcpActions } from './actions';
import { mockServices } from '@backstage/backend-test-utils';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError } from '@backstage/errors';
import { EducatesService } from './service/EducatesService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockService = {
    getTrainingPortals: jest.fn(),
    getWorkshops: jest.fn(),
    requestWorkshopSession: jest.fn(),
  } as unknown as EducatesService;

  const mockPermissions = mockServices.permissions.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ $$type: '@backstage/BackstageCredentials', principal: { type: 'service', subject: 'plugin:educates-backend' } } as any);
    mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.ALLOW }]);
  });

  it('should register all MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockService,
      mockPermissions,
      mockAuth,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(3);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_educates_training_portals');
    expect(registeredActions).toContain('get_educates_workshops');
    expect(registeredActions).toContain('request_educates_workshop_session');
  });

  describe('get_educates_training_portals action', () => {
    let portalsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      portalsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_educates_training_portals'
      )?.[0];
    });

    it('should return training portals', async () => {
      const mockPortals = [
        { name: 'portal1', url: 'http://portal1.example.com' },
        { name: 'portal2', url: 'http://portal2.example.com' },
      ];

      (mockService.getTrainingPortals as jest.Mock).mockResolvedValue(mockPortals);

      const result = await portalsAction.action({ credentials: undefined });

      expect(result.output.portals).toEqual(mockPortals);
    });

    it('should throw InputError on service failure', async () => {
      (mockService.getTrainingPortals as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        portalsAction.action({ credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_educates_workshops action', () => {
    let workshopsAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      workshopsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_educates_workshops'
      )?.[0];
    });

    it('should return workshops when authorized', async () => {
      const mockWorkshops = {
        workshops: [
          {
            name: 'workshop1',
            title: 'Workshop 1',
            description: 'Description 1',
            vendor: 'Test',
            authors: ['Author 1'],
            difficulty: 'beginner',
            duration: '1h',
            environment: {
              name: 'env1',
              capacity: 10,
              reserved: 2,
              available: 8,
            },
          },
        ],
      };

      (mockService.getWorkshops as jest.Mock).mockResolvedValue(mockWorkshops);

      const result = await workshopsAction.action({
        input: { portalName: 'test-portal' },
        credentials: undefined,
      });

      expect(result.output.workshops).toEqual(mockWorkshops.workshops);
    });

    it('should throw InputError when permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        workshopsAction.action({
          input: { portalName: 'test-portal' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service failure', async () => {
      (mockService.getWorkshops as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await expect(
        workshopsAction.action({
          input: { portalName: 'test-portal' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('request_educates_workshop_session action', () => {
    let sessionAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockService,
        mockPermissions,
        mockAuth,
      );
      sessionAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'request_educates_workshop_session'
      )?.[0];
    });

    it('should request workshop session when authorized', async () => {
      const mockWorkshops = {
        workshops: [
          {
            name: 'workshop1',
            environment: { name: 'env1' },
          },
        ],
      };

      const mockSession = {
        url: 'http://session.example.com',
        session: {
          id: 'session1',
          name: 'session-name',
          namespace: 'default',
          started: '2024-01-01T00:00:00Z',
          expires: '2024-01-01T02:00:00Z',
          workshop: {
            name: 'workshop1',
            title: 'Workshop 1',
            description: 'Description',
          },
        },
      };

      (mockService.getWorkshops as jest.Mock).mockResolvedValue(mockWorkshops);
      (mockService.requestWorkshopSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessionAction.action({
        input: {
          portalName: 'test-portal',
          workshopEnvName: 'env1',
        },
        credentials: undefined,
      });

      expect(result.output).toEqual(mockSession);
    });

    it('should throw InputError when workshop not found', async () => {
      (mockService.getWorkshops as jest.Mock).mockResolvedValue({ workshops: [] });

      await expect(
        sessionAction.action({
          input: {
            portalName: 'test-portal',
            workshopEnvName: 'non-existent',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when portal permission denied', async () => {
      mockPermissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);

      await expect(
        sessionAction.action({
          input: {
            portalName: 'test-portal',
            workshopEnvName: 'env1',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when workshop permission denied', async () => {
      const mockWorkshops = {
        workshops: [
          {
            name: 'workshop1',
            environment: { name: 'env1' },
          },
        ],
      };

      (mockService.getWorkshops as jest.Mock).mockResolvedValue(mockWorkshops);

      // First call allows portal view, second denies workshop start
      mockPermissions.authorize
        .mockResolvedValueOnce([{ result: AuthorizeResult.ALLOW }])
        .mockResolvedValueOnce([{ result: AuthorizeResult.DENY }]);

      await expect(
        sessionAction.action({
          input: {
            portalName: 'test-portal',
            workshopEnvName: 'env1',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});

