# Scaffolder MCP Backend Plugin

A Backstage backend plugin that exposes Model Context Protocol (MCP) actions for interacting with Backstage software templates (scaffolder). This plugin enables AI agents and automation tools to discover, inspect, and execute software templates programmatically.

## Features

This plugin registers three MCP actions that allow AI agents to:

1. **List Software Templates** - Discover all available templates in the Backstage catalog
2. **Get Template Parameter Schema** - Retrieve the input schema for a specific template
3. **Run Software Template** - Execute a template with provided parameters

## MCP Actions

### list_software_templates

Lists all available software templates in the Backstage catalog with their metadata.

**Input:** None

**Output:**
- `templates`: Array of template information including:
  - `name`: The unique name of the template
  - `title`: Human-readable title
  - `description`: Template description
  - `tags`: Associated tags for categorization
  - `entityRef`: Full entity reference (use this for other actions)
- `count`: Total number of templates available

### get_software_template_parameter_schema

Retrieves the parameter schema for a specific software template. The schema defines what inputs are required to execute the template.

**Input:**
- `templateNameOrRef`: Template name (e.g., "my-template") or full entity reference (e.g., "template:default/my-template")

**Output:**
- `templateName`: Name of the template
- `templateTitle`: Human-readable title
- `templateDescription`: Description of what the template creates
- `entityRef`: Full entity reference
- `parameters`: JSON Schema describing the required and optional input fields

### run_software_template

Executes a software template with the provided parameters and waits for completion. The template will create resources as defined (e.g., repositories, components). This action polls the task status every second until completion (with a 5-minute timeout).

**Input:**
- `templateNameOrRef`: Template name or full entity reference
- `parameters`: JSON object with all required and optional parameters matching the schema

**Output:**
- `taskId`: Unique identifier for the scaffolder task
- `templateName`: Name of the executed template
- `templateRef`: Full entity reference
- `status`: Final status of the task (completed, failed, cancelled)
- `output`: Output values produced by the template execution (e.g., repository URL, entity reference, etc.)

## Installation

Add the plugin to your backend package:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/plugin-scaffolder-mcp-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Add the scaffolder MCP plugin
backend.add(import('@internal/plugin-scaffolder-mcp-backend'));

backend.start();
```

## Usage with MCP Clients

These actions can be used by any MCP-compatible client or AI agent. The actions are automatically registered with the MCP actions registry and are available for discovery and execution.

Example workflow:
1. Call `list_software_templates` to see what templates are available
2. Call `get_software_template_parameter_schema` with a template reference to understand what parameters are needed
3. Call `run_software_template` with the template reference and parameters to execute it

## Authentication

All actions run on behalf of the user making the request to the MCP server. The plugin uses Backstage's authentication and authorization system to ensure proper access control.

## Development

This plugin can be started in standalone mode for development:

```bash
yarn start
```

For full development including the frontend, run from the root directory:

```bash
yarn start
```
