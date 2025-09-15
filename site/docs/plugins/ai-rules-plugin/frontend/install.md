# Installing the AI Coding Rules Frontend Plugin

This guide will help you install and set up the AI Coding Rules frontend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage instance
2. The AI Coding Rules backend plugin installed and configured
3. Access to repositories containing AI coding rules
4. Components with source location annotations

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-ai-rules
```

### 2. Add to Entity Pages

Add the AI Rules components to your entity pages in `packages/app/src/components/catalog/EntityPage.tsx`. You can use either the unified `AiInstructionsComponent` (recommended) or the individual components:

```typescript
import { 
  AiInstructionsComponent,  // Unified component with tabs
  AIRulesComponent,         // Just the rules component
  MCPServersComponent       // Just the MCP servers component
} from '@terasky/backstage-plugin-ai-rules';

const componentPage = (
  <EntityLayout>
    {/* ... other tabs */}
    
    {/* Option 1: Unified Component (Recommended) */}
    <EntityLayout.Route path="/ai-rules" title="AI Rules">
      <AiInstructionsComponent />
    </EntityLayout.Route>
    
    {/* Option 2: Separate Components */}
    <EntityLayout.Route path="/ai-rules" title="AI Rules">
      <AIRulesComponent />
    </EntityLayout.Route>
    <EntityLayout.Route path="/mcp-servers" title="MCP Servers">
      <MCPServersComponent />
    </EntityLayout.Route>
    
    {/* With custom titles */}
    <EntityLayout.Route path="/coding-rules" title="Coding Rules">
      <AiInstructionsComponent title="Development Guidelines" />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### 3. Optional: Add to Component Overview

You can also add the component to the main overview tab for quick access:

```typescript
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ... other overview cards */}
    <Grid item md={6} xs={12}>
      <AIRulesComponent title="AI Coding Rules" />
    </Grid>
  </Grid>
);
```

## Configuration

The plugin behavior can be configured through your `app-config.yaml`:

```yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot  
    - cline
```

If not specified, defaults to `["cursor", "copilot"]`.

## Component Integration

### Entity Requirements

For the plugin to work with your entities, they need:

1. **Source Location**: Entity must have a source location annotation pointing to a Git repository
2. **Repository Access**: Backend must have access to the repository
3. **Rule Files**: Repository must contain AI rule files in supported locations

Example entity with source location:
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    backstage.io/source-location: url:https://github.com/org/repo
spec:
  type: service
  lifecycle: production
  owner: team-a
```

### Supported File Patterns

The plugin looks for rules in these locations:

- **Cursor Rules**: `.cursor/rules/*.mdc`
- **GitHub Copilot Rules**: `.github/copilot-instructions.md`
- **Cline Rules**: `.clinerules/*.md`

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { aiRulesPlugin } from '@terasky/backstage-plugin-ai-rules/alpha';

export default createApp({
  features: [
    ...
    aiRulesPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The AI Rules tab appears on component pages
3. Rules are displayed for components with valid repositories
4. Filtering works correctly for different rule types

## Troubleshooting

Common issues and solutions:

### Component Not Displaying
- Verify the component is properly imported and added to entity pages
- Check that the route path matches your navigation
- Ensure proper JSX syntax in EntityPage.tsx

### No Rules Found
- Confirm the backend plugin is installed and running
- Verify entity has source location annotation
- Check that repository contains rule files in expected locations
- Ensure backend has access to the repository

### Loading Issues
- Check browser console for errors
- Verify backend API endpoints are accessible
- Confirm entity reference format is correct
- Check network connectivity to repository

### Permission Errors
- Verify SCM integration configuration
- Check repository access permissions
- Ensure proper authentication for private repositories

For configuration options and customization, proceed to the [Configuration Guide](./configure.md). 