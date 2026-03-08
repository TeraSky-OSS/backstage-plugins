export enum AIRuleType {
  CURSOR = 'cursor',
  COPILOT = 'copilot',
  CLINE = 'cline',
  CLAUDE_CODE = 'claude-code',
  WINDSURF = 'windsurf',
  ROO_CODE = 'roo-code',
  CODEX = 'codex',
  GEMINI = 'gemini',
  AMAZON_Q = 'amazon-q',
  CONTINUE = 'continue',
  AIDER = 'aider',
}

export interface CursorRule {
  type: AIRuleType.CURSOR;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  description?: string;
  globs?: string[];
  alwaysApply?: boolean;
  frontmatter?: Record<string, any>;
  content: string;
}

export interface CopilotRule {
  type: AIRuleType.COPILOT;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  order?: number;
  title?: string;
  applyTo?: string;
  frontmatter?: Record<string, any>;
}

export interface ClineRule {
  type: AIRuleType.CLINE;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
  sections?: Array<{
    title: string;
    content: string;
  }>;
}

export interface ClaudeCodeRule {
  type: AIRuleType.CLAUDE_CODE;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
}

export interface WindsurfRule {
  type: AIRuleType.WINDSURF;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
}

export interface RooCodeRule {
  type: AIRuleType.ROO_CODE;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
  mode?: string;
}

export interface CodexRule {
  type: AIRuleType.CODEX;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
}

export interface GeminiRule {
  type: AIRuleType.GEMINI;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
}

export interface AmazonQRule {
  type: AIRuleType.AMAZON_Q;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
}

export interface ContinueRule {
  type: AIRuleType.CONTINUE;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
  alwaysApply?: boolean;
  frontmatter?: Record<string, any>;
}

export interface AiderRule {
  type: AIRuleType.AIDER;
  id: string;
  filePath: string;
  fileName: string;
  gitUrl?: string;
  content: string;
  title?: string;
}

export type AIRule =
  | CursorRule
  | CopilotRule
  | ClineRule
  | ClaudeCodeRule
  | WindsurfRule
  | RooCodeRule
  | CodexRule
  | GeminiRule
  | AmazonQRule
  | ContinueRule
  | AiderRule;

export interface AIRulesResponse {
  rules: AIRule[];
  totalCount: number;
  ruleTypes: AIRuleType[];
}

export interface AIRulesConfig {
  allowedRuleTypes?: AIRuleType[];
}

// ─── Ignore Files ─────────────────────────────────────────────────────────────

export interface IgnoreFile {
  agent: string;
  filePath: string;
  content: string;
  gitUrl?: string;
}

export interface IgnoreFilesResponse {
  files: IgnoreFile[];
  totalCount: number;
}

// ─── Agent Configs ────────────────────────────────────────────────────────────

export interface AgentConfig {
  agent: string;
  filePath: string;
  content: string;
  language: 'yaml' | 'json' | 'typescript';
  gitUrl?: string;
}

export interface AgentConfigsResponse {
  configs: AgentConfig[];
  totalCount: number;
}

// ─── Agent Skills ─────────────────────────────────────────────────────────────

export interface AgentSkill {
  name: string;
  description: string;
  source: 'cross-client' | 'claude' | 'cursor';
  sourceDirectory: string;
  filePath: string;
  content: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];
  resources: {
    scripts: string[];
    references: string[];
    assets: string[];
  };
  gitUrl?: string;
}

export interface SkillsResponse {
  skills: AgentSkill[];
  totalCount: number;
}
