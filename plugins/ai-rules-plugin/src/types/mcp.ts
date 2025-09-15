export interface MCPServerConfig {
  type?: 'stdio' | 'remote';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
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


