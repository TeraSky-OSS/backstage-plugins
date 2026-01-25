# Configuring the SpectroCloud Ingestor Plugin

The SpectroCloud ingestor plugin provides extensive configuration options for customizing resource ingestion behavior.

## Configuration Structure

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io  # Global annotation prefix
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
        refreshIntervalSeconds: 600
        ingestProjects: true
        ingestClusterProfiles: true
        ingestClusters: true
        includeProjects:
          - production
          - staging
        excludeProjects:
          - sandbox
        excludeTenantScopedProfiles: false
        excludeTenantScopedClusters: false
```

## Configuration Parameters

### Global Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `annotationPrefix` | string | `terasky.backstage.io` | Prefix for entity annotations |

### Environment Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | optional | Instance name for multi-instance setups |
| `url` | string | required | SpectroCloud API URL |
| `tenant` | string | required | SpectroCloud tenant name |
| `apiToken` | string | required | SpectroCloud API token |

### Catalog Provider Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the provider |
| `refreshIntervalSeconds` | number | `600` | Refresh interval in seconds |
| `ingestProjects` | boolean | `true` | Ingest project entities |
| `ingestClusterProfiles` | boolean | `true` | Ingest cluster profile entities |
| `ingestClusters` | boolean | `true` | Ingest cluster entities |
| `includeProjects` | string[] | `[]` | Projects to include (empty = all) |
| `excludeProjects` | string[] | `[]` | Projects to exclude |
| `excludeTenantScopedProfiles` | boolean | `false` | Exclude tenant-scoped profiles |
| `excludeTenantScopedClusters` | boolean | `false` | Exclude tenant-scoped clusters |

## Configuration Examples

### Basic Configuration

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
```

### Production-Only Configuration

```yaml
spectrocloud:
  environments:
    - name: prod
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
        refreshIntervalSeconds: 300
        includeProjects:
          - production
          - staging
        excludeProjects:
          - development
          - sandbox
```

### Multi-Instance Configuration

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io
  environments:
    - name: us-prod
      url: https://api-us.spectrocloud.com
      tenant: us-tenant
      apiToken: ${SPECTROCLOUD_US_TOKEN}
      catalogProvider:
        enabled: true
        refreshIntervalSeconds: 600
        includeProjects:
          - us-production
    - name: eu-prod
      url: https://api-eu.spectrocloud.com
      tenant: eu-tenant
      apiToken: ${SPECTROCLOUD_EU_TOKEN}
      catalogProvider:
        enabled: true
        refreshIntervalSeconds: 600
        includeProjects:
          - eu-production
```

### Clusters-Only Configuration

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
        ingestProjects: false
        ingestClusterProfiles: false
        ingestClusters: true
```

## Entity Naming Convention

The plugin uses smart naming conventions to ensure uniqueness:

### Projects
- Format: `<project-name>` or `<instance>-<project-name>`
- Title: Original project name

### Cluster Profiles
- Project-scoped: `<project-name>-<profile-name>`
- Tenant-scoped: `tenant-<profile-name>`
- Title: Original profile name

### Clusters
- Project-scoped: `<project-name>-<cluster-name>`
- Tenant-scoped: `tenant-<cluster-name>`
- Title: Original cluster name

## Filtering Strategies

### Include Strategy
Use `includeProjects` to whitelist specific projects:
```yaml
catalogProvider:
  includeProjects:
    - production
    - staging
```

### Exclude Strategy
Use `excludeProjects` to blacklist specific projects:
```yaml
catalogProvider:
  excludeProjects:
    - development
    - testing
    - sandbox
```

### Tenant-Scoped Exclusion
Exclude tenant-scoped resources:
```yaml
catalogProvider:
  excludeTenantScopedProfiles: true
  excludeTenantScopedClusters: true
```

## Best Practices

### Performance
1. Set appropriate refresh intervals (not too frequent)
2. Use project filtering to limit scope
3. Monitor catalog size growth

### Security
1. Use environment variables for API tokens
2. Limit API token permissions to read-only
3. Use project filtering for sensitive environments

### Organization
1. Use meaningful instance names
2. Consistent annotation prefix across plugins
3. Document project naming conventions

## Troubleshooting

### Common Issues

1. **No Entities Created**
   - Verify `catalogProvider.enabled` is `true`
   - Check API credentials
   - Review project filters

2. **Missing Projects/Clusters**
   - Check `includeProjects`/`excludeProjects` filters
   - Verify API token has access
   - Check tenant-scoped exclusion settings

3. **Duplicate Entities**
   - Ensure unique instance names
   - Check annotation prefix consistency
   - Review naming conventions

4. **Stale Data**
   - Reduce `refreshIntervalSeconds`
   - Check scheduler is running
   - Review backend logs

