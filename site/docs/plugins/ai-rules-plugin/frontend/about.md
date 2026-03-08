# AI Coding Rules Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-ai-rules/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-ai-rules)

## Overview

The AI Coding Rules frontend plugin provides a comprehensive interface for visualizing AI coding rules, agent skills, ignore files, and agent configurations from a wide range of AI coding assistants. It supports 11 agent types and is designed to make all AI context living in a repository visible and navigable directly within Backstage.

## Features

### Rule Visualization (11 Agent Types)

- Display rules from Cursor, GitHub Copilot, Cline, Claude Code, Windsurf, Roo Code, OpenAI Codex, Gemini CLI, Amazon Q Developer, Continue, and Aider
- Color-coded chips and icons for quick visual identification of each agent type
- Expandable rule cards with metadata and full content
- Support for markdown rendering and raw source view per rule

### Content Search and UX Utilities

- **Content Search Bar**: Filter all displayed rules by any keyword in name, title, description, or content
- **Copy to Clipboard**: One-click copy for any rule's Markdown content with confirmation toast
- **Raw/Rendered Toggle**: Switch between rendered Markdown and raw source per rule
- **Export to Markdown**: Download all currently filtered rules as a single `.md` file

### Manual Filtering with Apply Filter

- Filter rules by type (all 11 agent types)
- Manual control with Apply Filter button functionality
- Configurable default rule types
- Always visible filter interface
- Status indicators for unsaved changes

### MCP Server Visualization

- Groups servers by source: Cursor, VSCode, Claude, Windsurf, Cline
- Displays server type (local/remote) and command information
- Expandable view of environment variables
- Raw configuration display with syntax highlighting

### Ignore Files Viewer

Displays agent-specific ignore files (`.cursorignore`, `.aiderignore`, `.rooignore`, `.geminiignore`, `.copilotignore`) with:

- Line-numbered content using `CodeSnippet`
- Agent name and file path display
- Link to open the file in the repository

### Agent Configs Viewer

Displays agent configuration files with language-aware syntax highlighting:

- `.aider.conf.yml`
- `.continue/config.yaml` / `.continue/config.json`
- `.cursor/settings.json`
- `.zed/assistant.json`

### Agent Skills Viewer (agentskills.io Standard)

Discovers and displays [Agent Skills](https://agentskills.io) — reusable, portable AI capabilities:

- Scans `.agents/skills/`, `.claude/skills/`, and `.cursor/skills/`
- Stats bar showing total skills and source breakdown
- Skills grouped by source in expandable accordions
- Each skill displays: name, description, compatibility chips, license, author, version, `allowedTools`
- Full SKILL.md content with raw/rendered toggle
- Resource listing: `scripts/`, `references/`, `assets/`

### Clickable Git Repository Links

- Launch icon (↗) for each rule/skill/file to open in git repository
- Multi-provider support (GitHub, GitLab, etc.)
- Opens in new tab for easy access

### Statistics and Overview

- Total rule count display with per-type breakdown
- Visual statistics cards with color-coded counts
- Counts update in real-time with active search/filter

## Components

### AiInstructionsComponent (Recommended)

The unified tabbed component that brings all features together:

```typescript
import { AiInstructionsComponent } from '@terasky/backstage-plugin-ai-rules';

// Default title
<AiInstructionsComponent />

// Custom title
<AiInstructionsComponent title="Development Guidelines" />
```

Tabs provided:

1. **Agent Rules** — AI coding rules from all 11 agents
2. **MCP Servers** — MCP server configurations
3. **Ignore Files** — Agent ignore patterns
4. **Agent Configs** — Agent configuration files
5. **Agent Skills** — Agent Skills (agentskills.io)

### AIRulesComponent

Standalone component for AI coding rules only:

```typescript
import { AIRulesComponent } from '@terasky/backstage-plugin-ai-rules';

<AIRulesComponent />
<AIRulesComponent title="Cursor Rules Only" />
```

### MCPServersComponent

Standalone component for MCP server configurations:

```typescript
import { MCPServersComponent } from '@terasky/backstage-plugin-ai-rules';

<MCPServersComponent />
```

### IgnoreFilesComponent

Standalone component for agent ignore files:

```typescript
import { IgnoreFilesComponent } from '@terasky/backstage-plugin-ai-rules';

<IgnoreFilesComponent />
```

### AgentConfigsComponent

Standalone component for agent configuration files:

```typescript
import { AgentConfigsComponent } from '@terasky/backstage-plugin-ai-rules';

<AgentConfigsComponent />
```

### AgentSkillsComponent

Standalone component for Agent Skills:

```typescript
import { AgentSkillsComponent } from '@terasky/backstage-plugin-ai-rules';

<AgentSkillsComponent />
```

### Component Props

All components share the same optional prop:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | Component-specific default | The title displayed at the top of the component |

## Technical Details

### Integration Points

- Backstage catalog entities
- AI Rules backend plugin
- Repository source locations
- Entity metadata

### Supported Agent Types and Files

| Agent | Type Value | Key Files |
|-------|-----------|-----------|
| Cursor | `cursor` | `.cursorrules`, `.cursor/rules/*.mdc\|.md`, `.cursor/MEMORY.md` |
| GitHub Copilot | `copilot` | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` |
| Cline | `cline` | `.clinerules` (root), `.clinerules/*.md` |
| Claude Code | `claude-code` | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/*.md` |
| Windsurf | `windsurf` | `.windsurfrules`, `.windsurf/rules/*.md` |
| Roo Code | `roo-code` | `.roorules`, `.roo/rules/`, `.roo/rules-{mode}/` |
| OpenAI Codex | `codex` | `AGENTS.md`, `AGENTS.override.md` |
| Gemini CLI | `gemini` | `GEMINI.md`, `.gemini/*.md` |
| Amazon Q | `amazon-q` | `.amazonq/rules/*.md` |
| Continue | `continue` | `.continue/rules/*.md`, `.continue/prompts/*.md` |
| Aider | `aider` | `CONVENTIONS.md` |

### Rule Detection

The plugin automatically detects components with:

- Git source locations in entity metadata
- Repository annotations
- Supported rule file patterns

### Error Handling

- Clear error messages for missing rules or files
- Loading states during data fetching
- Graceful degradation for unsupported repositories
- Per-tab isolation — an error in one tab does not affect others

## Use Cases

### Development Team Guidelines

1. Centralize AI coding rules across projects
2. Ensure consistent AI assistant configurations
3. Share best practices for AI-assisted development
4. Maintain rule documentation alongside code

### Rule Management

1. Discover existing AI rules in repositories
2. Validate rule configurations
3. Monitor rule adoption across teams
4. Track rule evolution over time

### Agent Skills Discovery

1. Browse reusable AI capabilities available in a repository
2. Understand which skills are scoped to specific agents vs. shared
3. Inspect skill metadata, compatibility, and bundled resources

### Code Quality Assurance

1. Enforce coding standards through AI rules
2. Maintain consistency across AI assistants
3. Document preferred coding patterns
4. Share domain-specific guidelines
