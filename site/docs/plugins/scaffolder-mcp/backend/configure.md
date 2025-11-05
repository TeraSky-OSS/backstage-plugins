# Configuring the Scaffolder MCP Backend Plugin

This guide covers the configuration options for the Scaffolder MCP backend plugin.

## Basic Configuration

The plugin works out of the box with minimal configuration. It automatically integrates with your existing Backstage scaffolder configuration.

## MCP Actions Configuration

The plugin registers 7 MCP actions automatically:

**Template Management:**
1. `list_software_templates`
2. `get_software_template_parameter_schema`
3. `run_software_template`

**Scaffolder Actions Discovery:**
4. `list_software_template_actions`
5. `get_software_template_action_details`

**Template Extensions Discovery:**
6. `list_software_template_extensions`
7. `get_software_template_extension_details`

No additional configuration is required for basic MCP action functionality.

## Authentication and Authorization

### User Authentication

All MCP actions run on behalf of the authenticated user making the request. The plugin respects Backstage's authentication system:

```yaml
# app-config.yaml
backend:
  auth:
    keys:
      - secret: ${BACKEND_SECRET}
```

### Scaffolder Permissions

The plugin respects existing scaffolder permissions. Configure permissions using Backstage's permission framework:

```yaml
permission:
  enabled: true
```

### Using the Community RBAC Plugin

You can use the RBAC plugins from the Backstage community to manage scaffolder permissions:

**app-config.yaml snippet**
```yaml
permission:
  enabled: true
  rbac:
    policies-csv-file: /path/to/permissions.csv
    policyFileReload: true
    pluginsWithPermission:
      - scaffolder
```

**CSV file snippet**
```csv
p, role:default/developers, scaffolder.task.read, read, allow
p, role:default/developers, scaffolder.task.create, create, allow
p, role:default/developers, scaffolder-template, read, allow
g, group:default/engineering, role:default/developers
```

## Task Execution Configuration

### Timeout Settings

The default timeout for template execution is 5 minutes. This is currently hardcoded but can be extended if needed.

### Task Polling

The plugin polls task status every 1 second until completion. This ensures timely updates while not overwhelming the backend.

## Best Practices

1. **Permission Management**
    - Follow the principle of least privilege
    - Regularly review and update scaffolder policies
    - Use specific permissions over wildcards

2. **Security**
    - Enable audit logging for scaffolder tasks
    - Implement proper error handling
    - Validate all template parameters

3. **Integration**
    - Verify scaffolder plugin configuration
    - Check authentication settings
    - Monitor task execution and failures

4. **Monitoring**
    - Track MCP action usage
    - Monitor task completion rates
    - Review failed task logs
    - Monitor action and extension discovery requests

## Use Cases

### Template Execution
Use the template management actions (`list_software_templates`, `get_software_template_parameter_schema`, `run_software_template`) for:
- Automating template execution workflows
- AI-assisted template selection and execution
- Programmatic component creation

### Template Development
Use the discovery actions (`list_software_template_actions`, `get_software_template_action_details`, `list_software_template_extensions`, `get_software_template_extension_details`) for:
- AI-assisted template development
- Documentation generation for templates
- Learning available scaffolder capabilities
- Building template authoring tools

## Advanced Configuration

### Custom Template Discovery

The plugin discovers templates from the Backstage catalog using the scaffolder's template discovery mechanism. Ensure your templates are properly registered in the catalog.

### Error Handling

The plugin provides detailed error messages for:
- Template not found errors
- Invalid parameter errors
- Task execution failures
- Timeout errors

Review backend logs with the `[Scaffolder MCP]` prefix for debugging information.

