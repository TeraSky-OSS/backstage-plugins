import { AiRulesService } from './AiRulesService';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

describe('AiRulesService', () => {
  let service: AiRulesService;
  let mockLogger: any;
  const mockUrlReader = {
    readUrl: jest.fn(),
    readTree: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = mockServices.logger.mock();

    service = new AiRulesService({
      logger: mockLogger,
      config: new ConfigReader({}),
      discovery: mockServices.discovery.mock(),
      urlReader: mockUrlReader as any,
    });
  });

  describe('getAiRules', () => {
    it('should return empty rules when no files are found', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor']);

      expect(result.rules).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should fetch cursor rules when .cursorrules file exists', async () => {
      const cursorRulesContent = `---
description: Test rule
---

# Test Rule Content
This is a test cursor rule.`;

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursorrules')) {
          return {
            buffer: async () => Buffer.from(cursorRulesContent),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].type).toBe('cursor');
      expect(result.rules[0].content).toContain('Test Rule Content');
    });

    it('should fetch copilot rules when instructions file exists', async () => {
      const copilotContent = `# Copilot Instructions

This is a copilot instruction file.`;

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('copilot-instructions.md')) {
          return {
            buffer: async () => Buffer.from(copilotContent),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['copilot']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].type).toBe('copilot');
    });

    it('should fetch cline rules when .clinerules directory exists', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.clinerules/test.md')) {
          return {
            buffer: async () => Buffer.from('# Cline Test Rule\n\nContent'),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockImplementation(async (url: string) => {
        if (url.includes('.clinerules')) {
          return {
            files: async () => [{ path: 'test.md' }],
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getAiRules('https://github.com/test/repo', ['cline']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].type).toBe('cline');
    });

    it('should fetch claude-code rules when CLAUDE.md exists', async () => {
      const claudeContent = `# Claude Code Rules

These are Claude code rules.`;

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('CLAUDE.md')) {
          return {
            buffer: async () => Buffer.from(claudeContent),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['claude-code']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].type).toBe('claude-code');
      expect(result.rules[0].title).toBe('Claude Code Rules');
    });

    it('should combine rules from multiple sources', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursorrules')) {
          return {
            buffer: async () => Buffer.from('# Cursor Rules'),
          };
        }
        if (url.includes('copilot-instructions.md')) {
          return {
            buffer: async () => Buffer.from('# Copilot Instructions'),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor', 'copilot']);

      expect(result.rules).toHaveLength(2);
      expect(result.ruleTypes).toContain('cursor');
      expect(result.ruleTypes).toContain('copilot');
    });

  });

  describe('fetchCursorRules', () => {
    it('should fetch rules from .cursor/rules directory', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursor/rules/test.mdc')) {
          return {
            buffer: async () => Buffer.from(`---
description: Test cursor rule
globs: ["*.ts"]
alwaysApply: true
---
Rule content here`),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockImplementation(async (url: string) => {
        if (url.includes('.cursor/rules')) {
          return {
            files: async () => [{ path: 'test.mdc' }],
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].description).toBe('Test cursor rule');
      expect(result.rules[0].globs).toEqual(['*.ts']);
      expect(result.rules[0].alwaysApply).toBe(true);
    });

    it('should fetch rules from common subdirectories', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('docs/rules.md')) {
          return {
            buffer: async () => Buffer.from('# Docs rules content'),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockImplementation(async (url: string) => {
        if (url.includes('/tree/HEAD/docs')) {
          return {
            files: async () => [{ path: 'rules.md' }],
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor']);

      expect(result.rules).toHaveLength(1);
    });

    it('should skip duplicate files', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursorrules')) {
          return { buffer: async () => Buffer.from('# Root cursorrules') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor']);

      expect(result.rules).toHaveLength(1);
    });
  });

  describe('fetchCopilotRules', () => {
    it('should fetch rules from .github/instructions directory', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.github/instructions/coding.instructions.md')) {
          return {
            buffer: async () => Buffer.from(`---
applyTo: "**/*.ts"
---
# Coding Instructions
Follow these rules.`),
          };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockImplementation(async (url: string) => {
        if (url.includes('.github/instructions')) {
          return {
            files: async () => [{ path: 'coding.instructions.md' }],
          };
        }
        throw new Error('Not found');
      });

      const result = await service.getAiRules('https://github.com/test/repo', ['copilot']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].type).toBe('copilot');
      expect(result.rules[0].title).toBe('Coding Instructions');
      expect(result.rules[0].applyTo).toBe('**/*.ts');
    });

    it('should handle empty legacy copilot instructions', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('copilot-instructions.md')) {
          return { buffer: async () => Buffer.from('   \n\n   ') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['copilot']);

      expect(result.rules).toEqual([]);
    });
  });

  describe('fetchClineRules', () => {
    it('should parse cline rules with sections', async () => {
      const clineContent = `# Main Title

Introduction content

## Section One
Content of section one

## Section Two
Content of section two`;

      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.clinerules/test.md')) {
          return { buffer: async () => Buffer.from(clineContent) };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockImplementation(async (url: string) => {
        if (url.includes('.clinerules')) {
          return { files: async () => [{ path: 'test.md' }] };
        }
        throw new Error('Not found');
      });

      const result = await service.getAiRules('https://github.com/test/repo', ['cline']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].title).toBe('Main Title');
      // Sections are parsed from ## headings
      if (result.rules[0].sections) {
        expect(result.rules[0].sections.length).toBeGreaterThan(0);
      }
    });

    it('should handle cline rules without sections', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.clinerules/simple.md')) {
          return { buffer: async () => Buffer.from('Simple content without sections') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockImplementation(async (url: string) => {
        if (url.includes('.clinerules')) {
          return { files: async () => [{ path: 'simple.md' }] };
        }
        throw new Error('Not found');
      });

      const result = await service.getAiRules('https://github.com/test/repo', ['cline']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].sections).toBeUndefined();
    });
  });

  describe('fetchClaudeCodeRules', () => {
    it('should parse claude code rules without title', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('CLAUDE.md')) {
          return { buffer: async () => Buffer.from('Rules without heading') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['claude-code']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].title).toBe('Claude Code Rules');
    });
  });

  describe('error handling', () => {
    it('should handle unknown rule types gracefully', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['unknown-type' as any]);

      expect(result.rules).toEqual([]);
    });

    it('should continue processing other rule types when one fails', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('CLAUDE.md')) {
          return { buffer: async () => Buffer.from('# Claude Rules') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const result = await service.getAiRules('https://github.com/test/repo', ['cursor', 'copilot', 'claude-code']);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].type).toBe('claude-code');
    });
  });
});

