import { EducatesClient, educatesApiRef } from './EducatesClient';

describe('EducatesClient', () => {
  describe('educatesApiRef', () => {
    it('should have correct id', () => {
      expect(educatesApiRef.id).toBe('plugin.educates.service');
    });
  });

  describe('EducatesClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockFetchApi = {
      fetch: jest.fn(),
    };

    let client: EducatesClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://educates-backend');
      
      client = new EducatesClient({
        discoveryApi: mockDiscoveryApi as any,
        fetchApi: mockFetchApi as any,
      });
    });

    describe('getWorkshops', () => {
      it('should fetch workshops for a portal', async () => {
        const mockWorkshopsResponse = {
          portal: {
            name: 'test-portal',
            url: 'http://test-portal.example.com',
          },
          workshops: [
            {
              name: 'workshop-1',
              title: 'Workshop 1',
              description: 'Test workshop',
              environment: { name: 'env-1', capacity: 10, reserved: 0, available: 10 },
            },
          ],
        };

        const mockTokenResponse = {
          access_token: 'test-access-token',
        };

        const mockCatalogHtml = '<html><img src="data:image/png;base64,testlogo"></html>';

        mockFetchApi.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockWorkshopsResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockTokenResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockCatalogHtml),
          });

        const result = await client.getWorkshops('test-portal');

        expect(result.workshops).toHaveLength(1);
        expect(result.portal.name).toBe('test-portal');
        expect(result.portal.logo).toBe('data:image/png;base64,testlogo');
      });

      it('should throw error when fetch fails', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getWorkshops('non-existent')).rejects.toThrow('Failed to fetch workshops');
      });
    });

    describe('requestWorkshop', () => {
      it('should request a workshop session', async () => {
        const mockSession = {
          url: 'http://session.example.com',
          session: {
            id: 'session-1',
            name: 'session-name',
            namespace: 'default',
            started: '2024-01-01T00:00:00Z',
            expires: '2024-01-01T02:00:00Z',
          },
        };

        mockFetchApi.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockSession),
        });

        const result = await client.requestWorkshop('test-portal', 'env-1', true);

        expect(mockFetchApi.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/request'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ openInNewTab: true }),
          })
        );
        expect(result.url).toBe('http://session.example.com');
      });

      it('should throw error when request fails', async () => {
        mockFetchApi.fetch.mockResolvedValue({
          ok: false,
          statusText: 'Service Unavailable',
        });

        await expect(
          client.requestWorkshop('test-portal', 'env-1', true)
        ).rejects.toThrow('Failed to request workshop');
      });
    });

    describe('private methods', () => {
      it('should extract logo from HTML', () => {
        const extractLogoFromHtml = (client as any).extractLogoFromHtml.bind(client);
        
        const html = '<img src="data:image/png;base64,abc123" />';
        expect(extractLogoFromHtml(html)).toBe('data:image/png;base64,abc123');
        
        const noLogoHtml = '<html><body>No logo</body></html>';
        expect(extractLogoFromHtml(noLogoHtml)).toBeUndefined();
      });

      it('should handle errors in extractLogoFromHtml gracefully', () => {
        const extractLogoFromHtml = (client as any).extractLogoFromHtml.bind(client);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Pass null to trigger an error in the regex match
        const result = extractLogoFromHtml(null as any);
        expect(result).toBeUndefined();
        
        consoleSpy.mockRestore();
      });
    });

    describe('getWorkshops error handling', () => {
      it('should throw error when token fetch fails', async () => {
        const mockWorkshopsResponse = {
          portal: {
            name: 'test-portal',
            url: 'http://test-portal.example.com',
          },
          workshops: [],
        };

        mockFetchApi.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockWorkshopsResponse),
          })
          .mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized',
          });

        await expect(client.getWorkshops('test-portal')).rejects.toThrow('Failed to get access token');
      });

      it('should handle catalog HTML fetch failure gracefully', async () => {
        const mockWorkshopsResponse = {
          portal: {
            name: 'test-portal',
            url: 'http://test-portal.example.com',
          },
          workshops: [],
        };

        const mockTokenResponse = {
          access_token: 'test-access-token',
        };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        mockFetchApi.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockWorkshopsResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockTokenResponse),
          })
          .mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
          });

        const result = await client.getWorkshops('test-portal');

        // Should still return data, just without logo
        expect(result.portal.name).toBe('test-portal');
        expect(result.portal.logo).toBeUndefined();
        
        consoleSpy.mockRestore();
      });

      it('should handle catalog HTML fetch network error gracefully', async () => {
        const mockWorkshopsResponse = {
          portal: {
            name: 'test-portal',
            url: 'http://test-portal.example.com',
          },
          workshops: [],
        };

        const mockTokenResponse = {
          access_token: 'test-access-token',
        };

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        mockFetchApi.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockWorkshopsResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockTokenResponse),
          })
          .mockRejectedValueOnce(new Error('Network error'));

        const result = await client.getWorkshops('test-portal');

        // Should still return data, just without logo
        expect(result.portal.name).toBe('test-portal');
        expect(result.portal.logo).toBeUndefined();
        
        consoleSpy.mockRestore();
      });
    });
  });
});

