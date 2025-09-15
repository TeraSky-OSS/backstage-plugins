export { aiRulesPlugin } from './plugin';
export * from './types';
export * from './types/mcp';
export { AIRulesComponent } from './plugin';
export { MCPServersComponent } from './components/MCPServersComponent';
export { AiInstructionsComponent } from './components/AiInstructionsComponent';
export { isAIRulesAvailable } from './components/AiRulesComponent';
export type { AIRulesComponentProps } from './components/AiRulesComponent';
export type { MCPServersComponentProps } from './components/MCPServersComponent';
export type { AiInstructionsComponentProps } from './components/AiInstructionsComponent';

// Export API types and implementation
export { aiRulesApiRef } from './api/types';
export { AiRulesClient } from './api/AiRulesClient';
export type { AiRulesApi } from './api/types';