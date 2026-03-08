import { LoggerService, DiscoveryService, UrlReaderService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
const matter = require('gray-matter');

export interface AIRule {
  type: 'cursor' | 'copilot' | 'cline' | 'claude-code' | 'windsurf' | 'roo-code' | 'codex' | 'gemini' | 'amazon-q' | 'continue' | 'aider';
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  gitUrl?: string;
  description?: string;
  globs?: string[];
  alwaysApply?: boolean;
  order?: number;
  title?: string;
  frontmatter?: Record<string, any>;
  sections?: Array<{
    title: string;
    content: string;
  }>;
  applyTo?: string;
  mode?: string; // Roo Code mode (code, architect, ask, debug, etc.)
}

export interface AIRulesResponse {
  rules: AIRule[];
  totalCount: number;
  ruleTypes: string[];
}

export interface AiRulesServiceOptions {
  logger: LoggerService;
  config: Config;
  discovery: DiscoveryService;
  urlReader: UrlReaderService;
}

export class AiRulesService {
  private readonly logger: LoggerService;
  private readonly urlReader: UrlReaderService;

  constructor(options: AiRulesServiceOptions) {
    this.logger = options.logger;
    this.urlReader = options.urlReader;
  }

  async getAiRules(gitUrl: string, ruleTypes: string[]): Promise<AIRulesResponse> {
    const allRules: AIRule[] = [];

    for (const ruleType of ruleTypes) {
      try {
        switch (ruleType) {
          case 'cursor': {
            const cursorRules = await this.fetchCursorRules(gitUrl);
            allRules.push(...cursorRules);
            break;
          }
          case 'copilot': {
            const copilotRules = await this.fetchCopilotRules(gitUrl);
            allRules.push(...copilotRules);
            break;
          }
          case 'cline': {
            const clineRules = await this.fetchClineRules(gitUrl);
            allRules.push(...clineRules);
            break;
          }
          case 'claude-code': {
            const claudeCodeRules = await this.fetchClaudeCodeRules(gitUrl);
            allRules.push(...claudeCodeRules);
            break;
          }
          case 'windsurf': {
            const windsurfRules = await this.fetchWindsurfRules(gitUrl);
            allRules.push(...windsurfRules);
            break;
          }
          case 'roo-code': {
            const rooCodeRules = await this.fetchRooCodeRules(gitUrl);
            allRules.push(...rooCodeRules);
            break;
          }
          case 'codex': {
            const codexRules = await this.fetchCodexRules(gitUrl);
            allRules.push(...codexRules);
            break;
          }
          case 'gemini': {
            const geminiRules = await this.fetchGeminiRules(gitUrl);
            allRules.push(...geminiRules);
            break;
          }
          case 'amazon-q': {
            const amazonQRules = await this.fetchAmazonQRules(gitUrl);
            allRules.push(...amazonQRules);
            break;
          }
          case 'continue': {
            const continueRules = await this.fetchContinueRules(gitUrl);
            allRules.push(...continueRules);
            break;
          }
          case 'aider': {
            const aiderRules = await this.fetchAiderRules(gitUrl);
            allRules.push(...aiderRules);
            break;
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch ${ruleType} rules: ${error}`);
      }
    }

    return {
      rules: allRules,
      totalCount: allRules.length,
      ruleTypes: [...new Set(allRules.map(r => r.type))],
    };
  }

  // ─── Cursor ───────────────────────────────────────────────────────────────

  private async fetchCursorRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    // Legacy .cursorrules root file
    try {
      const content = await this.fetchFileContent(gitUrl, '.cursorrules');
      const rule = this.parseCursorRule('.cursorrules', content, gitUrl);
      if (rule) {
        rules.push(rule);
        processedFiles.add('.cursorrules');
      }
    } catch (_e) { /* not found */ }

    // .cursor/rules directory
    const files = await this.listDirectoryFiles(gitUrl, '.cursor/rules');
    for (const file of files) {
      if (file.endsWith('.mdc') || file.endsWith('.md')) {
        const fullFilePath = `.cursor/rules/${file}`;
        if (processedFiles.has(fullFilePath)) continue;
        try {
          const content = await this.fetchFileContent(gitUrl, fullFilePath);
          const rule = this.parseCursorRule(fullFilePath, content, gitUrl);
          if (rule) {
            rules.push(rule);
            processedFiles.add(fullFilePath);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch cursor rule ${file}: ${error}`);
        }
      }
    }

    // Cursor project memory file
    for (const memoryPath of ['.cursor/MEMORY.md', '.cursor/memory.md']) {
      if (!processedFiles.has(memoryPath)) {
        try {
          const content = await this.fetchFileContent(gitUrl, memoryPath);
          const rule = this.parseCursorRule(memoryPath, content, gitUrl);
          if (rule) {
            rules.push(rule);
            processedFiles.add(memoryPath);
          }
        } catch (_e) { /* not found */ }
      }
    }

    return rules;
  }

  private parseCursorRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const parsed = matter(content);
      return {
        type: 'cursor',
        id: `cursor-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace(/\.(mdc|md)$/, ''),
        content: parsed.content.trim(),
        gitUrl,
        description: parsed.data.description,
        globs: parsed.data.globs,
        alwaysApply: parsed.data.alwaysApply,
        frontmatter: Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse cursor rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Copilot ──────────────────────────────────────────────────────────────

  private async fetchCopilotRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    try {
      const content = await this.fetchFileContent(gitUrl, '.github/copilot-instructions.md');
      rules.push(...this.parseLegacyCopilotRules(content, gitUrl));
    } catch (_e) { /* not found */ }

    const files = await this.listDirectoryFiles(gitUrl, '.github/instructions');
    for (const file of files) {
      if (file.endsWith('.instructions.md')) {
        if (processedFiles.has(file)) continue;
        const fullPath = `.github/instructions/${file}`;
        try {
          const content = await this.fetchFileContent(gitUrl, fullPath);
          const rule = this.parseCopilotRule(fullPath, content, gitUrl);
          if (rule) {
            rules.push(rule);
            processedFiles.add(file);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch copilot rule ${file}: ${error}`);
        }
      }
    }

    return rules;
  }

  private parseLegacyCopilotRules(content: string, gitUrl: string): AIRule[] {
    if (!content.trim()) return [];
    return [{
      type: 'copilot',
      id: 'copilot-legacy-instructions',
      filePath: '.github/copilot-instructions.md',
      fileName: 'Copilot Instructions',
      content: content.trim(),
      gitUrl,
      title: 'copilot-instructions',
    }];
  }

  private parseCopilotRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const parsed = matter(content);
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.instructions.md', '');
      return {
        type: 'copilot',
        id: `copilot-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.instructions.md', ''),
        content: parsed.content.trim(),
        gitUrl,
        title,
        applyTo: parsed.data.applyTo,
        frontmatter: Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse copilot rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Cline ────────────────────────────────────────────────────────────────

  private async fetchClineRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];

    // Root .clinerules file (fallback)
    try {
      const content = await this.fetchFileContent(gitUrl, '.clinerules');
      const rule = this.parseClineRule('.clinerules', content, gitUrl);
      if (rule) rules.push(rule);
    } catch (_e) { /* not found */ }

    // .clinerules/ directory
    const files = await this.listDirectoryFiles(gitUrl, '.clinerules');
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullFilePath = `.clinerules/${file}`;
        try {
          const content = await this.fetchFileContent(gitUrl, fullFilePath);
          const rule = this.parseClineRule(fullFilePath, content, gitUrl);
          if (rule) rules.push(rule);
        } catch (error) {
          this.logger.warn(`Failed to fetch cline rule ${fullFilePath}: ${error}`);
        }
      }
    }

    return rules;
  }

  private parseClineRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');

      const sections: Array<{ title: string; content: string }> = [];
      const sectionRegex = /^## (.+)$/gm;
      let match;
      let lastIndex = 0;

      while ((match = sectionRegex.exec(content)) !== null) {
        if (lastIndex > 0) {
          const sectionContent = content.slice(lastIndex, match.index).trim();
          const prevMatch = content.slice(0, lastIndex).match(/^## (.+)$/g);
          if (prevMatch) {
            const prevTitle = prevMatch[prevMatch.length - 1].replace(/^## /, '');
            sections.push({ title: prevTitle, content: sectionContent });
          }
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex > 0) {
        const lastSectionContent = content.slice(lastIndex).trim();
        const lastMatch = content.slice(0, lastIndex).match(/^## (.+)$/g);
        if (lastMatch) {
          const lastTitle = lastMatch[lastMatch.length - 1].replace(/^## /, '');
          sections.push({ title: lastTitle, content: lastSectionContent });
        }
      }

      return {
        type: 'cline',
        id: `cline-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content,
        gitUrl,
        title,
        sections: sections.length > 0 ? sections : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse cline rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Claude Code ──────────────────────────────────────────────────────────

  private async fetchClaudeCodeRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    // Root CLAUDE.md
    try {
      const content = await this.fetchFileContent(gitUrl, 'CLAUDE.md');
      const rule = this.parseClaudeCodeRule('CLAUDE.md', content, gitUrl);
      if (rule) { rules.push(rule); processedFiles.add('CLAUDE.md'); }
    } catch (_e) { /* not found */ }

    // .claude/CLAUDE.md
    try {
      const content = await this.fetchFileContent(gitUrl, '.claude/CLAUDE.md');
      if (!processedFiles.has('.claude/CLAUDE.md')) {
        const rule = this.parseClaudeCodeRule('.claude/CLAUDE.md', content, gitUrl);
        if (rule) { rules.push(rule); processedFiles.add('.claude/CLAUDE.md'); }
      }
    } catch (_e) { /* not found */ }

    // CLAUDE.local.md
    try {
      const content = await this.fetchFileContent(gitUrl, 'CLAUDE.local.md');
      if (!processedFiles.has('CLAUDE.local.md')) {
        const rule = this.parseClaudeCodeRule('CLAUDE.local.md', content, gitUrl);
        if (rule) { rules.push(rule); processedFiles.add('CLAUDE.local.md'); }
      }
    } catch (_e) { /* not found */ }

    // .claude/rules/ directory
    const claudeRuleFiles = await this.listDirectoryFiles(gitUrl, '.claude/rules');
    for (const file of claudeRuleFiles) {
      if (file.endsWith('.md')) {
        const fullPath = `.claude/rules/${file}`;
        if (processedFiles.has(fullPath)) continue;
        try {
          const content = await this.fetchFileContent(gitUrl, fullPath);
          const rule = this.parseClaudeCodeRule(fullPath, content, gitUrl);
          if (rule) { rules.push(rule); processedFiles.add(fullPath); }
        } catch (error) {
          this.logger.warn(`Failed to fetch claude-code rule ${fullPath}: ${error}`);
        }
      }
    }

    return rules;
  }

  private parseClaudeCodeRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : 'Claude Code Rules';
      return {
        type: 'claude-code',
        id: `claude-code-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content,
        gitUrl,
        title,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse Claude Code rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Windsurf ─────────────────────────────────────────────────────────────

  private async fetchWindsurfRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    // Root .windsurfrules file
    try {
      const content = await this.fetchFileContent(gitUrl, '.windsurfrules');
      const rule = this.parseWindsurfRule('.windsurfrules', content, gitUrl);
      if (rule) { rules.push(rule); processedFiles.add('.windsurfrules'); }
    } catch (_e) { /* not found */ }

    // .windsurf/rules/ directory
    const files = await this.listDirectoryFiles(gitUrl, '.windsurf/rules');
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullPath = `.windsurf/rules/${file}`;
        if (processedFiles.has(fullPath)) continue;
        try {
          const content = await this.fetchFileContent(gitUrl, fullPath);
          const rule = this.parseWindsurfRule(fullPath, content, gitUrl);
          if (rule) { rules.push(rule); processedFiles.add(fullPath); }
        } catch (error) {
          this.logger.warn(`Failed to fetch windsurf rule ${fullPath}: ${error}`);
        }
      }
    }

    return rules;
  }

  private parseWindsurfRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      return {
        type: 'windsurf',
        id: `windsurf-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace(/\.(md)$/, ''),
        content,
        gitUrl,
        title,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse windsurf rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Roo Code ─────────────────────────────────────────────────────────────

  private async fetchRooCodeRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    // Root .roorules fallback file
    try {
      const content = await this.fetchFileContent(gitUrl, '.roorules');
      const rule = this.parseRooCodeRule('.roorules', content, gitUrl, undefined);
      if (rule) { rules.push(rule); processedFiles.add('.roorules'); }
    } catch (_e) { /* not found */ }

    // .roo/rules/ and mode-specific directories
    const rooDirectories: Array<{ path: string; mode?: string }> = [
      { path: '.roo/rules', mode: undefined },
      { path: '.roo/rules-code', mode: 'code' },
      { path: '.roo/rules-architect', mode: 'architect' },
      { path: '.roo/rules-ask', mode: 'ask' },
      { path: '.roo/rules-debug', mode: 'debug' },
    ];

    for (const { path, mode } of rooDirectories) {
      const files = await this.listDirectoryFiles(gitUrl, path);
      for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.txt')) {
          const fullPath = `${path}/${file}`;
          if (processedFiles.has(fullPath)) continue;
          try {
            const content = await this.fetchFileContent(gitUrl, fullPath);
            const rule = this.parseRooCodeRule(fullPath, content, gitUrl, mode);
            if (rule) { rules.push(rule); processedFiles.add(fullPath); }
          } catch (error) {
            this.logger.warn(`Failed to fetch roo-code rule ${fullPath}: ${error}`);
          }
        }
      }
    }

    return rules;
  }

  private parseRooCodeRule(filePath: string, content: string, gitUrl: string, mode: string | undefined): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace(/\.(md|txt)$/, '');
      return {
        type: 'roo-code',
        id: `roo-code-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace(/\.(md|txt)$/, ''),
        content,
        gitUrl,
        title,
        mode,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse roo-code rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── OpenAI Codex ─────────────────────────────────────────────────────────

  private async fetchCodexRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    for (const fileName of ['AGENTS.md', 'AGENTS.override.md']) {
      try {
        const content = await this.fetchFileContent(gitUrl, fileName);
        if (!processedFiles.has(fileName)) {
          const rule = this.parseCodexRule(fileName, content, gitUrl);
          if (rule) { rules.push(rule); processedFiles.add(fileName); }
        }
      } catch (_e) { /* not found */ }
    }

    return rules;
  }

  private parseCodexRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      return {
        type: 'codex',
        id: `codex-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content,
        gitUrl,
        title,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse codex rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Gemini CLI ───────────────────────────────────────────────────────────

  private async fetchGeminiRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    // Root GEMINI.md
    try {
      const content = await this.fetchFileContent(gitUrl, 'GEMINI.md');
      if (!processedFiles.has('GEMINI.md')) {
        const rule = this.parseGeminiRule('GEMINI.md', content, gitUrl);
        if (rule) { rules.push(rule); processedFiles.add('GEMINI.md'); }
      }
    } catch (_e) { /* not found */ }

    // .gemini/ directory
    const files = await this.listDirectoryFiles(gitUrl, '.gemini');
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullPath = `.gemini/${file}`;
        if (processedFiles.has(fullPath)) continue;
        try {
          const content = await this.fetchFileContent(gitUrl, fullPath);
          const rule = this.parseGeminiRule(fullPath, content, gitUrl);
          if (rule) { rules.push(rule); processedFiles.add(fullPath); }
        } catch (error) {
          this.logger.warn(`Failed to fetch gemini rule ${fullPath}: ${error}`);
        }
      }
    }

    return rules;
  }

  private parseGeminiRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      return {
        type: 'gemini',
        id: `gemini-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content,
        gitUrl,
        title,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse gemini rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Amazon Q Developer ───────────────────────────────────────────────────

  private async fetchAmazonQRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];

    const files = await this.listDirectoryFiles(gitUrl, '.amazonq/rules');
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullPath = `.amazonq/rules/${file}`;
        try {
          const content = await this.fetchFileContent(gitUrl, fullPath);
          const rule = this.parseAmazonQRule(fullPath, content, gitUrl);
          if (rule) rules.push(rule);
        } catch (error) {
          this.logger.warn(`Failed to fetch amazon-q rule ${fullPath}: ${error}`);
        }
      }
    }

    return rules;
  }

  private parseAmazonQRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      return {
        type: 'amazon-q',
        id: `amazon-q-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content,
        gitUrl,
        title,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse amazon-q rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Continue.dev ─────────────────────────────────────────────────────────

  private async fetchContinueRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    for (const dirPath of ['.continue/rules', '.continue/prompts']) {
      const files = await this.listDirectoryFiles(gitUrl, dirPath);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const fullPath = `${dirPath}/${file}`;
          if (processedFiles.has(fullPath)) continue;
          try {
            const content = await this.fetchFileContent(gitUrl, fullPath);
            const rule = this.parseContinueRule(fullPath, content, gitUrl);
            if (rule) { rules.push(rule); processedFiles.add(fullPath); }
          } catch (error) {
            this.logger.warn(`Failed to fetch continue rule ${fullPath}: ${error}`);
          }
        }
      }
    }

    return rules;
  }

  private parseContinueRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const parsed = matter(content);
      const name = parsed.data.name || fileName.replace('.md', '');
      return {
        type: 'continue',
        id: `continue-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content: parsed.content.trim(),
        gitUrl,
        title: name,
        alwaysApply: parsed.data.alwaysApply,
        frontmatter: Object.keys(parsed.data).length > 0 ? parsed.data : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse continue rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Aider ────────────────────────────────────────────────────────────────

  private async fetchAiderRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];

    try {
      const content = await this.fetchFileContent(gitUrl, 'CONVENTIONS.md');
      const rule = this.parseAiderRule('CONVENTIONS.md', content, gitUrl);
      if (rule) rules.push(rule);
    } catch (_e) { /* not found */ }

    return rules;
  }

  private parseAiderRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      return {
        type: 'aider',
        id: `aider-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        filePath,
        fileName: fileName.replace('.md', ''),
        content,
        gitUrl,
        title,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse aider rule ${filePath}: ${error}`);
      return null;
    }
  }

  // ─── Retry / IO helpers ───────────────────────────────────────────────────

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
    maxDelayMs: number = 10000,
    operationName: string = 'operation',
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const shouldRetry = this.shouldRetryError(error as Error);
        if (!shouldRetry || attempt === maxRetries) {
          this.logger.warn(`${operationName} failed after ${attempt + 1} attempts: ${lastError.message}`);
          throw lastError;
        }
        const baseDelay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = Math.random() * 0.1 * baseDelay;
        const delayMs = baseDelay + jitter;
        this.logger.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delayMs)}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw lastError!;
  }

  private shouldRetryError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('429') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('enotfound')
    );
  }

  private async listDirectoryFiles(gitUrl: string, path: string): Promise<string[]> {
    try {
      return await this.retryWithBackoff(
        async () => {
          const directoryUrl = `${gitUrl}/tree/HEAD/${path}`;
          const treeResponse = await this.urlReader.readTree(directoryUrl);
          const files: string[] = [];
          const filesArray = await treeResponse.files();
          for (const file of filesArray) {
            if (file.path && !file.path.endsWith('/')) {
              files.push(file.path);
            }
          }
          return files;
        },
        3,
        1000,
        10000,
        `listDirectoryFiles(${path})`,
      );
    } catch (error) {
      this.logger.error(`Failed to list directory ${path} after retries: ${error}`);
      return [];
    }
  }

  private async fetchFileContent(gitUrl: string, filePath: string): Promise<string> {
    return await this.retryWithBackoff(
      async () => {
        const fileUrl = `${gitUrl}/blob/HEAD/${filePath}`;
        const response = await this.urlReader.readUrl(fileUrl);
        const buffer = await response.buffer();
        return buffer.toString('utf-8');
      },
      3,
      1000,
      10000,
      `fetchFileContent(${filePath})`,
    );
  }
}
