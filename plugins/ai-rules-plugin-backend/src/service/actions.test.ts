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

  describe('registration', () => {
    it('should register get_ai_rules action', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      expect(mockActionsRegistry.register).toHaveBeenCalledTimes(2);

      // Check the first registered action is get_ai_rules
      const aiRulesAction = mockActionsRegistry.register.mock.calls[0][0];
      expect(aiRulesAction.name).toBe('get_ai_rules');
      expect(aiRulesAction.title).toBe('Get AI Rules');
      expect(aiRulesAction.description).toContain('AI rules');
    });

    it('should register get_mcp_servers action', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      // Check the second registered action is get_mcp_servers
      const mcpServersAction = mockActionsRegistry.register.mock.calls[1][0];
      expect(mcpServersAction.name).toBe('get_mcp_servers');
      expect(mcpServersAction.title).toBe('Get MCP Servers');
      expect(mcpServersAction.description).toContain('MCP servers');
    });
  });

  describe('action handlers', () => {
    it('get_ai_rules action should call aiRulesService.getAiRules', async () => {
      const mockResult = {
        rules: [{ type: 'cursor', id: 'test', filePath: '/test', fileName: 'test.md', content: 'content' }],
        totalCount: 1,
        ruleTypes: ['cursor'],
      };
      (mockAiRulesService.getAiRules as jest.Mock).mockResolvedValue(mockResult);

      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      const aiRulesAction = mockActionsRegistry.register.mock.calls[0][0];
      const result = await aiRulesAction.action({
        input: { gitUrl: 'https://github.com/test/repo', ruleTypes: ['cursor'] },
      });

      expect(mockAiRulesService.getAiRules).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        ['cursor'],
      );
      expect(result.output).toEqual(mockResult);
    });

    it('get_mcp_servers action should call mcpService.getMCPServers', async () => {
      const mockResult = {
        servers: [{ name: 'test-server', type: 'local', config: {}, source: 'cursor', rawConfig: '{}' }],
      };
      (mockMcpService.getMCPServers as jest.Mock).mockResolvedValue(mockResult);

      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      const mcpServersAction = mockActionsRegistry.register.mock.calls[1][0];
      const result = await mcpServersAction.action({
        input: { gitUrl: 'https://github.com/test/repo' },
      });

      expect(mockMcpService.getMCPServers).toHaveBeenCalledWith(
        'https://github.com/test/repo',
      );
      expect(result.output).toEqual(mockResult);
    });
  });

  describe('schema definitions', () => {
    it('should define input schema for get_ai_rules', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      const aiRulesAction = mockActionsRegistry.register.mock.calls[0][0];
      expect(aiRulesAction.schema.input).toBeDefined();
      expect(typeof aiRulesAction.schema.input).toBe('function');
    });

    it('should define output schema for get_ai_rules', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      const aiRulesAction = mockActionsRegistry.register.mock.calls[0][0];
      expect(aiRulesAction.schema.output).toBeDefined();
      expect(typeof aiRulesAction.schema.output).toBe('function');
    });

    it('should define input schema for get_mcp_servers', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      const mcpServersAction = mockActionsRegistry.register.mock.calls[1][0];
      expect(mcpServersAction.schema.input).toBeDefined();
      expect(typeof mcpServersAction.schema.input).toBe('function');
    });

    it('should define output schema for get_mcp_servers', () => {
      registerMcpActions(
        mockActionsRegistry as any,
        mockAiRulesService,
        mockMcpService,
      );

      const mcpServersAction = mockActionsRegistry.register.mock.calls[1][0];
      expect(mcpServersAction.schema.output).toBeDefined();
      expect(typeof mcpServersAction.schema.output).toBe('function');
    });
  });
});
