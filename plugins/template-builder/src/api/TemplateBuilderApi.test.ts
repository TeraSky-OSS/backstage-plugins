import { DefaultTemplateBuilderApi } from './TemplateBuilderApi';
import { DiscoveryApi, FetchApi } from '@backstage/frontend-plugin-api';
import { CatalogApi } from '@backstage/plugin-catalog-react';

describe('DefaultTemplateBuilderApi', () => {
  let mockDiscoveryApi: jest.Mocked<DiscoveryApi>;
  let mockFetchApi: jest.Mocked<FetchApi>;
  let mockCatalogApi: jest.Mocked<CatalogApi>;
  let client: DefaultTemplateBuilderApi;

  beforeEach(() => {
    mockDiscoveryApi = {
      getBaseUrl: jest.fn().mockResolvedValue('https://api.example.com'),
    } as any;

    mockFetchApi = {
      fetch: jest.fn(),
    } as any;

    mockCatalogApi = {} as any;

    client = new DefaultTemplateBuilderApi({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchApi,
      catalogApi: mockCatalogApi,
    });
  });

  describe('getAvailableActions', () => {
    it('should fetch actions successfully', async () => {
      const mockActions = [
        {
          id: 'fetch:template',
          description: 'Fetch template',
          schema: {
            input: {
              type: 'object',
              properties: {
                url: { type: 'string' },
              },
            },
          },
        },
      ];

      mockFetchApi.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockActions,
      } as Response);

      const result = await client.getAvailableActions();

      expect(result).toEqual(mockActions);
      expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('scaffolder');
      expect(mockFetchApi.fetch).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      mockFetchApi.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(client.getAvailableActions()).rejects.toThrow();
    });
  });
});
