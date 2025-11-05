# Configuring the RBAC MCP Backend Plugin

This guide covers the configuration options for the RBAC MCP backend plugin.

## Prerequisites Configuration

### Enable Permission Framework

The RBAC MCP plugin requires the Backstage permission framework to be enabled:

```yaml
# app-config.yaml
permission:
  enabled: true
```

### RBAC Backend Configuration

Ensure the RBAC backend plugin is properly configured. Here's a basic configuration:

```yaml
permission:
  enabled: true
  rbac:
    policies-csv-file: /path/to/permissions.csv
    policyFileReload: true
    pluginsWithPermission:
      - catalog
      - scaffolder
      - kubernetes
```

## Authentication Configuration

### Admin Permissions

Users must have RBAC admin permissions to use the MCP actions. Configure admin permissions using one of these methods:

#### Method 1: Via CSV File

```csv
# permissions.csv
p, role:default/rbac-admin, permission.policy.read, read, allow
p, role:default/rbac-admin, permission.policy.create, create, allow
p, role:default/rbac-admin, permission.policy.update, update, allow
p, role:default/rbac-admin, permission.policy.delete, delete, allow
g, user:default/admin, role:default/rbac-admin
```

#### Method 2: Via REST API

Use the RBAC backend API to create an admin role:

```bash
curl -X POST http://localhost:7007/api/permission/roles \
  -H "Content-Type: application/json" \
  -d '{
    "memberReferences": ["user:default/admin"],
    "name": "role:default/rbac-admin",
    "metadata": {
      "description": "RBAC administrators"
    }
  }'
```

## MCP Actions Configuration

The plugin automatically registers all 10 MCP actions. No additional configuration is required for basic functionality.

### Backend Authentication

The plugin uses the Backstage backend authentication system:

```yaml
backend:
  auth:
    keys:
      - secret: ${BACKEND_SECRET}
```

## Best Practices

### Permission Management

1. **Admin Access Control**
    - Limit admin permissions to trusted users
    - Use groups instead of individual users
    - Regularly review admin role memberships
    - Enable audit logging for admin actions

2. **Role Naming Conventions**
    - Use clear, descriptive role names
    - Follow the format: `role:namespace/name`
    - Use namespaces for organization (default, prod, dev)
    - Document role purposes

3. **Member References**
    - Use groups over individual users when possible
    - Format: `user:namespace/name` or `group:namespace/name`
    - Keep namespace consistent with your organization
    - Verify members exist in the catalog

### Security

1. **Authentication**
    - Always enable authentication
    - Use strong backend secrets
    - Rotate secrets regularly
    - Monitor authentication failures

2. **Authorization**
    - Follow principle of least privilege
    - Use specific permissions over wildcards
    - Implement role-based access control
    - Regular permission audits

3. **Logging and Monitoring**
    - Enable backend logging
    - Monitor `[RBAC MCP]` log entries
    - Track API errors and failures
    - Set up alerts for suspicious activity

### Error Handling

The plugin provides comprehensive error logging:

```
[RBAC MCP] create_role_with_permissions called with input: { ... }
[RBAC MCP] Permission URL: http://localhost:7007/api/permission
[RBAC MCP] Checking if role exists: ...
[RBAC MCP] API Error: { ... }
```

Enable debug logging to troubleshoot issues:

```yaml
backend:
  log:
    level: debug
```

## Advanced Configuration

### Custom Backend URL

If your RBAC backend runs on a different URL, update the configuration:

```yaml
backend:
  baseUrl: http://your-backend:7007
```

### Timeout Configuration

Currently, the plugin uses default timeout values from the Backstage fetch client. These can be adjusted at the backend level:

```yaml
backend:
  reading:
    timeout: 30000
```

### CORS Configuration

If accessing from different origins:

```yaml
backend:
  cors:
    origin: http://localhost:3000
    methods: [GET, POST, PUT, DELETE, PATCH]
    credentials: true
```

## Integration with Other Plugins

### Catalog Integration

For entity-based conditional permissions:

```yaml
catalog:
  import:
    entityFilename: catalog-info.yaml
  rules:
    - allow: [Component, System, API, Resource, Location, User, Group]
```

### Permission Integration

Configure permission sources:

```yaml
permission:
  rbac:
    pluginsWithPermission:
      - catalog
      - scaffolder
      - kubernetes
      - kyverno
      - crossplane
```

## Troubleshooting

### Common Configuration Issues

1. **Permission Framework Not Enabled**
    - Symptom: Actions return 403 or permission errors
    - Solution: Set `permission.enabled: true` in app-config.yaml

2. **RBAC Backend Not Found**
    - Symptom: Connection errors or 404 responses
    - Solution: Ensure RBAC backend plugin is installed and running

3. **Invalid Role References**
    - Symptom: Role creation fails with validation errors
    - Solution: Use format `role:namespace/name` (e.g., `role:default/developers`)

4. **Invalid Member References**
    - Symptom: Member assignment fails
    - Solution: Use format `user:namespace/name` or `group:namespace/name`

For more examples and usage patterns, see the [Usage Examples](./usage.md).

