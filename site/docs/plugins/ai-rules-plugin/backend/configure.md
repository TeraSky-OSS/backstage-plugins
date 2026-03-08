# Configuring the AI Coding Rules Backend Plugin

This guide covers the configuration options available for the AI Coding Rules backend plugin.

## Basic Configuration

### Rule Types Configuration

Configure which rule types the backend should search for in your `app-config.yaml`:

```yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline
    - claude-code
    - windsurf
    - roo-code
    - codex
    - gemini
    - amazon-q
    - continue
    - aider
  defaultRuleTypes:
    - cursor
    - claude-code
```

### Configuration Schema

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedRuleTypes` | `string[]` | All 11 types | Array of rule types to search for and parse |
| `defaultRuleTypes` | `string[]` | `[]` | Array of rule types pre-selected in the UI on load |

### Default Configuration

If no configuration is provided, the plugin defaults to enabling all 11 rule types:

```yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline
    - claude-code
    - windsurf
    - roo-code
    - codex
    - gemini
    - amazon-q
    - continue
    - aider
  defaultRuleTypes: []
```

## SCM Integration Requirements

### GitHub Configuration

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
    # For GitHub Enterprise
    - host: github.enterprise.com
      token: ${GITHUB_ENTERPRISE_TOKEN}
      apiBaseUrl: https://github.enterprise.com/api/v3
```

### GitLab Configuration

```yaml
integrations:
  gitlab:
    - host: gitlab.com
      token: ${GITLAB_TOKEN}
    # For self-hosted GitLab
    - host: gitlab.company.com
      token: ${GITLAB_COMPANY_TOKEN}
      apiBaseUrl: https://gitlab.company.com/api/v4
```

### Azure DevOps Configuration

```yaml
integrations:
  azure:
    - host: dev.azure.com
      token: ${AZURE_TOKEN}
```

### Bitbucket Configuration

```yaml
integrations:
  bitbucket:
    - host: bitbucket.org
      username: ${BITBUCKET_USERNAME}
      appPassword: ${BITBUCKET_APP_PASSWORD}
```

## Rule Type Reference

### Cursor Rules

Files scanned: `.cursorrules`, `.cursor/rules/*.mdc`, `.cursor/rules/*.md`, `.cursor/MEMORY.md`

```yaml
aiRules:
  allowedRuleTypes:
    - cursor
```

Frontmatter supported in `.mdc` files:

```markdown
---
description: "TypeScript coding standards"
globs: ["*.ts", "*.tsx"]
alwaysApply: true
---

# TypeScript Rules
Use strict typing and avoid any types.
```

### GitHub Copilot Rules

Files scanned: `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`

```yaml
aiRules:
  allowedRuleTypes:
    - copilot
```

### Cline Rules

Files scanned: `.clinerules` (root file), `.clinerules/*.md`

```yaml
aiRules:
  allowedRuleTypes:
    - cline
```

### Claude Code Rules

Files scanned: `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/*.md`

```yaml
aiRules:
  allowedRuleTypes:
    - claude-code
```

### Windsurf Rules

Files scanned: `.windsurfrules`, `.windsurf/rules/*.md`

```yaml
aiRules:
  allowedRuleTypes:
    - windsurf
```

### Roo Code Rules

Files scanned: `.roorules`, `.roo/rules/*.md`, `.roo/rules-code/*.md`, `.roo/rules-architect/*.md`, `.roo/rules-ask/*.md`, `.roo/rules-debug/*.md`

The `mode` field is populated from the subdirectory name (e.g., `code`, `architect`, `ask`, `debug`).

```yaml
aiRules:
  allowedRuleTypes:
    - roo-code
```

### OpenAI Codex Rules

Files scanned: `AGENTS.md`, `AGENTS.override.md`

```yaml
aiRules:
  allowedRuleTypes:
    - codex
```

### Gemini CLI Rules

Files scanned: `GEMINI.md`, `.gemini/*.md`

```yaml
aiRules:
  allowedRuleTypes:
    - gemini
```

### Amazon Q Rules

Files scanned: `.amazonq/rules/*.md`

```yaml
aiRules:
  allowedRuleTypes:
    - amazon-q
```

### Continue Rules

Files scanned: `.continue/rules/*.md`, `.continue/prompts/*.md`

Frontmatter supported:

```markdown
---
name: TypeScript Standards
alwaysApply: true
---

Use strict TypeScript settings.
```

```yaml
aiRules:
  allowedRuleTypes:
    - continue
```

### Aider Rules

Files scanned: `CONVENTIONS.md`

```yaml
aiRules:
  allowedRuleTypes:
    - aider
```

## MCP Server Configuration

The backend automatically scans for MCP configuration files in:

| Source | File Path |
|--------|-----------|
| Cursor | `.cursor/mcp.json` |
| VSCode | `.vscode/mcp.json` |
| Claude | `.mcp.json` |
| Windsurf | `.windsurf/mcp.json` |
| Cline | `.cline/mcp_settings.json` |

No additional configuration is required — all 5 sources are always scanned.

## Agent Skills Configuration

The backend automatically scans for `SKILL.md` files in:

| Source | Directory |
|--------|-----------|
| `agents` | `.agents/skills/` |
| `claude` | `.claude/skills/` |
| `cursor` | `.cursor/skills/` |

All three directories are always scanned. No additional configuration is required.

Source precedence for name collision resolution: `.agents/skills/` > `.claude/skills/` > `.cursor/skills/`.

## Environment-Specific Configuration

### Development Environment

```yaml
# app-config.development.yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline
    - windsurf
    - roo-code
    - codex

backend:
  logger:
    level: debug
```

### Production Environment

```yaml
# app-config.production.yaml
aiRules:
  allowedRuleTypes:
    - copilot  # Only official guidelines in production

backend:
  logger:
    level: info
```

### Testing Environment

```yaml
# app-config.test.yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline

integrations:
  github:
    - host: github.com
      token: mock-token
```

## Security Configuration

### Token Security

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
export GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
export AZURE_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxx
```

### Repository Access Control

Ensure tokens have minimal required permissions:

- **GitHub**: `repo` scope for private repos, `public_repo` for public repos
- **GitLab**: `read_repository` permission
- **Azure DevOps**: `Code (read)` permission
- **Bitbucket**: `Repositories: Read` permission

## Performance and Rate Limiting

### Retry Logic

Built-in retry with exponential backoff:

```
# Default retry configuration (not user-configurable)
# - Max retries: 3 attempts
# - Initial delay: 1 second
# - Max delay: 10 seconds
# - Exponential backoff with jitter
```

The plugin retries on:

- **Rate Limiting**: HTTP 429 Too Many Requests
- **Server Errors**: HTTP 502, 503, 504
- **Network Issues**: Timeouts, connection resets, DNS failures

### Rate Limit Best Practices

```yaml
# GitLab — use personal access tokens with appropriate scopes
integrations:
  gitlab:
    - host: gitlab.com
      token: ${GITLAB_TOKEN}

# GitHub — authenticated requests have higher rate limits
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

## Monitoring and Observability

### Health Checks

```bash
curl http://localhost:7007/api/ai-rules/health
```

### Testing Endpoints Directly

```bash
# Rules
curl "http://localhost:7007/api/ai-rules/rules?entityRef=component:default/my-service&ruleTypes=cursor,copilot"

# MCP Servers
curl "http://localhost:7007/api/ai-rules/mcp-servers?entityRef=component:default/my-service"

# Ignore Files
curl "http://localhost:7007/api/ai-rules/ignore-files?entityRef=component:default/my-service"

# Agent Configs
curl "http://localhost:7007/api/ai-rules/agent-configs?entityRef=component:default/my-service"

# Agent Skills
curl "http://localhost:7007/api/ai-rules/skills?entityRef=component:default/my-service"
```

## Troubleshooting Configuration

### Validation

```typescript
const allowedRuleTypes = config.getOptionalStringArray('aiRules.allowedRuleTypes')
  ?? ['cursor', 'copilot', 'cline', 'claude-code', 'windsurf', 'roo-code', 'codex', 'gemini', 'amazon-q', 'continue', 'aider'];

console.log('Configured rule types:', allowedRuleTypes);
```

### Common Configuration Issues

#### Invalid Rule Types

```yaml
# Incorrect — unsupported type is silently ignored
aiRules:
  allowedRuleTypes:
    - cursor
    - invalid-type  # ignored

# Correct
aiRules:
  allowedRuleTypes:
    - cursor
    - windsurf
```

#### Missing SCM Integration

```yaml
# Incomplete — missing token
integrations:
  github:
    - host: github.com

# Complete
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

### Debug Mode

```yaml
backend:
  logger:
    level: debug
```

Or:

```bash
export LOG_LEVEL=debug
```

## Best Practices

### Configuration Management

1. Use environment variables for all sensitive data
2. Use separate config files per environment
3. Validate configuration in CI/CD pipelines
4. Start with a broad `allowedRuleTypes` and narrow down per environment

### Security

1. Rotate tokens regularly
2. Use minimal required permissions
3. Monitor token usage
4. Secure configuration files

### Performance

1. Monitor API response times across all 5 endpoints
2. Track repository access patterns
3. Set appropriate log levels per environment

### Maintenance

1. Keep SCM integrations updated
2. Monitor for deprecated configuration options
3. Test configuration changes in staging before production
