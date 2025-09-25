import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { AiRulesService } from './AiRulesService';
import { MCPService } from './MCPService';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  aiRulesService: AiRulesService,
  mcpService: MCPService,
) {
  // Get AI Rules
  actionsRegistry.register({
    name: 'get_ai_rules',
    title: 'Get AI Rules',
    description: 'Get AI rules from a Git repository',
    schema: {
      input: z => z.object({
        gitUrl: z.string().describe('The Git repository URL to fetch rules from'),
        ruleTypes: z.array(z.enum(['cursor', 'copilot', 'cline', 'claude-code'])).describe('The types of rules to fetch'),
      }),
      output: z => z.object({
        rules: z.array(z.object({
          type: z.enum(['cursor', 'copilot', 'cline', 'claude-code']).describe('The type of the rule'),
          id: z.string().describe('Unique identifier for the rule'),
          filePath: z.string().describe('Path to the rule file in the repository'),
          fileName: z.string().describe('Name of the rule file'),
          content: z.string().describe('Content of the rule'),
          gitUrl: z.string().optional().describe('Git repository URL'),
          description: z.string().optional().describe('Description of the rule'),
          globs: z.array(z.string()).optional().describe('Glob patterns for when to apply the rule'),
          alwaysApply: z.boolean().optional().describe('Whether to always apply the rule'),
          order: z.number().optional().describe('Order in which to apply the rule'),
          title: z.string().optional().describe('Title of the rule'),
          frontmatter: z.record(z.any()).optional().describe('Additional frontmatter data'),
          sections: z.array(z.object({
            title: z.string().describe('Section title'),
            content: z.string().describe('Section content'),
          })).optional().describe('Rule sections'),
          applyTo: z.string().optional().describe('Where to apply the rule'),
        })).describe('List of AI rules'),
        totalCount: z.number().describe('Total number of rules found'),
        ruleTypes: z.array(z.string()).describe('List of rule types found'),
      }),
    },
    action: async ({ input }) => {
      const result = await aiRulesService.getAiRules(input.gitUrl, input.ruleTypes);
      return {
        output: result,
      };
    },
  });

  // Get MCP Servers
  actionsRegistry.register({
    name: 'get_mcp_servers',
    title: 'Get MCP Servers',
    description: 'Get configured MCP servers from a Git repository',
    schema: {
      input: z => z.object({
        gitUrl: z.string().describe('The Git repository URL to fetch MCP servers from'),
      }),
      output: z => z.object({
        servers: z.array(z.object({
          name: z.string().describe('Name of the MCP server'),
          type: z.enum(['local', 'remote']).describe('Type of the MCP server'),
          config: z.object({
            type: z.enum(['stdio', 'remote']).optional().describe('Server type (defaults to stdio if not specified)'),
            command: z.string().optional().describe('Command to run for local servers'),
            args: z.array(z.string()).optional().describe('Arguments for the command'),
            env: z.record(z.string()).optional().describe('Environment variables for local servers'),
            url: z.string().optional().describe('URL for remote servers'),
            headers: z.record(z.string()).optional().describe('Headers for remote servers'),
          }).describe('Server configuration'),
          source: z.enum(['cursor', 'vscode', 'claude']).describe('Source of the MCP server configuration'),
          rawConfig: z.string().describe('Raw JSON configuration for syntax highlighting'),
        })).describe('List of MCP servers'),
      }),
    },
    action: async ({ input }) => {
      const result = await mcpService.getMCPServers(input.gitUrl);
      return {
        output: result,
      };
    },
  });
}
