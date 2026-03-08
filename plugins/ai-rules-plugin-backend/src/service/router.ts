import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { LoggerService, DiscoveryService, UrlReaderService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { InputError, NotFoundError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { AiRulesService } from './AiRulesService';
import { MCPService } from './MCPService';
import { IgnoreFilesService } from './IgnoreFilesService';
import { AgentConfigsService } from './AgentConfigsService';
import { SkillsService } from './SkillsService';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  discovery: DiscoveryService;
  urlReader: UrlReaderService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, discovery, urlReader } = options;

  const aiRulesService = new AiRulesService({ logger, config, discovery, urlReader });
  const mcpService = new MCPService({ logger, urlReader });
  const ignoreFilesService = new IgnoreFilesService({ logger, urlReader });
  const agentConfigsService = new AgentConfigsService({ logger, urlReader });
  const skillsService = new SkillsService({ logger, urlReader });

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/mcp-servers', async (request, response) => {
    const { gitUrl } = request.query;
    if (!gitUrl || typeof gitUrl !== 'string') {
      throw new InputError('gitUrl query parameter is required');
    }
    try {
      const mcpResponse = await mcpService.getMCPServers(gitUrl);
      response.json(mcpResponse);
    } catch (error) {
      logger.error('Error fetching MCP servers', error as Error);
      if (error instanceof InputError || error instanceof NotFoundError) throw error;
      throw new Error('Failed to fetch MCP servers');
    }
  });

  router.get('/rules', async (request, response) => {
    const { gitUrl, ruleTypes } = request.query;
    if (!gitUrl || typeof gitUrl !== 'string') {
      throw new InputError('gitUrl query parameter is required');
    }
    try {
      const allowedRuleTypes = ruleTypes
        ? (ruleTypes as string).split(',').map(t => t.trim())
        : ['cursor', 'copilot', 'cline', 'claude-code', 'windsurf', 'roo-code', 'codex', 'gemini', 'amazon-q', 'continue', 'aider'];
      const rulesResponse = await aiRulesService.getAiRules(gitUrl, allowedRuleTypes);
      response.json(rulesResponse);
    } catch (error) {
      logger.error('Error fetching AI rules', error as Error);
      if (error instanceof InputError || error instanceof NotFoundError) throw error;
      throw new Error('Failed to fetch AI rules');
    }
  });

  router.get('/ignore-files', async (request, response) => {
    const { gitUrl } = request.query;
    if (!gitUrl || typeof gitUrl !== 'string') {
      throw new InputError('gitUrl query parameter is required');
    }
    try {
      const ignoreResponse = await ignoreFilesService.getIgnoreFiles(gitUrl);
      response.json(ignoreResponse);
    } catch (error) {
      logger.error('Error fetching ignore files', error as Error);
      if (error instanceof InputError || error instanceof NotFoundError) throw error;
      throw new Error('Failed to fetch ignore files');
    }
  });

  router.get('/agent-configs', async (request, response) => {
    const { gitUrl } = request.query;
    if (!gitUrl || typeof gitUrl !== 'string') {
      throw new InputError('gitUrl query parameter is required');
    }
    try {
      const configsResponse = await agentConfigsService.getAgentConfigs(gitUrl);
      response.json(configsResponse);
    } catch (error) {
      logger.error('Error fetching agent configs', error as Error);
      if (error instanceof InputError || error instanceof NotFoundError) throw error;
      throw new Error('Failed to fetch agent configs');
    }
  });

  router.get('/skills', async (request, response) => {
    const { gitUrl } = request.query;
    if (!gitUrl || typeof gitUrl !== 'string') {
      throw new InputError('gitUrl query parameter is required');
    }
    try {
      const skillsResponse = await skillsService.getSkills(gitUrl);
      response.json(skillsResponse);
    } catch (error) {
      logger.error('Error fetching agent skills', error as Error);
      if (error instanceof InputError || error instanceof NotFoundError) throw error;
      throw new Error('Failed to fetch agent skills');
    }
  });

  const middleware = MiddlewareFactory.create({ logger, config });
  router.use(middleware.error());
  return router;
}
