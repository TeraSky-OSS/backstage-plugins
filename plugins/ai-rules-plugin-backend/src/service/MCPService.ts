import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';
import { MCPConfig, MCPServerInfo, MCPServersResponse } from './types';

export interface MCPServiceOptions {
  logger: LoggerService;
  urlReader: UrlReaderService;
}

export class MCPService {
  private readonly logger: LoggerService;
  private readonly urlReader: UrlReaderService;

  constructor(options: MCPServiceOptions) {
    this.logger = options.logger;
    this.urlReader = options.urlReader;
  }

  async getMCPServers(gitUrl: string): Promise<MCPServersResponse> {
    const servers: MCPServerInfo[] = [];
    this.logger.info(`Fetching MCP servers from ${gitUrl}`);

    // Try to fetch Cursor MCP config
    const cursorConfig = await this.fetchMCPConfig(gitUrl, '.cursor/mcp.json');
    if (cursorConfig) {
      const cursorServers = this.parseCursorConfig(cursorConfig);
      servers.push(...cursorServers);
      this.logger.info(`Found ${cursorServers.length} Cursor MCP servers`);
    }

    // Try to fetch VSCode MCP config
    const vscodeConfig = await this.fetchMCPConfig(gitUrl, '.vscode/mcp.json');
    if (vscodeConfig) {
      const vscodeServers = this.parseVSCodeConfig(vscodeConfig);
      servers.push(...vscodeServers);
      this.logger.info(`Found ${vscodeServers.length} VSCode MCP servers`);
    }

    // Try to fetch Claude MCP config
    const claudeConfig = await this.fetchMCPConfig(gitUrl, '.mcp.json');
    if (claudeConfig) {
      const claudeServers = this.parseClaudeConfig(claudeConfig);
      servers.push(...claudeServers);
      this.logger.info(`Found ${claudeServers.length} Claude MCP servers`);
    }

    this.logger.info(`Found total of ${servers.length} MCP servers`);
    return { servers };
  }

  private async fetchMCPConfig(gitUrl: string, filePath: string): Promise<MCPConfig | null> {
    try {
      // Remove any trailing slashes from the gitUrl
      const cleanGitUrl = gitUrl.replace(/\/+$/, '');
      
      // For GitHub URLs, we need to use the raw content URL
      const fileUrl = cleanGitUrl.includes('github.com')
        ? `${cleanGitUrl}/raw/main/${filePath}`
        : `${cleanGitUrl}/blob/HEAD/${filePath}`;
      
      this.logger.info(`Fetching MCP config from ${fileUrl}`);
      const response = await this.urlReader.readUrl(fileUrl);
      const content = await response.buffer();
      const configStr = content.toString('utf-8');
      
      try {
        const config = JSON.parse(configStr);
        this.logger.debug(`Successfully parsed MCP config from ${filePath}`);
        return config;
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON from ${filePath}: ${configStr}`);
        return null;
      }
    } catch (error) {
      this.logger.debug(`Failed to fetch MCP config from ${filePath}: ${error}`);
      return null;
    }
  }

  private parseCursorConfig(config: MCPConfig): MCPServerInfo[] {
    const servers: MCPServerInfo[] = [];
    const mcpServers = config.mcpServers || {};

    for (const [name, serverConfig] of Object.entries(mcpServers)) {
      servers.push({
        name,
        type: serverConfig.url ? 'remote' : 'local',
        config: serverConfig,
        source: 'cursor',
        rawConfig: JSON.stringify(serverConfig, null, 2)
      });
    }

    return servers;
  }

  private parseVSCodeConfig(config: MCPConfig): MCPServerInfo[] {
    const servers: MCPServerInfo[] = [];
    const mcpServers = config.servers || {};

    for (const [name, serverConfig] of Object.entries(mcpServers)) {
      // Clean up comments from env if present
      if (serverConfig.env) {
        const cleanEnv: Record<string, string> = {};
        for (const [key, value] of Object.entries(serverConfig.env)) {
          if (!key.startsWith('//') && typeof value === 'string' && !value.startsWith('//')) {
            cleanEnv[key] = value;
          }
        }
        serverConfig.env = cleanEnv;
      }

      servers.push({
        name,
        type: serverConfig.type === 'stdio' ? 'local' : 'remote',
        config: serverConfig,
        source: 'vscode',
        rawConfig: JSON.stringify(serverConfig, null, 2)
      });
    }

    return servers;
  }

  private parseClaudeConfig(config: MCPConfig): MCPServerInfo[] {
    const servers: MCPServerInfo[] = [];
    const mcpServers = config.mcpServers || {};

    for (const [name, serverConfig] of Object.entries(mcpServers)) {
      servers.push({
        name,
        type: serverConfig.url ? 'remote' : 'local',
        config: serverConfig,
        source: 'claude',
        rawConfig: JSON.stringify(serverConfig, null, 2)
      });
    }

    return servers;
  }
}
