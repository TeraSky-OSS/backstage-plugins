import { AiRulesService } from './AiRulesService';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

describe('AiRulesService', () => {
  let service: AiRulesService;
  const mockUrlReader = {
    readUrl: jest.fn(),
    readTree: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AiRulesService({
      logger: mockServices.logger.mock(),
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
});

