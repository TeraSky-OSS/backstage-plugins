# Configuring the SpectroCloud Cluster Provider Plugin

The SpectroCloud cluster provider offers extensive configuration options.

## Configuration Structure

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io  # Optional
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        includeProjects: [production, staging]
        excludeProjects: [sandbox]
        excludeTenantScopedClusters: false
        refreshIntervalSeconds: 300
        clusterTimeoutSeconds: 30
        skipMetricsLookup: true
        rbac:
          namespace: backstage-system
          serviceAccountName: backstage-sa
          clusterRoleRules:
            - apiGroups: ['*']
              resources: ['*']
              verbs: ['get', 'list', 'watch']
```

## Configuration Parameters

### Environment Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | optional | Instance name prefix for clusters |
| `url` | string | required | SpectroCloud API URL |
| `tenant` | string | required | SpectroCloud tenant |
| `apiToken` | string | required | API token |

### Cluster Provider Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeProjects` | string[] | `[]` | Projects to include (empty = all) |
| `excludeProjects` | string[] | `[]` | Projects to exclude |
| `excludeTenantScopedClusters` | boolean | `false` | Exclude tenant-scoped clusters |
| `refreshIntervalSeconds` | number | `300` | Refresh interval |
| `clusterTimeoutSeconds` | number | `30` | Timeout per cluster |
| `skipMetricsLookup` | boolean | `false` | Skip metrics API check |

### RBAC Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rbac.namespace` | string | `backstage-system` | Namespace name |
| `rbac.serviceAccountName` | string | `backstage-sa` | Service account name |
| `rbac.clusterRoleRules` | array | read-only | Custom RBAC rules |

## Configuration Examples

### Basic Setup

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider: {}
```

### Project Filtering

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        includeProjects:
          - production
          - staging
        excludeProjects:
          - development
```

### Custom RBAC

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        rbac:
          namespace: backstage-readonly
          serviceAccountName: backstage-viewer
          clusterRoleRules:
            - apiGroups: ['core']
              resources: ['pods', 'services']
              verbs: ['get', 'list', 'watch']
            - apiGroups: ['apps']
              resources: ['deployments']
              verbs: ['get', 'list', 'watch']
```

### Multi-Instance

```yaml
spectrocloud:
  environments:
    - name: us
      url: https://api-us.spectrocloud.com
      tenant: us-tenant
      apiToken: ${SPECTROCLOUD_US_TOKEN}
      clusterProvider:
        includeProjects: [production]
    - name: eu
      url: https://api-eu.spectrocloud.com
      tenant: eu-tenant
      apiToken: ${SPECTROCLOUD_EU_TOKEN}
      clusterProvider:
        includeProjects: [production]
```

## Troubleshooting

### Common Issues

1. **Clusters Not Appearing**
   - Verify project filters
   - Check API connectivity
   - Review refresh interval

2. **RBAC Errors**
   - Verify admin kubeconfig access
   - Check namespace creation permissions
   - Review RBAC rule syntax

