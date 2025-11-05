# Installing the Scaffolder MCP Backend Plugin

This guide will help you install and set up the Scaffolder MCP backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend
2. Scaffolder plugin installed and configured
3. Access to modify your Backstage backend configuration

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-scaffolder-mcp-backend
```

### 2. Add to Backend

Add the plugin to your backend (typically `packages/backend/src/index.ts`):

```typescript
backend.add(import('@terasky/backstage-plugin-scaffolder-mcp-backend'));
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. All 7 MCP actions are registered and accessible:
   - `list_software_templates`
   - `get_software_template_parameter_schema`
   - `run_software_template`
   - `list_software_template_actions`
   - `get_software_template_action_details`
   - `list_software_template_extensions`
   - `get_software_template_extension_details`
4. Integration with the scaffolder works correctly

## Troubleshooting

Common issues and solutions:

1. **Backend Startup Issues**
    - Check the backend logs for errors
    - Verify the plugin import statement
    - Ensure all dependencies are installed

2. **MCP Actions Not Available**
    - Confirm the MCP actions framework is enabled
    - Check the backend logs for registration errors
    - Verify scaffolder integration is working

3. **Permission Issues**
    - Ensure users have appropriate scaffolder permissions
    - Check authentication configuration
    - Verify permission policies are correctly configured

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).

