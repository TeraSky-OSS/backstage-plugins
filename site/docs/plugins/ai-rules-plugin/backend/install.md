# Installing the AI Coding Rules Backend Plugin

This guide will help you install and set up the AI Coding Rules backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend instance
2. Properly configured SCM integrations (GitHub, GitLab, etc.)
3. Access to repositories containing AI coding rules
4. Node.js and yarn package manager

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-ai-rules-backend
```

### 2. Add to Backend

Add the plugin to your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins
backend.add(import('@terasky/backstage-plugin-ai-rules-backend'));

backend.start();
```

### 3. Configure SCM Integrations

Ensure your SCM integrations are properly configured in `app-config.yaml`:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
  
  gitlab:
    - host: gitlab.com
      token: ${GITLAB_TOKEN}
      
  # Add other SCM integrations as needed
```

## Configuration

### Basic Configuration

Add AI Rules configuration to your `app-config.yaml`:

```yaml
aiRules:
  # Configure which rule types to look for (all 11 supported)
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
```

If not specified, all 11 rule types are enabled by default. The Ignore Files, Agent Configs, and Agent Skills endpoints always scan their respective paths regardless of `allowedRuleTypes`.

### Environment Variables

Set up required environment variables:

```bash
# For GitHub integration
export GITHUB_TOKEN=your_github_token

# For GitLab integration
export GITLAB_TOKEN=your_gitlab_token

# For other SCM providers
export AZURE_TOKEN=your_azure_token
export BITBUCKET_TOKEN=your_bitbucket_token
```

## Verification

### 1. Check Backend Logs

Start your backend and check for successful plugin registration:

```bash
yarn dev
```

Look for log entries:

```
[ai-rules-backend] Plugin loaded successfully
[ai-rules-backend] API routes registered at /api/ai-rules
```

### 2. Test API Endpoints

Test all five endpoints directly:

```bash
BASE="http://localhost:7007/api/ai-rules"
ENTITY="component:default/my-service"

# AI Rules
curl "$BASE/rules?entityRef=$ENTITY"

# MCP Servers
curl "$BASE/mcp-servers?entityRef=$ENTITY"

# Ignore Files
curl "$BASE/ignore-files?entityRef=$ENTITY"

# Agent Configs
curl "$BASE/agent-configs?entityRef=$ENTITY"

# Agent Skills
curl "$BASE/skills?entityRef=$ENTITY"
```

Expected response format (empty repository):

```json
{
  "rules": [],
  "totalCount": 0,
  "ruleTypes": []
}
```

### 3. Check Entity Resolution

Verify that entities with source locations are properly resolved:

```bash
curl "http://localhost:7007/api/ai-rules/rules?entityRef=component:default/my-service&ruleTypes=cursor,copilot,windsurf"
```

## API Endpoints Reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/ai-rules/rules` | AI coding rules (11 agent types) |
| `GET /api/ai-rules/mcp-servers` | MCP server configurations (5 sources) |
| `GET /api/ai-rules/ignore-files` | Agent ignore files |
| `GET /api/ai-rules/agent-configs` | Agent configuration files |
| `GET /api/ai-rules/skills` | Agent Skills (agentskills.io) |

All endpoints accept `entityRef` as a required query parameter.

## Troubleshooting

### Common Issues

#### Plugin Not Loading

1. **Missing Package**: Verify the package is installed in `package.json`

   ```bash
   yarn --cwd packages/backend list --pattern @terasky/backstage-plugin-ai-rules-backend
   ```

2. **Import Error**: Check the import statement in `backend/src/index.ts`

   ```typescript
   backend.add(import('@terasky/backstage-plugin-ai-rules-backend'));
   ```

3. **Backend Startup Issues**: Check backend logs for detailed error messages

#### API Endpoints Not Working

1. **Check Route Registration**: Look for API routes in backend logs
2. **Verify URL**: Ensure you're using the correct API path
3. **CORS Issues**: Check if frontend can access the backend API

#### Repository Access Issues

1. **SCM Integration**: Verify SCM integrations are configured correctly

   ```yaml
   integrations:
     github:
       - host: github.com
         token: ${GITHUB_TOKEN}
   ```

2. **Token Permissions**: Ensure tokens have read access to repositories
3. **Private Repository Access**: Verify authentication for private repositories

#### Entity Resolution Problems

1. **Invalid Entity Reference**: Check entity reference format

   ```
   # Correct format
   component:default/my-service

   # Incorrect formats
   my-service
   default/my-service
   component/my-service
   ```

2. **Missing Source Location**: Verify entities have source location annotations

   ```yaml
   metadata:
     annotations:
       backstage.io/source-location: url:https://github.com/org/repo
   ```

3. **Catalog Sync**: Ensure entities are properly ingested into the catalog

#### Ignore Files / Agent Configs / Skills Returning Empty

These endpoints silently return empty when no files are found (this is not an error). If you expect data:

1. Confirm the files/directories actually exist in the repository
2. Check backend logs for any directory-listing errors
3. Verify backend has read access to those paths

### Debug Mode

```yaml
# app-config.yaml
backend:
  logger:
    level: debug
```

Or:

```bash
export LOG_LEVEL=debug
```

### Network Issues

1. **Firewall**: Check if backend can access external repositories
2. **Proxy**: Configure proxy settings if behind corporate firewall
3. **DNS**: Verify DNS resolution for repository hosts

### Performance Issues

1. **Network Latency**: Monitor repository access times
2. **File Size**: Check for unusually large rule or skill files
3. **Rate Limiting**: Monitor API rate limits for SCM providers

## Next Steps

After successful installation:

1. Install and configure the [frontend plugin](../frontend/install.md)
2. Review [configuration options](./configure.md) for customization
3. Set up monitoring and logging as needed
4. Test with your specific repository structures

## Security Considerations

### Token Management

- Store tokens securely using environment variables
- Use minimal required permissions for tokens
- Regularly rotate authentication tokens
- Monitor token usage and access logs

### Repository Access

- Review which repositories the backend can access
- Ensure proper authentication for private repositories
- Monitor for unauthorized access attempts
- Implement proper error handling to avoid information leakage

For detailed configuration options, proceed to the [Configuration Guide](./configure.md).
