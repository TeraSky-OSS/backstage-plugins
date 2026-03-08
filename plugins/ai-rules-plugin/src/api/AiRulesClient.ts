import { AiRulesApi } from './types';
import { AIRulesResponse, IgnoreFilesResponse, AgentConfigsResponse, SkillsResponse } from '../types';
import { MCPServersResponse } from '../types/mcp';

export class AiRulesClient implements AiRulesApi {
  private readonly discoveryApi: { getBaseUrl: (pluginId: string) => Promise<string> };
  private readonly identityApi: { getCredentials(): Promise<{ token?: string }> };

  constructor(options: {
    discoveryApi: { getBaseUrl: (pluginId: string) => Promise<string> };
    identityApi: { getCredentials(): Promise<{ token?: string }> };
  }) {
    this.discoveryApi = options.discoveryApi;
    this.identityApi = options.identityApi;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { token } = await this.identityApi.getCredentials();
    return { 'Authorization': `Bearer ${token}` };
  }

  private cleanGitUrl(url: string): string {
    return url
      .replace('url:', '')
      .replace(/\/tree\/(?:main|master)\/.*$/, '');
  }

  async getAiRules(ruleTypes: string[]): Promise<AIRulesResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-rules');
    const sourceLocation = window.location.pathname.split('/').includes('catalog')
      ? new URLSearchParams(window.location.search).get('sourceLocation') || ''
      : '';
    const gitUrl = this.cleanGitUrl(sourceLocation);
    const queryParams = new URLSearchParams({ gitUrl, ruleTypes: ruleTypes.join(',') });
    const response = await fetch(`${baseUrl}/rules?${queryParams}`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch AI rules');
    return await response.json();
  }

  async getMCPServers(gitUrl: string): Promise<MCPServersResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-rules');
    const queryParams = new URLSearchParams({ gitUrl });
    const response = await fetch(`${baseUrl}/mcp-servers?${queryParams}`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch MCP servers');
    return await response.json();
  }

  async getIgnoreFiles(gitUrl: string): Promise<IgnoreFilesResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-rules');
    const queryParams = new URLSearchParams({ gitUrl });
    const response = await fetch(`${baseUrl}/ignore-files?${queryParams}`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch ignore files');
    return await response.json();
  }

  async getAgentConfigs(gitUrl: string): Promise<AgentConfigsResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-rules');
    const queryParams = new URLSearchParams({ gitUrl });
    const response = await fetch(`${baseUrl}/agent-configs?${queryParams}`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch agent configs');
    return await response.json();
  }

  async getSkills(gitUrl: string): Promise<SkillsResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-rules');
    const queryParams = new URLSearchParams({ gitUrl });
    const response = await fetch(`${baseUrl}/skills?${queryParams}`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch agent skills');
    return await response.json();
  }
}
