import { registerMcpActions } from './actions';
import { AiRulesService } from './AiRulesService';
import { MCPService } from './MCPService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockAiRulesService = {
    getAiRules: jest.fn(),
  } as unknown as AiRulesService;

  const mockMcpService = {
    getMCPServers: jest.fn(),
  } as unknown as MCPService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register all MCP actions', () => {
    registerMcpActions(
      mockActionsRegistry as any,
      mockAiRulesService,
      mockMcpService,
    );

    expect(mockActionsRegistry.register).toHaveBeenCalledTimes(2);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_ai_rules');
    expect(registeredActions).toContain('get_mcp_servers');
  });

  describe('get_ai_rules action', () => {
    let aiRulesAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );
      aiRulesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_ai_rules'
      )?.[0];
    });

    it('should have correct schema', () => {
      expect(aiRulesAction.title).toBe('Get AI Rules');
      expect(aiRulesAction.description).toBe('Get AI rules from a Git repository');
    });

    it('should call aiRulesService.getAiRules with correct parameters', async () => {
      const mockResult = {
        rules: [
          {
            type: 'cursor',
            id: 'rule-1',
            filePath: '.cursor/rules/test.mdc',
            fileName: 'test.mdc',
            content: 'Test rule content',
          },
        ],
        totalCount: 1,
        ruleTypes: ['cursor'],
      };

      (mockAiRulesService.getAiRules as jest.Mock).mockResolvedValue(mockResult);

      const result = await aiRulesAction.action({
        input: {
          gitUrl: 'https://github.com/test/repo',
          ruleTypes: ['cursor', 'copilot'],
        },
      });

      expect(mockAiRulesService.getAiRules).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        ['cursor', 'copilot']
      );
      expect(result.output).toEqual(mockResult);
    });

    it('should handle empty rule types', async () => {
      const mockResult = {
        rules: [],
        totalCount: 0,
        ruleTypes: [],
      };

      (mockAiRulesService.getAiRules as jest.Mock).mockResolvedValue(mockResult);

      const result = await aiRulesAction.action({
        input: {
          gitUrl: 'https://github.com/test/repo',
          ruleTypes: [],
        },
      });

      expect(mockAiRulesService.getAiRules).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        []
      );
      expect(result.output.rules).toEqual([]);
    });

    it('should handle service errors', async () => {
      (mockAiRulesService.getAiRules as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(
        aiRulesAction.action({
          input: {
            gitUrl: 'https://github.com/test/repo',
            ruleTypes: ['cursor'],
          },
        })
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('get_mcp_servers action', () => {
    let mcpServersAction: any;

    beforeEach(() => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );
      mcpServersAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_mcp_servers'
      )?.[0];
    });

    it('should have correct schema', () => {
      expect(mcpServersAction.title).toBe('Get MCP Servers');
      expect(mcpServersAction.description).toBe('Get configured MCP servers from a Git repository');
    });

    it('should call mcpService.getMCPServers with correct parameters', async () => {
      const mockResult = {
        servers: [
          {
            name: 'test-server',
            type: 'local',
            config: {
              type: 'stdio',
              command: 'node',
              args: ['server.js'],
            },
            source: 'cursor',
            rawConfig: '{"type": "stdio"}',
          },
        ],
      };

      (mockMcpService.getMCPServers as jest.Mock).mockResolvedValue(mockResult);

      const result = await mcpServersAction.action({
        input: {
          gitUrl: 'https://github.com/test/repo',
        },
      });

      expect(mockMcpService.getMCPServers).toHaveBeenCalledWith(
        'https://github.com/test/repo'
      );
      expect(result.output).toEqual(mockResult);
    });

    it('should handle empty servers response', async () => {
      const mockResult = {
        servers: [],
      };

      (mockMcpService.getMCPServers as jest.Mock).mockResolvedValue(mockResult);

      const result = await mcpServersAction.action({
        input: {
          gitUrl: 'https://github.com/test/repo',
        },
      });

      expect(result.output.servers).toEqual([]);
    });

    it('should handle service errors', async () => {
      (mockMcpService.getMCPServers as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch MCP servers')
      );

      await expect(
        mcpServersAction.action({
          input: {
            gitUrl: 'https://github.com/test/repo',
          },
        })
      ).rejects.toThrow('Failed to fetch MCP servers');
    });
  });
});

