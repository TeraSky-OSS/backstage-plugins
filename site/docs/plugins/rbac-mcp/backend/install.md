# Installing the RBAC MCP Backend Plugin

This guide will help you install and set up the RBAC MCP backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend
2. Backstage RBAC backend plugin installed and configured
3. Access to modify your Backstage backend configuration
4. Admin permissions for RBAC management

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-rbac-mcp-backend
```

### 2. Add to Backend

Add the plugin to your backend (typically `packages/backend/src/index.ts`):

```typescript
backend.add(import('@terasky/backstage-plugin-rbac-mcp-backend'));
```


## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. MCP actions are registered and accessible
4. You have admin permissions for RBAC

## Next Steps

After successful installation, proceed to:
1. [Configuration Guide](./configure.md) - Set up permissions and policies

