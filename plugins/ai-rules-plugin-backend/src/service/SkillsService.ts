import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';
const matter = require('gray-matter');

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

export interface SkillsServiceOptions {
  logger: LoggerService;
  urlReader: UrlReaderService;
}

const SKILLS_DIRECTORIES: Array<{ path: string; source: AgentSkill['source'] }> = [
  { path: '.agents/skills', source: 'cross-client' },
  { path: '.claude/skills', source: 'claude' },
  { path: '.cursor/skills', source: 'cursor' },
];

export class SkillsService {
  private readonly logger: LoggerService;
  private readonly urlReader: UrlReaderService;

  constructor(options: SkillsServiceOptions) {
    this.logger = options.logger;
    this.urlReader = options.urlReader;
  }

  async getSkills(gitUrl: string): Promise<SkillsResponse> {
    const skills: AgentSkill[] = [];
    // Deduplicate by skill name — project-level source wins over cross-client
    const seenNames = new Map<string, AgentSkill['source']>();

    for (const { path, source } of SKILLS_DIRECTORIES) {
      const skillDirs = await this.listSubdirectories(gitUrl, path);

      for (const skillDir of skillDirs) {
        const skillMdPath = `${path}/${skillDir}/SKILL.md`;
        try {
          const skillMdContent = await this.fetchFileContent(gitUrl, skillMdPath);
          const skill = await this.parseSkill(skillMdPath, skillMdContent, gitUrl, source, `${path}/${skillDir}`);
          if (!skill) continue;

          // Per spec: project-level skills override cross-client with same name
          const existing = seenNames.get(skill.name);
          if (existing && existing !== 'cross-client' && source === 'cross-client') {
            this.logger.debug(`Skipping cross-client skill '${skill.name}' — already found in ${existing}`);
            continue;
          }

          seenNames.set(skill.name, source);
          skills.push(skill);
          this.logger.info(`Found skill: ${skill.name} in ${path}/${skillDir}`);
        } catch (_e) {
          // SKILL.md not found in this subdirectory — not a valid skill
        }
      }
    }

    return { skills, totalCount: skills.length };
  }

  private async parseSkill(
    filePath: string,
    content: string,
    gitUrl: string,
    source: AgentSkill['source'],
    skillDir: string,
  ): Promise<AgentSkill | null> {
    try {
      const parsed = matter(content);

      const { name, description, license, compatibility, metadata } = parsed.data;

      if (!description) {
        this.logger.warn(`Skipping skill at ${filePath}: missing required 'description' field`);
        return null;
      }

      const skillName = name || skillDir.split('/').pop() || 'unknown';

      const allowedToolsRaw: string | undefined = parsed.data['allowed-tools'];
      const allowedTools = allowedToolsRaw
        ? allowedToolsRaw.split(/\s+/).filter(Boolean)
        : undefined;

      // Enumerate resource files (filenames only — no eager loading)
      const resources = await this.enumerateResources(gitUrl, skillDir);

      return {
        name: skillName,
        description,
        source,
        sourceDirectory: skillDir,
        filePath,
        content: parsed.content.trim(),
        license,
        compatibility,
        metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
        allowedTools,
        resources,
        gitUrl,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse skill at ${filePath}: ${error}`);
      return null;
    }
  }

  private async enumerateResources(
    gitUrl: string,
    skillDir: string,
  ): Promise<AgentSkill['resources']> {
    const resources: AgentSkill['resources'] = { scripts: [], references: [], assets: [] };

    const resourceDirs: Array<{ key: keyof AgentSkill['resources']; subDir: string }> = [
      { key: 'scripts', subDir: 'scripts' },
      { key: 'references', subDir: 'references' },
      { key: 'assets', subDir: 'assets' },
    ];

    for (const { key, subDir } of resourceDirs) {
      try {
        const files = await this.listDirectoryFiles(gitUrl, `${skillDir}/${subDir}`);
        resources[key] = files;
      } catch (_e) {
        // Subdirectory doesn't exist — fine
      }
    }

    return resources;
  }

  private async listSubdirectories(gitUrl: string, path: string): Promise<string[]> {
    try {
      const directoryUrl = `${gitUrl}/tree/HEAD/${path}`;
      const treeResponse = await this.urlReader.readTree(directoryUrl);
      const filesArray = await treeResponse.files();

      // Extract unique immediate subdirectory names
      const subdirs = new Set<string>();
      for (const file of filesArray) {
        if (file.path) {
          const parts = file.path.split('/');
          if (parts.length >= 1 && parts[0]) {
            subdirs.add(parts[0]);
          }
        }
      }
      return [...subdirs];
    } catch (_e) {
      return [];
    }
  }

  private async listDirectoryFiles(gitUrl: string, path: string): Promise<string[]> {
    try {
      const directoryUrl = `${gitUrl}/tree/HEAD/${path}`;
      const treeResponse = await this.urlReader.readTree(directoryUrl);
      const filesArray = await treeResponse.files();
      return filesArray
        .map(f => f.path)
        .filter((p): p is string => !!p && !p.endsWith('/'));
    } catch (_e) {
      return [];
    }
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
