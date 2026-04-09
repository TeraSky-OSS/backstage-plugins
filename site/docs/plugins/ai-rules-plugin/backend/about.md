# AI Coding Rules Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-ai-rules-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-ai-rules-backend) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-ai-rules-backend)

## Overview

The AI Coding Rules backend plugin provides the server-side functionality required to fetch and parse AI coding rules, MCP server configurations, agent ignore files, agent configuration files, and Agent Skills from Git repositories. It handles integration with Backstage's SCM integrations, parses various file formats, includes retry logic with exponential backoff, and exposes REST API endpoints for the frontend plugin to consume.

## Features

### Repository Integration

- Seamless integration with all Backstage SCM integrations
- Support for GitHub, GitLab, Bitbucket, and Azure DevOps
- Handles both public and private repositories
- Retry logic with exponential backoff for rate limiting
- Efficient file and directory fetching with network resilience

### Rule Type Support (11 Agents)

| Agent | Type | Files Scanned |
|-------|------|---------------|
| Cursor | `cursor` | `.cursorrules`, `.cursor/rules/*.mdc\|.md`, `.cursor/MEMORY.md` |
| GitHub Copilot | `copilot` | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` |
| Cline | `cline` | `.clinerules` (root file), `.clinerules/*.md` |
| Claude Code | `claude-code` | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/*.md` |
| Windsurf | `windsurf` | `.windsurfrules`, `.windsurf/rules/*.md` |
| Roo Code | `roo-code` | `.roorules`, `.roo/rules/`, `.roo/rules-code/`, `.roo/rules-architect/`, `.roo/rules-ask/`, `.roo/rules-debug/` |
| OpenAI Codex | `codex` | `AGENTS.md`, `AGENTS.override.md` |
| Gemini CLI | `gemini` | `GEMINI.md`, `.gemini/*.md` |
| Amazon Q | `amazon-q` | `.amazonq/rules/*.md` |
| Continue | `continue` | `.continue/rules/*.md`, `.continue/prompts/*.md` |
| Aider | `aider` | `CONVENTIONS.md` |

### MCP Server Support (5 Sources)

| Source | File |
|--------|------|
| Cursor | `.cursor/mcp.json` |
| VSCode | `.vscode/mcp.json` |
| Claude | `.mcp.json` |
| Windsurf | `.windsurf/mcp.json` |
| Cline | `.cline/mcp_settings.json` |

### Ignore Files Service

Scans for and returns agent-specific ignore files:

- `.cursorignore` (Cursor)
- `.aiderignore` (Aider)
- `.rooignore` (Roo Code)
- `.geminiignore` (Gemini CLI)
- `.copilotignore` (Copilot)

### Agent Configs Service

Discovers and returns agent configuration files:

- `.aider.conf.yml` — Aider YAML configuration
- `.continue/config.yaml` / `.continue/config.json` — Continue configuration (YAML preferred)
- `.cursor/settings.json` — Cursor workspace settings
- `.zed/assistant.json` — Zed AI assistant configuration

### Agent Skills Service (agentskills.io Standard)

Scans skill directories for `SKILL.md` files following the [agentskills.io](https://agentskills.io) standard:

- `.agents/skills/` — cross-client interoperability location
- `.claude/skills/` — Claude Code native location
- `.cursor/skills/` — Cursor native location

For each skill found, the service:

1. Parses YAML frontmatter (`name`, `description`, `version`, `author`, `license`, `compatibility`, `allowedTools`)
2. Returns the full SKILL.md content
3. Enumerates resource subdirectories (`scripts/`, `references/`, `assets/`)
4. Handles name collisions via source precedence (`.agents/skills/` overrides others)

### Content Processing

- Frontmatter metadata parsing for Cursor, Windsurf, Roo Code, Continue, and Skill files
- Automatic section splitting for Copilot instructions
- Markdown section extraction for Cline rules
- Mode field extraction for Roo Code rules (mode determined from directory name)
- Deduplication for agents with multiple config file options

### Rate Limiting and Resilience

- Automatic retry logic with exponential backoff
- Protection against GitLab and other provider rate limits
- Jitter to prevent thundering herd problems
- Graceful handling of network failures and timeouts
- Detailed logging for debugging rate limit issues

## API Endpoints

### GET /api/ai-rules/rules

Fetches AI coding rules for a given entity.

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `entityRef` | Yes | Entity reference (`kind:namespace/name`) |
| `ruleTypes` | No | Comma-separated rule types. Defaults to all 11 types. |

**Response:**

```json
{
  "rules": [
    {
      "type": "cursor",
      "id": "cursor-rule-1",
      "filePath": ".cursor/rules/typescript.mdc",
      "fileName": "typescript",
      "content": "TypeScript coding standards...",
      "description": "TypeScript rules",
      "globs": ["*.ts", "*.tsx"],
      "alwaysApply": true,
      "gitUrl": "https://github.com/org/repo"
    },
    {
      "type": "roo-code",
      "id": "roo-code-rule-1",
      "filePath": ".roo/rules-code/standards.md",
      "fileName": "standards",
      "content": "...",
      "mode": "code",
      "gitUrl": "https://github.com/org/repo"
    }
  ],
  "totalCount": 2,
  "ruleTypes": ["cursor", "roo-code"]
}
```

### GET /api/ai-rules/mcp-servers

Fetches MCP server configurations for a given entity.

**Query Parameters:** `entityRef` (required)

**Response:**

```json
{
  "servers": [
    {
      "name": "my-server",
      "source": "cursor",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    }
  ],
  "totalCount": 1
}
```

### GET /api/ai-rules/ignore-files

Fetches agent ignore files for a given entity.

**Query Parameters:** `entityRef` (required)

**Response:**

```json
{
  "ignoreFiles": [
    {
      "agent": "cursor",
      "filePath": ".cursorignore",
      "content": "node_modules/\ndist/\n*.log\n"
    }
  ],
  "totalCount": 1
}
```

### GET /api/ai-rules/agent-configs

Fetches agent configuration files for a given entity.

**Query Parameters:** `entityRef` (required)

**Response:**

```json
{
  "configs": [
    {
      "agent": "continue",
      "filePath": ".continue/config.yaml",
      "content": "models:\n  - title: GPT-4o\n    ...",
      "language": "yaml"
    }
  ],
  "totalCount": 1
}
```

### GET /api/ai-rules/skills

Fetches Agent Skills for a given entity.

**Query Parameters:** `entityRef` (required)

**Response:**

```json
{
  "skills": [
    {
      "name": "TypeScript Linting",
      "description": "Runs ESLint and reports violations",
      "source": "cursor",
      "filePath": ".cursor/skills/ts-linting/SKILL.md",
      "content": "# TypeScript Linting Skill\n...",
      "license": "MIT",
      "compatibility": ["cursor", "claude-code"],
      "metadata": { "version": "1.0.0", "author": "Platform Team" },
      "allowedTools": ["run_terminal_cmd"],
      "resources": {
        "scripts": ["scripts/lint.sh"],
        "references": [],
        "assets": []
      },
      "gitUrl": "https://github.com/org/repo"
    }
  ],
  "totalCount": 1
}
```

**Error Responses (all endpoints):**

- `400 Bad Request`: Missing or invalid `entityRef`
- `404 Not Found`: Entity not found or no source location
- `500 Internal Server Error`: Repository access or parsing errors

## Architecture

### Services

#### AiRulesService

Core service responsible for fetching and parsing rules from all 11 agent types. Each agent type has a dedicated `fetch*Rules` method and a corresponding `parse*Rule` method.

#### MCPService

Fetches and parses MCP server configurations from 5 sources. Each source has a dedicated `parse*Config` method.

#### IgnoreFilesService

Scans for and returns agent-specific ignore files. Uses a static `IGNORE_FILE_DEFINITIONS` array to define which paths to check.

#### AgentConfigsService

Scans for and returns agent configuration files. Deduplicates agents that support multiple config file formats (e.g., Continue prefers YAML over JSON).

#### SkillsService

Recursively scans skill directories for `SKILL.md` files, parses their frontmatter, enumerates resource subdirectories, and handles name collisions. Source precedence: `.agents/skills/` > `.claude/skills/` > `.cursor/skills/`.

### API Router

Registers all 5 endpoints, validates query parameters, instantiates services, and formats responses.

## Dependencies

### Core Dependencies

- `@backstage/backend-plugin-api`: Backend plugin framework
- `@backstage/catalog-client`: Entity resolution
- `@backstage/integration`: SCM integrations
- `@backstage/config`: Configuration management

### Parsing Dependencies

- `gray-matter`: Frontmatter parsing for Cursor, Windsurf, Continue, and Skill files
- `express`: REST API framework

## Error Handling

### Repository Access Errors

- Network connectivity issues
- Authentication failures
- Repository not found
- Permission denied

### File Parsing Errors

- Invalid frontmatter syntax
- Malformed file content
- Encoding issues

### Configuration Errors

- Invalid rule type specifications
- Missing required configuration
- Type validation failures

## Security Considerations

### Repository Access

- Respects SCM integration authentication
- No additional credentials required
- Uses existing Backstage permissions
- Secure token handling

### Content Processing

- Input validation for all file content
- Safe frontmatter parsing
- Protection against malicious content
- Content size limits

### API Security

- Entity reference validation
- Parameter sanitization
- Error message sanitization

## Performance Considerations

### Caching Strategy

- File content caching for frequently accessed rules
- Entity resolution caching
- Repository metadata caching
- Configurable cache TTL

### Resource Management

- Efficient file fetching algorithms
- Memory-conscious content processing
- Connection pooling for repository access
- Graceful degradation under load

### Monitoring

- API endpoint performance metrics
- Repository access timing
- Error rate tracking
- Cache hit rate monitoring
