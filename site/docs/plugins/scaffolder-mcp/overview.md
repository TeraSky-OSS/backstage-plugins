# Scaffolder MCP Plugin

The Scaffolder MCP plugin for Backstage provides comprehensive integration with Model Context Protocol (MCP), enabling AI agents and automation tools to discover, inspect, and execute software templates programmatically.

## Plugin Components

### Backend Plugin (`@terasky/backstage-plugin-scaffolder-mcp-backend`)
The backend plugin provides MCP actions for:
- Listing and inspecting available software templates
- Retrieving template parameter schemas
- Executing templates with provided parameters
- Discovering scaffolder actions and their details
- Discovering template extensions (filters and functions)
- Task status monitoring and completion tracking
- Integration with Backstage's scaffolder framework

[Learn more about the backend plugin](./backend/about.md)

## Documentation Structure

- Backend Plugin
    - [About](./backend/about.md)
    - [Installation](./backend/install.md)
    - [Configuration](./backend/configure.md)

## MCP Actions Integration

The Scaffolder MCP plugin provides MCP (Model Context Protocol) actions for programmatic interaction with Backstage software templates. This enables AI agents and automation tools to:

1. **Discover Templates**: List all available software templates in the catalog
2. **Inspect Templates**: Get parameter schemas and requirements
3. **Execute Templates**: Run templates with provided parameters
4. **Monitor Execution**: Track task status and retrieve outputs

### Available MCP Actions

The plugin provides 7 comprehensive MCP actions grouped into three categories:

#### Template Management
- `list_software_templates`: Discover all available templates in the Backstage catalog
  - Input: None
  - Output: List of templates with metadata (name, title, description, tags, entity reference)

- `get_software_template_parameter_schema`: Retrieve the input schema for a specific template
  - Input: Template name or entity reference
  - Output: JSON Schema describing required and optional input fields

- `run_software_template`: Execute a template with provided parameters
  - Input: Template reference and parameters object
  - Output: Task ID, status, and execution outputs

#### Scaffolder Actions Discovery
- `list_software_template_actions`: List all available scaffolder actions
  - Input: Optional filter string
  - Output: List of action IDs and descriptions

- `get_software_template_action_details`: Get details for a specific scaffolder action
  - Input: Action ID
  - Output: Action schema, description, and examples

#### Template Extensions Discovery
- `list_software_template_extensions`: List all available template extensions (filters and functions)
  - Input: Optional filter string
  - Output: List of extensions with name, type, and description

- `get_software_template_extension_details`: Get details for a specific template extension
  - Input: Extension name
  - Output: Extension type, schema, description, and examples

### Integration Requirements

To enable these MCP actions:

1. Install and configure the Scaffolder MCP backend plugin
2. Ensure the MCP server is configured in your Backstage instance
3. Configure authentication and authorization policies
4. Verify scaffolder integration is working

### Usage Workflows

#### Template Execution Workflow

1. Call `list_software_templates` to discover available templates
2. Select a template and call `get_software_template_parameter_schema` to understand its requirements
3. Prepare the parameters based on the schema
4. Call `run_software_template` to execute the template
5. Monitor the task completion and retrieve outputs

#### Template Development Workflow

1. Call `list_software_template_actions` to see available scaffolder actions
2. Use `get_software_template_action_details` to understand specific actions
3. Call `list_software_template_extensions` to discover available filters and functions
4. Use `get_software_template_extension_details` to understand how to use specific extensions
5. Build your template using the discovered actions and extensions

## Getting Started

To get started with the Scaffolder MCP plugin:

1. Install and configure the backend plugin
2. Configure MCP server integration
3. Set up authentication and authorization
4. Start using MCP actions with AI agents or automation tools

For detailed installation and configuration instructions, refer to the backend documentation linked above.

