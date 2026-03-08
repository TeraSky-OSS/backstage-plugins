# Configuring the AI Coding Rules Frontend Plugin

This guide covers the configuration options available for the AI Coding Rules frontend plugin.

## Component Overview

The plugin provides six components:

1. **AiInstructionsComponent** (Recommended)
   - Unified component with a 5-tab interface
   - Combines Agent Rules, MCP Servers, Ignore Files, Agent Configs, and Agent Skills
   - Recommended for most use cases

2. **AIRulesComponent**
   - Standalone component for AI coding rules
   - Use when you only need rules functionality

3. **MCPServersComponent**
   - Standalone component for MCP server configuration
   - Displays server configurations from 5 sources

4. **IgnoreFilesComponent**
   - Standalone component for agent ignore file contents

5. **AgentConfigsComponent**
   - Standalone component for agent configuration files

6. **AgentSkillsComponent**
   - Standalone component for Agent Skills (agentskills.io standard)

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. Configuration in `app-config.yaml` is still respected:

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
```

The plugin will be automatically integrated into the appropriate entity pages without requiring manual route configuration.

## Plugin Configuration

### Basic Configuration

Configure the plugin in your `app-config.yaml`:

```yaml
aiRules:
  # Restrict which rule types are available in the filter UI
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
  # Pre-select specific rule types on load
  defaultRuleTypes:
    - cursor
    - claude-code
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedRuleTypes` | `string[]` | All 11 types | Array of rule types available for selection in the filter UI |
| `defaultRuleTypes` | `string[]` | `[]` | Array of rule types pre-selected when component loads. Empty means no auto-search. |

### Supported Rule Type Values

| Value | Agent |
|-------|-------|
| `cursor` | Cursor IDE |
| `copilot` | GitHub Copilot |
| `cline` | Cline |
| `claude-code` | Claude Code |
| `windsurf` | Windsurf |
| `roo-code` | Roo Code |
| `codex` | OpenAI Codex |
| `gemini` | Gemini CLI |
| `amazon-q` | Amazon Q Developer |
| `continue` | Continue.dev |
| `aider` | Aider |

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
  # defaultRuleTypes not specified = empty array

# Pre-select specific rule types
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - claude-code
    - windsurf
  defaultRuleTypes:
    - cursor
    - claude-code

# Minimal set for a team that only uses Cursor and Copilot
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
  defaultRuleTypes:
    - cursor
    - copilot
```

## Component Configuration

All components accept an optional `title` prop and no other configuration at the component level. Behavior is driven by `app-config.yaml`.

### AiInstructionsComponent Props (Recommended)

```typescript
interface AiInstructionsComponentProps {
  title?: string;  // Optional custom title
}
```

Usage:

```typescript
// Default usage — shows all 5 tabs
<EntityLayout.Route path="/ai-rules" title="AI Rules">
  <AiInstructionsComponent />
</EntityLayout.Route>

// Custom title
<EntityLayout.Route path="/coding-rules" title="Coding Rules">
  <AiInstructionsComponent title="Development Guidelines" />
</EntityLayout.Route>
```

### AIRulesComponent Props

```typescript
interface AIRulesComponentProps {
  title?: string;
}
```

### MCPServersComponent Props

```typescript
interface MCPServersComponentProps {
  title?: string;
}
```

### IgnoreFilesComponent Props

```typescript
interface IgnoreFilesComponentProps {
  title?: string;
}
```

### AgentConfigsComponent Props

```typescript
interface AgentConfigsComponentProps {
  title?: string;
}
```

### AgentSkillsComponent Props

```typescript
interface AgentSkillsComponentProps {
  title?: string;
}
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
    backstage.io/source-location: url:https://github.com/org/my-repo
spec:
  type: service
  lifecycle: production
  owner: team-a
```

### Optional: Specify Branch

```yaml
metadata:
  annotations:
    backstage.io/source-location: url:https://github.com/org/my-repo/tree/main
```

## Rule File Configuration Examples

### Cursor Rules (.cursor/rules/*.mdc)

```markdown
---
description: "TypeScript coding standards"
globs: ["*.ts", "*.tsx"]
alwaysApply: true
---

# TypeScript Rules

Use strict typing and avoid any types.
```

### Cursor Memory (.cursor/MEMORY.md)

```markdown
# Memory

- Always use async/await over raw Promises
- Prefer named exports
```

### GitHub Copilot Rules (.github/copilot-instructions.md)

```markdown
# Copilot Instructions

Use TypeScript for all new code.
Prefer functional components in React.
```

### Cline Rules (.clinerules or .clinerules/*.md)

```markdown
# Development Guidelines

## Code Style
- Use ESLint and Prettier

## Testing
- Write unit tests for all functions
```

### Claude Code Rules (CLAUDE.md / .claude/rules/*.md)

```markdown
# Claude Code Guidelines

## Development Principles
- Write clean, readable code
- Follow SOLID principles
```

### Windsurf Rules (.windsurfrules or .windsurf/rules/*.md)

```markdown
# Windsurf Rules

Always document public APIs.
Use semantic commit messages.
```

### Roo Code Rules (.roo/rules/*.md)

```markdown
# Roo Rules

Follow the team style guide.
Prefer small, focused functions.
```

### Continue Rules (.continue/rules/*.md)

```markdown
---
name: TypeScript Standards
alwaysApply: true
---

Use strict TypeScript settings.
```

### Agent Skills (SKILL.md)

```markdown
---
name: "TypeScript Linting"
description: "Runs ESLint and reports violations"
version: "1.0.0"
author: "Platform Team"
license: "MIT"
compatibility:
  - cursor
  - claude-code
allowedTools:
  - run_terminal_cmd
---

# TypeScript Linting Skill

Run ESLint across the project and summarize results.
```

## Advanced Configuration

### Limit Types Per Environment

```yaml
# Development — show all types
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

# Production — only official guidelines
aiRules:
  allowedRuleTypes:
    - copilot
```

### Environment-Specific Files

```yaml
# app-config.yaml (base)
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot

# app-config.development.yaml
aiRules:
  allowedRuleTypes:
    - cursor
    - copilot
    - cline
    - windsurf
    - roo-code
    - codex
    - gemini
    - amazon-q
    - continue
    - aider

# app-config.production.yaml
aiRules:
  allowedRuleTypes:
    - copilot
```

## Clickable Git Links

Each rule/skill/file includes a clickable launch icon (↗) that opens the file directly in the git repository:

- **GitHub**: Converts to `/blob/main/` URL format
- **GitLab**: Converts to `/-/blob/main/` URL format
- **Generic Providers**: Uses standard `/blob/main/` format

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

### Ignore Files / Agent Configs / Skills Tabs Empty

1. Check that the relevant files exist in the repository
2. Confirm the backend responds on `/api/ai-rules/ignore-files`, `/api/ai-rules/agent-configs`, `/api/ai-rules/skills`
3. Check backend logs for directory-listing errors

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
