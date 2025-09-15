import { LoggerService, DiscoveryService, UrlReaderService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
const matter = require('gray-matter');

export interface AIRule {
  type: 'cursor' | 'copilot' | 'cline' | 'claude-code';
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
          case 'cursor':
            const cursorRules = await this.fetchCursorRules(gitUrl);
            allRules.push(...cursorRules);
            break;
          case 'copilot':
            const copilotRules = await this.fetchCopilotRules(gitUrl);
            allRules.push(...copilotRules);
            break;
          case 'cline':
            const clineRules = await this.fetchClineRules(gitUrl);
            allRules.push(...clineRules);
            break;
          case 'claude-code':
            const claudeCodeRules = await this.fetchClaudeCodeRules(gitUrl);
            allRules.push(...claudeCodeRules);
            break;
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

  private async fetchCursorRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>(); // Track processed files to avoid duplicates
    
    // Check for single .cursorrules file first
    try {
      const content = await this.fetchFileContent(gitUrl, '.cursorrules');
      const rule = this.parseCursorRule('.cursorrules', content, gitUrl);
      if (rule) {
        rules.push(rule);
        processedFiles.add('.cursorrules');
      }
    } catch (error) {
      // File not found, continue
    }

    // Check for .cursor/rules directory
    const cursorPaths = [
      '.cursor/rules',
    ];

    for (const basePath of cursorPaths) {
      try {
        const files = await this.listDirectoryFiles(gitUrl, basePath);
        
        for (const file of files) {
          if (file.endsWith('.mdc') || file.endsWith('.md')) {
            try {
              // Always construct the full path by prepending the base path
              const fullFilePath = `${basePath}/${file}`;
              
              // Skip if we've already processed this file
              if (processedFiles.has(fullFilePath)) {
                continue;
              }
              
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
      } catch (error) {
        // Directory not found, continue
      }
    }

    // Check in common subdirectories
    const commonSubdirs = ['docs', 'documentation', 'rules', 'ai-rules', 'prompts'];
    for (const subdir of commonSubdirs) {
      try {
        const files = await this.listDirectoryFiles(gitUrl, subdir);
        
        for (const file of files) {
          if (file.endsWith('.mdc') || file.endsWith('.md')) {
            try {
              // Construct the full path by prepending the subdirectory path  
              const fullFilePath = `${subdir}/${file}`;
              
              // Skip if we've already processed this file
              if (processedFiles.has(fullFilePath)) {
                continue;
              }
              
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
      } catch (error) {
        // Directory not found, continue
      }
    }

    return rules;
  }

  private async fetchCopilotRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const processedFiles = new Set<string>();

    // Check for legacy .github/copilot-instructions.md file
    try {
      const content = await this.fetchFileContent(gitUrl, '.github/copilot-instructions.md');
      const parsedRules = this.parseLegacyCopilotRules(content, gitUrl);
      rules.push(...parsedRules);
    } catch (error) {
      // Legacy file not found, continue silently
    }

    // Check for new .github/instructions directory
    try {
      const files = await this.listDirectoryFiles(gitUrl, '.github/instructions');
      
      for (const file of files) {
        if (file.endsWith('.instructions.md')) {
          try {
            // Skip if we've already processed this file
            if (processedFiles.has(file)) {
              continue;
            }
            
            const fullPath = `.github/instructions/${file}`;
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
    } catch (error) {
      // Directory not found, continue silently
    }

    return rules;
  }

  private async fetchClineRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    const basePath = '.clinerules';
    
    try {
      const files = await this.listDirectoryFiles(gitUrl, basePath);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          // Always construct the full path by prepending the base path
          const fullFilePath = `${basePath}/${file}`;
          
          try {
            const content = await this.fetchFileContent(gitUrl, fullFilePath);
            const rule = this.parseClineRule(fullFilePath, content, gitUrl);
            if (rule) {
              rules.push(rule);
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch cline rule ${fullFilePath}: ${error}`);
          }
        }
      }
    } catch (error) {
      // Directory not found, continue
    }

    return rules;
  }

  private async fetchClaudeCodeRules(gitUrl: string): Promise<AIRule[]> {
    const rules: AIRule[] = [];
    
    try {
      const content = await this.fetchFileContent(gitUrl, 'CLAUDE.md');
      const rule = this.parseClaudeCodeRule('CLAUDE.md', content, gitUrl);
      if (rule) {
        rules.push(rule);
      }
    } catch (error) {
      // File not found, continue silently
    }

    return rules;
  }

  private parseCursorRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      
      // Parse frontmatter using gray-matter
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



  private parseLegacyCopilotRules(content: string, gitUrl: string): AIRule[] {
    if (!content.trim()) {
      return [];
    }

    // Parse the entire file as a single rule
    return [{
      type: 'copilot',
      id: 'copilot-legacy-instructions',
      filePath: '.github/copilot-instructions.md',
      fileName: 'Copilot Instructions',
      content: content.trim(),
      gitUrl,
      title: 'copilot-instructions'
    }];
  }

  private parseCopilotRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      
      // Parse frontmatter using gray-matter
      const parsed = matter(content);
      
      // Extract title from markdown (first # heading)
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

  private parseClineRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      
      // Extract title from markdown (first # heading)
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');

      // Parse sections (## headings and their content)
      const sections: Array<{ title: string; content: string }> = [];
      const sectionRegex = /^## (.+)$/gm;
      let match;
      let lastIndex = 0;

      while ((match = sectionRegex.exec(content)) !== null) {
        if (lastIndex > 0) {
          // Get content between previous section and current
          const sectionContent = content.slice(lastIndex, match.index).trim();
          const prevMatch = content.slice(0, lastIndex).match(/^## (.+)$/g);
          if (prevMatch) {
            const prevTitle = prevMatch[prevMatch.length - 1].replace(/^## /, '');
            sections.push({ title: prevTitle, content: sectionContent });
          }
        }
        lastIndex = match.index + match[0].length;
      }

      // Handle the last section
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

  private parseClaudeCodeRule(filePath: string, content: string, gitUrl: string): AIRule | null {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      
      // Extract title from markdown (first # heading)
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

  // Helper method for retry logic with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
    maxDelayMs: number = 10000,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error or connection issue that should be retried
        const shouldRetry = this.shouldRetryError(error as Error);
        
        if (!shouldRetry || attempt === maxRetries) {
          this.logger.warn(`${operationName} failed after ${attempt + 1} attempts: ${lastError.message}`);
          throw lastError;
        }
        
        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
        const delayMs = baseDelay + jitter;
        
        this.logger.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delayMs)}ms: ${lastError.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError!;
  }

  // Check if an error should trigger a retry
  private shouldRetryError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Retry on rate limiting, network issues, and temporary server errors
    return (
      errorMessage.includes('429') || // Too Many Requests
      errorMessage.includes('too many requests') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('502') || // Bad Gateway
      errorMessage.includes('503') || // Service Unavailable
      errorMessage.includes('504') || // Gateway Timeout
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('enotfound')
    );
  }

  // URL Reader service methods for files and directories
  private async listDirectoryFiles(gitUrl: string, path: string): Promise<string[]> {
    try {
      return await this.retryWithBackoff(
        async () => {
          // Construct directory URL using the correct format
          const directoryUrl = `${gitUrl}/tree/HEAD/${path}`;

          // Use URL Reader to read the directory tree
          const treeResponse = await this.urlReader.readTree(directoryUrl);
          
          const files: string[] = [];
          
          // Extract files from the tree using the correct API
          const filesArray = await treeResponse.files();
          for (const file of filesArray) {
            // Only include actual files, not directories
            if (file.path && !file.path.endsWith('/')) {
              files.push(file.path);
            }
          }

          return files;
        },
        3, // maxRetries
        1000, // initialDelayMs
        10000, // maxDelayMs
        `listDirectoryFiles(${path})`
      );
    } catch (error) {
      this.logger.error(`Failed to list directory ${path} after retries: ${error}`);
      return [];  // Return empty array instead of throwing
    }
  }

  private async fetchFileContent(gitUrl: string, filePath: string): Promise<string> {
    return await this.retryWithBackoff(
      async () => {
        // Construct file URL using the correct format 
        const fileUrl = `${gitUrl}/blob/HEAD/${filePath}`;

        // Use URL Reader to read the file using the documented API
        const response = await this.urlReader.readUrl(fileUrl);
        const buffer = await response.buffer();
        const content = buffer.toString('utf-8');
        
        return content;
      },
      3, // maxRetries
      1000, // initialDelayMs
      10000, // maxDelayMs
      `fetchFileContent(${filePath})`
    );
  }
} 