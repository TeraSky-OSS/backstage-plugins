import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';

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

export interface AgentConfigsServiceOptions {
  logger: LoggerService;
  urlReader: UrlReaderService;
}

const AGENT_CONFIG_DEFINITIONS: Array<{ agent: string; filePath: string; language: AgentConfig['language'] }> = [
  { agent: 'Aider', filePath: '.aider.conf.yml', language: 'yaml' },
  { agent: 'Continue', filePath: '.continue/config.yaml', language: 'yaml' },
  { agent: 'Continue', filePath: '.continue/config.json', language: 'json' },
  { agent: 'Cursor', filePath: '.cursor/settings.json', language: 'json' },
  { agent: 'Zed', filePath: '.zed/assistant.json', language: 'json' },
];

export class AgentConfigsService {
  private readonly logger: LoggerService;
  private readonly urlReader: UrlReaderService;

  constructor(options: AgentConfigsServiceOptions) {
    this.logger = options.logger;
    this.urlReader = options.urlReader;
  }

  async getAgentConfigs(gitUrl: string): Promise<AgentConfigsResponse> {
    const configs: AgentConfig[] = [];
    // Track which agents we've already found a config for (to avoid duplicates
    // e.g. both .continue/config.yaml and .continue/config.json)
    const foundAgentConfigPaths = new Set<string>();

    for (const def of AGENT_CONFIG_DEFINITIONS) {
      // For Continue, prefer yaml over json — skip json if yaml was found
      const dedupeKey = `${def.agent}:${def.filePath.split('/')[0]}`;
      if (foundAgentConfigPaths.has(dedupeKey)) continue;

      try {
        const content = await this.fetchFileContent(gitUrl, def.filePath);
        configs.push({
          agent: def.agent,
          filePath: def.filePath,
          content: content.trim(),
          language: def.language,
          gitUrl,
        });
        foundAgentConfigPaths.add(dedupeKey);
        this.logger.info(`Found agent config: ${def.filePath}`);
      } catch (_e) {
        // File not present — skip silently
      }
    }

    return { configs, totalCount: configs.length };
  }

  private async fetchFileContent(gitUrl: string, filePath: string): Promise<string> {
    const cleanGitUrl = gitUrl.replace(/\/+$/, '');
    const fileUrl = cleanGitUrl.includes('github.com')
      ? `${cleanGitUrl}/raw/main/${filePath}`
      : `${cleanGitUrl}/blob/HEAD/${filePath}`;

    const response = await this.urlReader.readUrl(fileUrl);
    const buffer = await response.buffer();
    return buffer.toString('utf-8');
  }
}
