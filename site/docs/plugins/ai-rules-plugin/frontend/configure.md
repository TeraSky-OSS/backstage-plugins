# Configuring the AI Coding Rules Frontend Plugin

This guide covers the configuration options available for the AI Coding Rules frontend plugin.

## Component Overview

The plugin provides three main components:

1. **AiInstructionsComponent** (Recommended)
   - Unified component with tabbed interface
   - Combines AI rules and MCP server functionality
   - Provides seamless navigation between features
   - Recommended for most use cases

2. **AIRulesComponent**
   - Standalone component for AI coding rules
   - Use when you only need rules functionality
   - Can be used multiple times with different configurations

3. **MCPServersComponent**
   - Standalone component for MCP server configuration
   - Displays server configurations from multiple sources
   - Groups servers by source (Cursor, VSCode, Claude)

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. The configuration in `app-config.yaml` is still respected:

```yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline
```

The plugin will be automatically integrated into the appropriate entity pages without requiring manual route configuration.

## Plugin Configuration

### Basic Configuration

Configure the plugin behavior in your `app-config.yaml`:

```yaml
aiRules:
  # Configure which rule types are available for selection
  allowedRuleTypes:
    - cursor
    - copilot
    - cline
    - claude-code
  # Configure which rule types are pre-selected by default
  defaultRuleTypes:
    - cursor
    - claude-code
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedRuleTypes` | `string[]` | `["cursor", "copilot", "cline", "claude-code"]` | Array of rule types available for selection |
| `defaultRuleTypes` | `string[]` | `[]` | Array of rule types pre-selected when component loads. If not specified, defaults to empty array (no auto-search) |

### Supported Rule Types

- `cursor`: Cursor IDE rules from `.cursor/rules/*.mdc` files
- `copilot`: GitHub Copilot rules from `.github/copilot-instructions.md`
- `cline`: Cline AI rules from `.clinerules/*.md` files
- `claude-code`: Claude Code rules from `CLAUDE.md` files in repository root

### Filtering Behavior

The plugin uses manual filtering with Apply Filter functionality:

- **No Auto-Search**: By default, no search is performed when the component loads
- **Manual Control**: Users must select rule types and click "Apply Filter" to search
- **Always Visible**: Filter interface is always shown, even when results are empty
- **Configurable Defaults**: Use `defaultRuleTypes` to pre-select specific rule types

#### Configuration Examples

```yaml
# No rules pre-selected (default behavior)
aiRules:
  allowedRuleTypes: ["cursor", "copilot", "cline", "claude-code"]
  # defaultRuleTypes not specified = empty array

# Pre-select specific rule types
aiRules:
  allowedRuleTypes: ["cursor", "copilot", "cline", "claude-code"]
  defaultRuleTypes: ["cursor", "claude-code"]

# Empty pre-selection (explicit)
aiRules:
  allowedRuleTypes: ["cursor", "copilot", "cline", "claude-code"]
  defaultRuleTypes: []
```

## Component Configuration

The plugin provides three main components, each with their own configuration options:

### AiInstructionsComponent Props (Recommended)

The unified component that provides both AI rules and MCP server functionality:

```typescript
interface AiInstructionsComponentProps {
  title?: string;  // Optional title for the component
}
```

#### Usage Examples

```typescript
// Default usage
<EntityLayout.Route path="/ai-rules" title="AI Rules">
  <AiInstructionsComponent />
</EntityLayout.Route>

// Custom title
<EntityLayout.Route path="/coding-rules" title="Coding Rules">
  <AiInstructionsComponent title="Development Guidelines" />
</EntityLayout.Route>
```

### AIRulesComponent Props

The standalone AI rules component:

```typescript
interface AIRulesComponentProps {
  title?: string;  // Optional title for the component
}
```

#### Usage Examples

```typescript
// Default usage
<EntityLayout.Route path="/ai-rules" title="AI Rules">
  <AIRulesComponent />
</EntityLayout.Route>

// Multiple instances with different titles
<EntityLayout.Route path="/cursor-rules" title="Cursor Rules">
  <AIRulesComponent title="Cursor IDE Rules" />
</EntityLayout.Route>

<EntityLayout.Route path="/copilot-rules" title="Copilot Rules">
  <AIRulesComponent title="GitHub Copilot Guidelines" />
</EntityLayout.Route>
```

### MCPServersComponent Props

The standalone MCP servers component:

```typescript
interface MCPServersComponentProps {
  title?: string;  // Optional title for the component
}
```

#### Usage Examples

```typescript
// Default usage
<EntityLayout.Route path="/mcp-servers" title="MCP Servers">
  <MCPServersComponent />
</EntityLayout.Route>

// Custom title
<EntityLayout.Route path="/mcp" title="MCP Configuration">
  <MCPServersComponent title="MCP Server Configurations" />
</EntityLayout.Route>
```

## Entity Configuration

### Required Annotations

Entities must have source location information for the plugin to work:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    # Required: Source location pointing to Git repository
    backstage.io/source-location: url:https://github.com/org/my-repo
spec:
  type: service
  lifecycle: production
  owner: team-a
```

### Optional Entity Configuration

```yaml
metadata:
  annotations:
    # Optional: Specific branch to check for rules
    backstage.io/source-location: url:https://github.com/org/my-repo/tree/main
    
    # Optional: Subdirectory if rules are in a specific path
    backstage.io/source-location: url:https://github.com/org/my-repo/tree/main/services/api
```

### Clickable Git Links

Each rule now includes a clickable launch icon (↗) that opens the rule file directly in your git repository:

- **Multi-Provider Support**: Works with GitHub, GitLab, and other git providers
- **New Tab**: Opens in a new browser tab for easy access
- **Direct File Access**: Links directly to the specific rule file in the repository
- **Non-Intrusive**: Doesn't interfere with existing accordion/card functionality

#### Supported Git Providers

- **GitHub**: Converts to `/blob/main/` URL format
- **GitLab**: Converts to `/-/blob/main/` URL format  
- **Generic Providers**: Uses standard `/blob/main/` format

### Apply Filter Functionality

The component now uses manual filtering instead of automatic rule loading:

- **Apply Filter Button**: Users must click to trigger searches
- **Unsaved Changes Indicator**: Shows when filter selections haven't been applied
- **Status Messages**: Clear feedback about filter state and required actions
- **Reset Filters**: Quickly reset to all allowed rule types

## Rule File Configuration

### Cursor Rules (.cursor/rules/*.mdc)

Cursor rule files support frontmatter for metadata:

```markdown
---
description: "TypeScript coding standards"
globs: ["*.ts", "*.tsx"]
alwaysApply: true
---

# TypeScript Rules

Use strict typing and avoid any types.
Follow naming conventions for interfaces and types.
```

### GitHub Copilot Rules (.github/copilot-instructions.md)

Simple markdown file with sections automatically split by empty lines:

```markdown
# Copilot Instructions

Use TypeScript for all new code.
Follow existing code patterns.

Prefer functional components in React.
Use hooks instead of class components.
```

### Cline Rules (.clinerules/*.md)

Markdown files with automatic section extraction:

```markdown
# Development Guidelines

## Code Style
- Use ESLint and Prettier
- Follow team conventions

## Testing
- Write unit tests for all functions
- Use Jest for testing framework
```

### Claude Code Rules (CLAUDE.md)

Simple markdown file in repository root with automatic title extraction:

```markdown
# Claude Code Guidelines

## Development Principles
- Write clean, readable code
- Follow SOLID principles
- Use meaningful variable names

## Code Review Standards
- All code must be reviewed
- Tests must pass before merge
- Documentation should be updated
```

## Advanced Configuration

### Custom Rule Type Configuration

If you want to limit to specific rule types for certain environments:

```yaml
# Development environment - show all types
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline

# Production environment - only show official guidelines
aiRules:
  allowedRuleTypes:
    - copilot
```

### Environment-Specific Configuration

```yaml
# app-config.yaml (base configuration)
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot

---
# app-config.development.yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline

---
# app-config.production.yaml
aiRules:
  allowedRuleTypes:
    - copilot
```

## Styling and Theming

The plugin uses Material-UI components and respects your Backstage theme configuration. It automatically adapts to:

- Light/dark theme modes
- Custom color schemes
- Typography settings
- Component spacing


## Performance Considerations

### Rule File Size
- Keep rule files reasonably sized (< 100KB recommended)
- Split large rule sets into multiple files
- Use clear file names for better organization

### Repository Access
- Ensure backend has efficient access to repositories
- Consider caching for frequently accessed rules
- Monitor API rate limits for external repositories

### Component Usage
- Avoid placing the component on high-traffic pages if not needed
- Consider lazy loading for large rule sets
- Use appropriate tab placement for user workflow

## Troubleshooting Configuration

### Rule Types Not Showing
1. Check `allowedRuleTypes` configuration
2. Verify rule files exist in expected locations
3. Confirm file naming follows conventions
4. Check backend logs for parsing errors

### Performance Issues
1. Review rule file sizes
2. Check repository access performance
3. Monitor network requests in browser dev tools
4. Consider component placement optimization

### Access Issues
1. Verify entity source location annotations
2. Check SCM integration configuration
3. Confirm repository permissions
4. Test backend API endpoints directly 