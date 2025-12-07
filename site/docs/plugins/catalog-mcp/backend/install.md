# Installing the Catalog MCP Backend Plugin

This guide will help you install and set up the Catalog MCP backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend
2. Backstage Catalog populated with entities
3. Access to modify your Backstage backend configuration
4. MCP server configured in your Backstage instance

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-catalog-mcp-backend
```

### 2. Add to Backend

Add the plugin to your backend (typically `packages/backend/src/index.ts`):

```typescript
backend.add(import('@terasky/backstage-plugin-catalog-mcp-backend'));
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. MCP actions are registered and accessible
4. You can access the catalog API

### Verify MCP Actions Registration

You can verify the plugin is working by checking that the MCP actions are available. The following actions should be registered:

- `get_entities_by_owner`
- `get_entities_by_annotation`
- `get_entity_types_for_kind`
- `get_all_entities_by_kind_and_type`
- `get_entities_with_custom_query`

## Next Steps

After successful installation, proceed to:
1. [Configuration Guide](./configure.md) - Set up authentication and optimize queries


