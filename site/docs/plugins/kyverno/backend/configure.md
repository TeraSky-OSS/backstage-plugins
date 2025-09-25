# Configuring the Kyverno Policy Reports Backend Plugin

This guide covers the configuration options for the Kyverno Policy Reports backend plugin.

## Basic Configuration

The plugin uses Backstage's permission framework. To enable it, add the following to your `app-config.yaml`:

```yaml
permission:
  enabled: true # Enable Backstage permission framework

kyverno:
  enablePermissions: true # Whether to enable permission checks for the kyverno plugin.
```

## Using the Community RBAC Plugin
You can use the RBAC plugins from the backstage community and create roles via the UI or via a CSV file.
### Example via CSV and config
**app-config.yaml snippet**
```yaml
permission:
  enabled: true
  rbac:
    policies-csv-file: /path/to/permissions.csv
    policyFileReload: true
    pluginsWithPermission:
      - kubernetes
      - kyverno
```
  
**CSV file snippet**
```csv
p, role:default/platformteam, kubernetes.proxy, use, allow
p, role:default/platformteam, kubernetes.resources.read, read, allow
p, role:default/platformteam, kubernetes.clusters.read, read, allow
p, role:default/platformteam, kyverno.overview.view, read, allow
p, role:default/platformteam, kyverno.policy.view-yaml, read, allow
p, role:default/platformteam, kyverno.reports.view, read, allow
g, group:default/all_users, role:default/platformteam
```
  

## Available Permissions

The plugin provides three main permission types that you can use in your policies:

1. `kyverno.overview.view`: Controls access to overview policy report data
2. `kyverno.reports.view`: Controls access to detailed policy report data
3. `kyverno.policy.view-yaml`: Controls access to policy YAML manifests

## Best Practices

1. **Permission Management**
    - Follow the principle of least privilege
    - Regularly review and update policies
    - Use specific permissions over wildcards

2. **Security**
    - Enable audit logging
    - Implement proper error handling
    - Validate all inputs

3. **Integration**
    - Verify Kubernetes plugin configurations
    - Check authentication settings
    - Monitor permission enforcement
