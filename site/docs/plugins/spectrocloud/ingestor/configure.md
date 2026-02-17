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
        defaultOwner: spectrocloud-auto-ingested
        ownerNamespace: group
        includeProjects:
          - production
          - staging
        excludeProjects:
          - sandbox
        excludeTenantScopedResources: false
        resources:
          projects: true
          clusterProfiles: true
          clusters: true
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
| `refreshIntervalSeconds` | number | `600` | Refresh interval in seconds (10 minutes) |
| `defaultOwner` | string | `spectrocloud-auto-ingested` | Default owner for ingested entities |
| `ownerNamespace` | string | `group` | Owner namespace (`group` or `user`) |
| `includeProjects` | string[] | `[]` | Projects to include (empty = all) |
| `excludeProjects` | string[] | `[]` | Projects to exclude |
| `excludeTenantScopedResources` | boolean | `false` | Exclude tenant-scoped resources (profiles and clusters) |
| `resources.projects` | boolean | `true` | Ingest project entities |
| `resources.clusterProfiles` | boolean | `true` | Ingest cluster profile entities |
| `resources.clusters` | boolean | `true` | Ingest cluster entities |

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
        resources:
          projects: false
          clusterProfiles: false
          clusters: true
```

### Custom Owner Configuration

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
        defaultOwner: platform-team
        ownerNamespace: group  # Entities will be owned by group:default/platform-team
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
Exclude all tenant-scoped resources (both profiles and clusters):
```yaml
catalogProvider:
  excludeTenantScopedResources: true
```

**Note**: This replaces the separate `excludeTenantScopedProfiles` and `excludeTenantScopedClusters` options.

## Entity Relationships

The ingestor creates proper entity relationships:

### System Relationships
- **Projects** (System entities) contain profiles and clusters
- Project-scoped profiles have `spec.system` pointing to the project
- Project-scoped clusters have `spec.system` pointing to the project

### Dependency Relationships
- **Clusters** have `spec.dependsOn` referencing attached profile entities
- Profile references use the profile version UID for exact version tracking

### Example Relationships

```yaml
# Project (System)
kind: System
metadata:
  name: my-project
spec:
  owner: group:default/platform-team

---
# Profile (Resource)
kind: Resource
metadata:
  name: my-project-infra-profile
spec:
  type: spectrocloud-cluster-profile
  owner: group:default/platform-team
  system: my-project  # Links to project

---
# Cluster (Resource)
kind: Resource
metadata:
  name: my-project-prod-cluster
spec:
  type: spectrocloud-cluster
  owner: group:default/platform-team
  system: my-project  # Links to project
  dependsOn:
    - resource:default/my-project-infra-profile  # Links to profile
```

## Best Practices

### Performance
1. Set appropriate refresh intervals (not too frequent)
   - Default 600 seconds (10 minutes) is suitable for most use cases
   - Reduce for rapidly changing environments
   - Increase for large, stable environments
2. Use project filtering to limit scope
3. Monitor catalog size growth
4. Disable ingestion of unused resource types via `resources.*` settings

### Security
1. Use environment variables for API tokens
2. Limit API token permissions to read-only
3. Use project filtering for sensitive environments
4. Use `excludeTenantScopedResources` to prevent exposure of tenant-level resources
5. Configure appropriate owner and namespace for ingested entities

### Organization
1. Use meaningful instance names for multi-instance setups
2. Maintain consistent annotation prefix across all plugins
3. Document project naming conventions
4. Use descriptive titles for entities (set in entity metadata)
5. Apply consistent tagging strategies

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
   - Verify API token has not expired

5. **Relationship Errors**
   - Verify parent entities (projects) are created before children
   - Check `spec.system` and `spec.dependsOn` references
   - Ensure entity names are unique

6. **Owner Resolution Issues**
   - Check `defaultOwner` entity exists in catalog
   - Verify `ownerNamespace` is correct (`group` or `user`)
   - Confirm owner entity has correct format (e.g., `group:default/team-name`)

7. **Resource Type Toggle Not Working**
   - Verify `resources.projects`, `resources.clusterProfiles`, `resources.clusters` settings
   - Check logs for ingestion skipping messages
   - Ensure config changes are loaded (restart backend if needed)

