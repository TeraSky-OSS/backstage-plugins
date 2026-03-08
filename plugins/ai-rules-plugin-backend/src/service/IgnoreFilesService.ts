import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';

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

export interface IgnoreFilesServiceOptions {
  logger: LoggerService;
  urlReader: UrlReaderService;
}

const IGNORE_FILE_DEFINITIONS: Array<{ agent: string; filePath: string }> = [
  { agent: 'Cursor', filePath: '.cursorignore' },
  { agent: 'Aider', filePath: '.aiderignore' },
  { agent: 'Roo Code', filePath: '.rooignore' },
  { agent: 'Gemini CLI', filePath: '.geminiignore' },
  { agent: 'Copilot', filePath: '.copilotignore' },
];

export class IgnoreFilesService {
  private readonly logger: LoggerService;
  private readonly urlReader: UrlReaderService;

  constructor(options: IgnoreFilesServiceOptions) {
    this.logger = options.logger;
    this.urlReader = options.urlReader;
  }

  async getIgnoreFiles(gitUrl: string): Promise<IgnoreFilesResponse> {
    const files: IgnoreFile[] = [];

    for (const def of IGNORE_FILE_DEFINITIONS) {
      try {
        const content = await this.fetchFileContent(gitUrl, def.filePath);
        files.push({
          agent: def.agent,
          filePath: def.filePath,
          content: content.trim(),
          gitUrl,
        });
        this.logger.info(`Found ignore file: ${def.filePath}`);
      } catch (_e) {
        // File not present — skip silently
      }
    }

    return { files, totalCount: files.length };
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
