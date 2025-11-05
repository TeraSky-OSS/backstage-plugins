# Scaffolder MCP Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaffolder-mcp-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaffolder-mcp-backend)

## Overview

The Scaffolder MCP backend plugin (`@terasky/backstage-plugin-scaffolder-mcp-backend`) provides Model Context Protocol (MCP) actions for programmatic interaction with Backstage software templates. This enables AI agents and automation tools to discover, inspect, and execute software templates through a standardized interface.

## Features

### Template Discovery and Management
- List all available software templates
- Retrieve template metadata and descriptions
- Access template tags and categorization
- Get full entity references for templates
- Retrieve parameter schemas for templates
- Understand input requirements and validation rules
- Execute templates with provided parameters
- Monitor task status and completion

### Scaffolder Actions Discovery
- List all available scaffolder actions
- Get detailed action schemas and descriptions
- Discover action input/output parameters
- Access action examples and usage patterns
- Filter actions by ID or description
- Programmatic action discovery for template development

### Template Extensions Discovery
- List all available template extensions (filters and functions)
- Discover Nunjucks filters and global functions
- Get extension schemas and descriptions
- Access extension examples and usage patterns
- Filter extensions by name or type
- Support for template development and customization

### MCP Actions Support
- 7 comprehensive MCP actions
- Standardized MCP action interface
- Integration with AI agents and automation tools
- Programmatic access to scaffolder functionality
- Task polling and status monitoring

### Integration
- Seamless integration with Backstage scaffolder
- Authentication and authorization support
- Permission framework integration
- Task lifecycle management

## Technical Details

### Available MCP Actions

The plugin provides 7 comprehensive MCP actions grouped into three categories:

#### Template Management Actions

1. **list_software_templates**
    - Lists all available software templates in the Backstage catalog
    - Returns template metadata including name, title, description, tags, and entity references
    - No input parameters required
    - Useful for template discovery and selection

2. **get_software_template_parameter_schema**
    - Retrieves the parameter schema for a specific template
    - Input: Template name or full entity reference
    - Returns JSON Schema describing required and optional input fields
    - Includes validation rules, default values, and field descriptions

3. **run_software_template**
    - Executes a software template with provided parameters
    - Input: Template reference and parameters object
    - Polls task status every second until completion (5-minute timeout)
    - Returns task ID, status, and execution outputs (e.g., repository URL, entity reference)

#### Scaffolder Actions Discovery

4. **list_software_template_actions**
    - Lists all available scaffolder actions that can be used in templates
    - Optional filter parameter to search by ID or description
    - Returns action IDs and descriptions
    - Useful for discovering available actions when building templates

5. **get_software_template_action_details**
    - Retrieves detailed information about a specific scaffolder action
    - Input: Action ID (e.g., "fetch:plain", "catalog:register")
    - Returns action schema (input/output), description, and examples
    - Essential for understanding how to use actions in templates

#### Template Extensions Discovery

6. **list_software_template_extensions**
    - Lists all available template extensions (filters and functions)
    - Optional filter parameter to search by name or description
    - Returns extension names, types (filter/function/value), and descriptions
    - Useful for discovering Nunjucks filters and global functions

7. **get_software_template_extension_details**
    - Retrieves detailed information about a specific template extension
    - Input: Extension name (e.g., "parseRepoUrl", "parseEntityRef")
    - Returns extension type, schema, description, and examples
    - Essential for understanding how to use extensions in templates

### Integration Points

- Backstage Scaffolder Framework
- Backstage Catalog
- MCP Actions Registry
- Backstage Authentication System
- Backstage Permission Framework

### Security Considerations

- All actions run on behalf of the authenticated user
- Leverages Backstage's authentication system
- Respects scaffolder permissions and policies
- Secure parameter handling and validation
- Audit trail through scaffolder task logs

### Task Management

- Automatic task status polling
- Configurable timeout (default: 5 minutes)
- Status tracking (pending, processing, completed, failed, cancelled)
- Output value retrieval on completion
- Error handling and reporting

