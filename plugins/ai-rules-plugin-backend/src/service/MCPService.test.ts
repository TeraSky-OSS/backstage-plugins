import { MCPService } from './MCPService';
import { mockServices } from '@backstage/backend-test-utils';

describe('MCPService', () => {
  let service: MCPService;
  const mockUrlReader = {
    readUrl: jest.fn(),
    readTree: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new MCPService({
      logger: mockServices.logger.mock(),
      urlReader: mockUrlReader as any,
    });
  });

  describe('getMCPServers', () => {
    it('should return empty servers when no config files are found', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toEqual([]);
    });

    it('should parse Cursor MCP config', async () => {
      const cursorConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursor/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(cursorConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('test-server');
      expect(result.servers[0].source).toBe('cursor');
      expect(result.servers[0].type).toBe('local');
    });

    it('should parse VSCode MCP config', async () => {
      const vscodeConfig = {
        servers: {
          'vscode-server': {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
          },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.vscode/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(vscodeConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('vscode-server');
      expect(result.servers[0].source).toBe('vscode');
      expect(result.servers[0].type).toBe('local');
    });

    it('should parse Claude MCP config', async () => {
      const claudeConfig = {
        mcpServers: {
          'claude-server': {
            url: 'https://mcp.example.com',
          },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(claudeConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('claude-server');
      expect(result.servers[0].source).toBe('claude');
      expect(result.servers[0].type).toBe('remote');
    });

    it('should combine servers from multiple sources', async () => {
      const cursorConfig = {
        mcpServers: {
          'cursor-server': { command: 'node', args: ['server.js'] },
        },
      };
      const vscodeConfig = {
        servers: {
          'vscode-server': { type: 'stdio', command: 'npx', args: ['server'] },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursor/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(cursorConfig)),
          };
        }
        if (url.includes('.vscode/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(vscodeConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toHaveLength(2);
      expect(result.servers.map(s => s.source)).toContain('cursor');
      expect(result.servers.map(s => s.source)).toContain('vscode');
    });

    it('should handle invalid JSON gracefully', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursor/mcp.json')) {
          return {
            buffer: async () => Buffer.from('invalid json {'),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toEqual([]);
    });

    it('should parse VSCode MCP config and clean up comments from env', async () => {
      const vscodeConfig = {
        servers: {
          'vscode-server': {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
            env: {
              '// comment key': 'should be removed',
              API_KEY: 'valid-value',
              ANOTHER_VAR: '// comment value should be removed',
              VALID_ENV: 'valid',
            },
          },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.vscode/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(vscodeConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('vscode-server');
      // The env should have been cleaned
      expect(result.servers[0].config.env).toBeDefined();
    });

    it('should handle VSCode remote server type', async () => {
      const vscodeConfig = {
        servers: {
          'remote-server': {
            type: 'remote',
            url: 'https://mcp.example.com',
          },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.vscode/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(vscodeConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://github.com/test/repo');

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].type).toBe('remote');
    });

    it('should handle non-github URLs', async () => {
      const cursorConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursor/mcp.json')) {
          return {
            buffer: async () => Buffer.from(JSON.stringify(cursorConfig)),
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getMCPServers('https://gitlab.com/test/repo');

      expect(result.servers).toHaveLength(1);
    });
  });
});

