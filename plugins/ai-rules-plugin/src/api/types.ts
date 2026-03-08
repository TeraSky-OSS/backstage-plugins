import { AIRulesResponse, IgnoreFilesResponse, AgentConfigsResponse, SkillsResponse } from '../types';
import { MCPServersResponse } from '../types/mcp';

import { createApiRef } from '@backstage/core-plugin-api';

export const aiRulesApiRef = createApiRef<AiRulesApi>({
  id: 'plugin.ai-rules.service',
});

export interface AiRulesApi {
  getAiRules(ruleTypes: string[]): Promise<AIRulesResponse>;
  getMCPServers(gitUrl: string): Promise<MCPServersResponse>;
  getIgnoreFiles(gitUrl: string): Promise<IgnoreFilesResponse>;
  getAgentConfigs(gitUrl: string): Promise<AgentConfigsResponse>;
  getSkills(gitUrl: string): Promise<SkillsResponse>;
}
