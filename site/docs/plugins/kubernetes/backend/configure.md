# Configuring the Kubernetes Resources Permissions Backend Plugin

The Kubernetes Resources Permissions backend plugin integrates with Backstage's permission framework to provide access control for Kubernetes resources.

## Available Permissions

The plugin provides the following permissions for managing Kubernetes resources:  

- List Kubernetes Resources: kubernetes-resources.resources.list  
  - Controls whether a user can list and view Kubernetes resources
- List Kubernetes Secrets: kubernetes-resources.secrets.list  
  - Controls whether a user can list and view Secret resources
- View Secret YAML: kubernetes-resources.secrets.view-yaml  
  - Controls whether a user can view the YAML content of Secret resources
- View Resource YAML: kubernetes-resources.yaml.view  
  - Controls whether a user can view the YAML content of Kubernetes resources
- View Resource Events: kubernetes-resources.events.show  
  - Controls whether a user can view events related to Kubernetes resources
- View Resource Graph: kubernetes-resources.graph.show  
  - Controls whether a user can view the resource dependency graph

## Basic Configuration

The plugin uses Backstage's permission framework. To enable it, add the following to your `app-config.yaml`:

```yaml
permission:
  enabled: true # Enable Backstage permission framework
```

Plugin configuration:

```yaml
kubernetesResources:
  enablePermissions: true # Enable Kubernetes permission checks
  # If using a non default annotation prefix in the kubernetes ingestor set this to the value from the kubernetes ingestor as well
  annotationPrefix: terasky.backstage.io
  concurrency: 10 # How many concurrent requests to make against the Kubernetes API to fetch resources

proxy:
  '/kubernetes-resources/<CLUSTER NAME>':
      target: 'http://<THE INGRESS URL OF THE DEPLOYED AGENT>'
      changeOrigin: true
      headers:
        Authorization: 'Bearer <SAME TOKEN AS IS USED IN THE K8S PLUGIN CONFIGURATION>
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
      - kubernetes-resources
```

**CSV file snippet**

```csv
p, role:default/platformteam, kubernetes.proxy, use, allow
p, role:default/platformteam, kubernetes.resources.read, read, allow
p, role:default/platformteam, kubernetes.clusters.read, read, allow
p, role:default/platformteam, kubernetes-resources.graph.show, read, allow
p, role:default/platformteam, kubernetes-resources.secrets.list, read, allow
p, role:default/platformteam, kubernetes-resources.secrets.view-yaml, read, allow
p, role:default/platformteam, kubernetes-resources.resources.list, read, allow
p, role:default/platformteam, kubernetes-resources.events.show, read, allow
p, role:default/platformteam, kubernetes-resources.yaml.view, read, allow
g, group:default/all_users, role:default/platformteam
```

## Best Practices

### Security

1. **Permission Policies**
  - Follow the principle of least privilege
    - Regularly review and update policies
    - Use specific permissions over wildcards
2. **Authentication**
  - Use secure authentication methods
    - Implement token rotation
    - Enable audit logging

### Monitoring

1. **Logging**
  - Configure appropriate log levels
    - Implement log rotation
    - Set up log aggregation
2. **Metrics**
  - Monitor permission checks
    - Track API usage
    - Set up alerts for anomalies

## Troubleshooting

### Common Issues

1. **Permission Denied**
  - Check policy configuration
    - Verify user roles
    - Review permission logs
2. **Integration Problems**
  - Verify service connections
    - Check authentication configuration
    - Review Kubernetes plugin configurations