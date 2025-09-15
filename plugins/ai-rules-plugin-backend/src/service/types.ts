export interface MCPServerConfig {
  type?: 'stdio' | 'remote';  // Default to stdio if not specified
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers?: Record<string, MCPServerConfig>;  // Cursor format
  servers?: Record<string, MCPServerConfig>;     // VSCode format
}

export interface MCPServerInfo {
  name: string;
  type: 'local' | 'remote';
  config: MCPServerConfig;
  source: 'cursor' | 'vscode' | 'claude';
  rawConfig: string; // JSON string for syntax highlighting
}

export interface MCPServersResponse {
  servers: MCPServerInfo[];
}


