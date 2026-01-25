# Configuring the SpectroCloud Backend Plugin

The SpectroCloud backend plugin integrates with Backstage's permission framework and provides configuration options for SpectroCloud connectivity.

## Configuration Structure

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io  # Optional
  enablePermissions: true  # Enable permission checks
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
    - name: staging
      url: https://api-staging.spectrocloud.com
      tenant: staging-tenant
      apiToken: ${SPECTROCLOUD_STAGING_TOKEN}
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `annotationPrefix` | string | `terasky.backstage.io` | Prefix for entity annotations |
| `enablePermissions` | boolean | `false` | Enable permission checks |
| `environments` | array | required | SpectroCloud environment configurations |
| `environments[].name` | string | optional | Instance name for multi-instance setups |
| `environments[].url` | string | required | SpectroCloud API URL |
| `environments[].tenant` | string | required | SpectroCloud tenant name |
| `environments[].apiToken` | string | required | SpectroCloud API token |

## Available Permissions

The plugin provides the following permissions for managing SpectroCloud resources:

### Cluster Permissions
- `spectrocloud.cluster.view-info`: View basic cluster information
- `spectrocloud.cluster.download-kubeconfig`: Download cluster kubeconfig
- `spectrocloud.cluster.view-pack-values`: View pack configuration values
- `spectrocloud.cluster.view-pack-manifests`: View pack manifest content

### Profile Permissions
- `spectrocloud.profile.view-info`: View profile information
- `spectrocloud.profile.view-clusters`: View clusters using a profile

## Permission Policy Configuration

### Using the Community RBAC Plugin

You can use the RBAC plugins from the Backstage community to manage permissions via the UI or a CSV file.

**app-config.yaml snippet**
```yaml
permission:
  enabled: true
  rbac:
    policies-csv-file: /path/to/permissions.csv
    policyFileReload: true
    pluginsWithPermission:
      - kubernetes
      - spectrocloud
```

**CSV file snippet**
```csv
# Platform team - full access
p, role:default/platform-team, spectrocloud.cluster.view-info, read, allow
p, role:default/platform-team, spectrocloud.cluster.download-kubeconfig, read, allow
p, role:default/platform-team, spectrocloud.cluster.view-pack-values, read, allow
p, role:default/platform-team, spectrocloud.cluster.view-pack-manifests, read, allow
p, role:default/platform-team, spectrocloud.profile.view-info, read, allow
p, role:default/platform-team, spectrocloud.profile.view-clusters, read, allow

# Developers - read-only access
p, role:default/developers, spectrocloud.cluster.view-info, read, allow
p, role:default/developers, spectrocloud.profile.view-info, read, allow

# Role assignments
g, group:default/platform-engineers, role:default/platform-team
g, group:default/all-developers, role:default/developers
```

### Custom Permission Policy

```typescript
// packages/backend/src/plugins/permission.ts
import { 
  viewClusterInfoPermission,
  downloadKubeconfigPermission,
} from '@terasky/backstage-plugin-spectrocloud-common';

class SpectroCloudPermissionPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: BackstageIdentityResponse,
  ): Promise<PolicyDecision> {
    // Allow all cluster info viewing
    if (isPermission(request.permission, viewClusterInfoPermission)) {
      return { result: AuthorizeResult.ALLOW };
    }
    
    // Restrict kubeconfig downloads to platform team
    if (isPermission(request.permission, downloadKubeconfigPermission)) {
      const isPlatformTeam = user?.identity.ownershipEntityRefs.some(
        ref => ref === 'group:default/platform-team'
      );
      return { 
        result: isPlatformTeam ? AuthorizeResult.ALLOW : AuthorizeResult.DENY 
      };
    }

    return { result: AuthorizeResult.DENY };
  }
}
```

## MCP Actions Configuration

To enable MCP actions for AI agents, add the plugin to your actions configuration:

```yaml
backend:
  actions:
    pluginSources:
      - 'catalog'
      - 'spectrocloud'
```

### Available MCP Actions

| Action | Description | Inputs |
|--------|-------------|--------|
| `spectrocloud_get_cluster_health` | Get cluster health status | Entity reference |
| `spectrocloud_get_kubeconfig` | Generate kubeconfig | Entity reference, format (oidc/client) |
| `spectrocloud_get_profile_packs` | Get profile pack details | Entity reference |
| `spectrocloud_search_profiles_by_cluster` | Find profiles for cluster | Entity reference |

## Multi-Instance Configuration

When connecting to multiple SpectroCloud environments:

```yaml
spectrocloud:
  environments:
    - name: prod-us
      url: https://api-us.spectrocloud.com
      tenant: us-tenant
      apiToken: ${SPECTROCLOUD_US_TOKEN}
    - name: prod-eu
      url: https://api-eu.spectrocloud.com
      tenant: eu-tenant
      apiToken: ${SPECTROCLOUD_EU_TOKEN}
```

The backend automatically routes requests to the correct instance based on the `instance` annotation on entities.

## Best Practices

### Security
1. Use environment variables for API tokens
2. Enable permissions in production
3. Follow least-privilege principle for kubeconfig access
4. Regularly rotate API tokens

### Performance
1. Configure appropriate timeouts
2. Monitor API rate limits
3. Use caching where appropriate

### Monitoring
1. Enable backend logging
2. Monitor API endpoint health
3. Track permission denials
4. Set up alerts for failures

## Troubleshooting

### Common Issues

1. **API Connection Failures**
   - Verify URL and tenant are correct
   - Check API token validity
   - Review network connectivity

2. **Permission Denied**
   - Check `enablePermissions` setting
   - Verify user's permission policies
   - Review backend logs

3. **Instance Routing Issues**
   - Verify `instance` annotation on entities
   - Check environment name matches

