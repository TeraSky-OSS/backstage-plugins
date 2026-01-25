import { EducatesService } from './EducatesService';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn();
});

import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('EducatesService', () => {
  let service: EducatesService;
  const logger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();

    const config = new ConfigReader({
      app: {
        baseUrl: 'https://backstage.example.com',
      },
      educates: {
        trainingPortals: [
          {
            name: 'test-portal',
            url: 'https://test-portal.example.com',
            auth: {
              robotUsername: 'robot',
              robotPassword: 'password',
              clientId: 'client-id',
              clientSecret: 'client-secret',
            },
          },
        ],
      },
    });

    service = new EducatesService(config, logger);
  });

  describe('getTrainingPortals', () => {
    it('should return list of training portals', async () => {
      const portals = await service.getTrainingPortals();

      expect(portals).toHaveLength(1);
      expect(portals[0].name).toBe('test-portal');
      expect(portals[0].url).toBe('https://test-portal.example.com');
    });
  });

  describe('getWorkshops', () => {
    it('should throw error for non-existent portal', async () => {
      await expect(service.getWorkshops('non-existent')).rejects.toThrow('Training portal not found');
    });

    it('should return workshops when API call succeeds', async () => {
      const mockWorkshops = {
        workshops: [
          {
            name: 'test-workshop',
            environment: { name: 'test-env' },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test-token' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWorkshops,
        } as any);

      const workshops = await service.getWorkshops('test-portal');

      expect(workshops).toEqual(mockWorkshops);
    });

    it('should throw error when token request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      } as any);

      await expect(service.getWorkshops('test-portal')).rejects.toThrow('Failed to get access token');
    });

    it('should throw error when catalog request fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test-token' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
        } as any);

      await expect(service.getWorkshops('test-portal')).rejects.toThrow('Failed to get workshops catalog');
    });
  });

  describe('requestWorkshopSession', () => {
    it('should throw error for non-existent portal', async () => {
      await expect(
        service.requestWorkshopSession('non-existent', 'workshop-env'),
      ).rejects.toThrow('Training portal not found');
    });

    it('should throw error when workshop is not found', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test-token' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ workshops: [] }),
        } as any);

      await expect(
        service.requestWorkshopSession('test-portal', 'non-existent-workshop'),
      ).rejects.toThrow('Workshop not found');
    });

    it('should return session data when successful', async () => {
      const mockSessionData = {
        url: '/session/abc123',
        session_id: 'abc123',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test-token' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            workshops: [
              {
                name: 'test-workshop',
                environment: { name: 'test-env' },
              },
            ],
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSessionData,
        } as any);

      const session = await service.requestWorkshopSession('test-portal', 'test-env');

      expect(session.session_id).toBe('abc123');
      expect(session.url).toBe('https://test-portal.example.com/session/abc123');
    });
  });
});

