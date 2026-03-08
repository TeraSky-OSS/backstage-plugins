export { aiRulesPlugin } from './plugin';
export * from './types';
export * from './types/mcp';
export { AIRulesComponent } from './plugin';
export { MCPServersComponent } from './components/MCPServersComponent';
export { AiInstructionsComponent } from './components/AiInstructionsComponent';
export { IgnoreFilesComponent } from './components/IgnoreFilesComponent';
export { AgentConfigsComponent } from './components/AgentConfigsComponent';
export { AgentSkillsComponent } from './components/AgentSkillsComponent';
export { isAIRulesAvailable } from './components/AiRulesComponent';
export type { AIRulesComponentProps } from './components/AiRulesComponent';
export type { MCPServersComponentProps } from './components/MCPServersComponent';
export type { AiInstructionsComponentProps } from './components/AiInstructionsComponent';
export type { IgnoreFilesComponentProps } from './components/IgnoreFilesComponent/IgnoreFilesComponent';
export type { AgentConfigsComponentProps } from './components/AgentConfigsComponent/AgentConfigsComponent';
export type { AgentSkillsComponentProps } from './components/AgentSkillsComponent/AgentSkillsComponent';

// Export API types and implementation
export { aiRulesApiRef } from './api/types';
export { AiRulesClient } from './api/AiRulesClient';
export type { AiRulesApi } from './api/types';