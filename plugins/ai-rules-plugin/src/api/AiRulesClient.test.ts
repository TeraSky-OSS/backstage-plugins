import { AiRulesClient } from './AiRulesClient';

describe('AiRulesClient', () => {
  const mockDiscoveryApi = {
    getBaseUrl: jest.fn(),
  };

  const mockIdentityApi = {
    getCredentials: jest.fn(),
  };

  let client: AiRulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://ai-rules-backend');
    mockIdentityApi.getCredentials.mockResolvedValue({ token: 'test-token' });
    
    client = new AiRulesClient({
      discoveryApi: mockDiscoveryApi,
      identityApi: mockIdentityApi,
    });

    // Mock fetch
    global.fetch = jest.fn();
  });

  describe('getAiRules', () => {
    it('should fetch AI rules', async () => {
      const mockResponse = {
        rules: [
          { type: 'cursor', id: 'rule-1', content: 'test content', filePath: '.cursor/rules/test.mdc', fileName: 'test.mdc' },
        ],
        totalCount: 1,
        ruleTypes: ['cursor'],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getAiRules(['cursor']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://ai-rules-backend/rules'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(client.getAiRules(['cursor'])).rejects.toThrow('Failed to fetch AI rules');
    });
  });

  describe('getMCPServers', () => {
    it('should fetch MCP servers', async () => {
      const mockResponse = {
        servers: [
          {
            name: 'test-server',
            type: 'local',
            config: { type: 'stdio', command: 'node', args: ['server.js'] },
            source: 'cursor',
            rawConfig: '{}',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getMCPServers('http://github.com/test/repo');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://ai-rules-backend/mcp-servers'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(client.getMCPServers('http://github.com/test/repo')).rejects.toThrow('Failed to fetch MCP servers');
    });
  });

  describe('cleanGitUrl', () => {
    it('should clean git URL', () => {
      // Access private method via client instance
      const cleanGitUrl = (client as any).cleanGitUrl.bind(client);
      
      expect(cleanGitUrl('url:http://github.com/test/repo')).toBe('http://github.com/test/repo');
      expect(cleanGitUrl('http://github.com/test/repo/tree/main/src')).toBe('http://github.com/test/repo');
      expect(cleanGitUrl('http://github.com/test/repo/tree/master/src')).toBe('http://github.com/test/repo');
    });
  });
});

