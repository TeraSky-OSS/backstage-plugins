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
- `spectrocloud.cluster.view-info`: View basic cluster information, list clusters, and access projects/cloud accounts
- `spectrocloud.cluster.download-kubeconfig`: Download cluster kubeconfig files
- `spectrocloud.cluster.view-pack-values`: View pack configuration values and schemas
- `spectrocloud.cluster.view-pack-manifests`: View pack manifest content
- `spectrocloud.cluster.create`: Create new clusters

### Profile Permissions
- `spectrocloud.profile.view-info`: View profile information and search profiles
- `spectrocloud.profile.view-clusters`: View clusters using a profile (MCP action)

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
p, role:default/platform-team, spectrocloud.cluster.create, create, allow
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

| Action | Description | Inputs | Permission |
|--------|-------------|--------|------------|
| `get_spectrocloud_health_for_cluster` | Get real-time health status and detailed cluster state | `clusterName` (string - entity title) | `viewClusterInfo` |
| `get_spectrocloud_kubeconfig_for_cluster` | Generate kubeconfig file (client/OIDC access) | `clusterName` (string - entity title), `frp` (boolean, optional, default true) | `downloadKubeconfig` |
| `get_spectrocloud_pack_details_for_profile` | Show packs and versions in a cluster profile | `profileName` (string - entity title) | `viewPackValues` |
| `find_spectrocloud_clusters_for_profile` | List all clusters using this cluster profile | `profileName` (string - entity title) | `viewProfileClusters` |

**Note**: All MCP actions use entity titles (`metadata.title`) to look up entities in the catalog, not entity names. They search for entities with `kind: Resource` and `spec.type` of either `spectrocloud-cluster` or `spectrocloud-cluster-profile`.

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

The backend automatically routes requests to the correct instance based on:
1. The `instance` query parameter on API requests
2. The `instance` annotation on catalog entities (for MCP actions)

## Authentication Configuration

The backend integrates with the SpectroCloud auth backend for user-scoped API access.

### Token Resolution

The backend accepts authentication via request headers:

```http
X-SpectroCloud-User-Email: user@example.com
X-SpectroCloud-Token: <hs256-session-token>
```

**Token Resolution Flow**:
1. Backend reads `X-SpectroCloud-User-Email` header
2. Looks up HS256 session token in shared cache by email
3. Falls back to `X-SpectroCloud-Token` if provided directly
4. Falls back to static `apiToken` from config if no user token
5. Returns `X-SpectroCloud-ReAuth-Required: true` if cache miss

### Token Cache

The backend shares a global in-memory token cache with the auth backend:

- **Storage**: Global `Map` keyed by user email
- **Values**: `{ token: string, expiresAt: number }`
- **Expiration**: Automatic removal of expired tokens
- **Scope**: Process-local (not distributed)

**Functions**:
- `storeSessionToken(email, token, expiresAt)`: Store/update token
- `getSessionTokenByEmail(email)`: Retrieve valid token

### Re-Authentication

When a user's token is not in the cache:
1. Backend returns `X-SpectroCloud-ReAuth-Required: true` header
2. Frontend detects this header
3. Frontend triggers sign-out/re-authentication flow
4. User authenticates via OIDC
5. Auth backend stores new token in cache
6. Subsequent requests succeed

## Cluster Creation Configuration

The backend supports creating clusters on multiple cloud types:

### Supported Cloud Types

| Cloud Type | Value | Description |
|------------|-------|-------------|
| Amazon EKS | `eks` | Managed Kubernetes on AWS |
| AWS PXK | `aws` | Palette eXtended Kubernetes on AWS EC2 |
| Azure AKS | `aks` | Managed Kubernetes on Azure |
| Azure PXK | `azure` | Palette eXtended Kubernetes on Azure VMs |
| vSphere | `vsphere` | VMware vSphere with PCG/overlord |

### Cluster Creation API

**Endpoint**: `POST /spectrocloud/clusters`

**Request Body**:
```json
{
  "cloudType": "eks|aws|aks|azure|vsphere",
  "name": "my-cluster",
  "description": "Cluster description",
  "tags": ["tag1", "tag2"],
  "cloudAccountUid": "account-uid",
  "profileUids": ["infra-profile-uid", "addon-profile-uid"],
  "profileVariables": { "key": "value" },
  "clusterVariables": { "key": "value" },
  "machinePoolConfig": [
    {
      "name": "worker-pool-1",
      "instanceType": "t3.medium",
      "count": 3,
      "labels": { "role": "worker" },
      "taints": []
    }
  ],
  // vSphere-specific
  "vsphere": {
    "datacenter": "dc1",
    "folder": "folder1",
    "resourcePool": "pool1",
    "datastore": "ds1",
    "network": "network1",
    "ipPoolUid": "pool-uid"
  }
}
```

**Query Parameters**:
- `projectUid`: Project UID (optional for user's default project)
- `instance`: Instance name (optional for single-instance setups)

## Best Practices

### Security
1. Use environment variables for API tokens
2. Enable permissions in production
3. Follow least-privilege principle for kubeconfig access
4. Restrict cluster creation permission to authorized users
5. Regularly rotate API tokens
6. Use static API tokens with read-only permissions where possible
7. Monitor token cache for expired entries
8. Implement audit logging for sensitive operations

### Performance
1. Configure appropriate timeouts for API calls
2. Monitor SpectroCloud API rate limits
3. Token cache reduces API calls for user authentication
4. Consider implementing request caching for frequently accessed data
5. Use pagination for large result sets

### Monitoring
1. Enable backend logging for troubleshooting
2. Monitor API endpoint health (`/health` endpoint)
3. Track permission denials for security auditing
4. Set up alerts for API failures
5. Monitor token cache hit/miss rates
6. Track cluster creation success/failure rates
7. Log re-authentication requirements

## Advanced Configuration

### Custom Permission Policy

For more complex permission logic, implement a custom permission policy:

```typescript
// packages/backend/src/plugins/permission.ts
import {
  viewClusterInfoPermission,
  downloadKubeconfigPermission,
  createClusterPermission,
  viewPackValuesPermission,
  viewPackManifestsPermission,
  viewProfileInfoPermission,
  viewProfileClustersPermission,
} from '@terasky/backstage-plugin-spectrocloud-common';
import { isPermission } from '@backstage/plugin-permission-common';

class SpectroCloudPermissionPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: BackstageIdentityResponse,
  ): Promise<PolicyDecision> {
    // Allow all to view cluster info
    if (isPermission(request.permission, viewClusterInfoPermission)) {
      return { result: AuthorizeResult.ALLOW };
    }
    
    // Platform team gets full access
    const isPlatformTeam = user?.identity.ownershipEntityRefs.some(
      ref => ref === 'group:default/platform-team'
    );
    
    if (isPlatformTeam) {
      return { result: AuthorizeResult.ALLOW };
    }
    
    // Restrict kubeconfig and cluster creation
    if (
      isPermission(request.permission, downloadKubeconfigPermission) ||
      isPermission(request.permission, createClusterPermission)
    ) {
      return { result: AuthorizeResult.DENY };
    }
    
    // Developers can view profiles and pack values
    if (
      isPermission(request.permission, viewProfileInfoPermission) ||
      isPermission(request.permission, viewPackValuesPermission)
    ) {
      return { result: AuthorizeResult.ALLOW };
    }

    return { result: AuthorizeResult.DENY };
  }
}
```

### Environment-Specific Configuration

Configure different settings per environment:

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io
  enablePermissions: ${SPECTROCLOUD_ENABLE_PERMISSIONS:-true}
  environments:
    # Production environment
    - name: prod
      url: ${SPECTROCLOUD_PROD_URL}
      tenant: ${SPECTROCLOUD_PROD_TENANT}
      apiToken: ${SPECTROCLOUD_PROD_TOKEN}
    
    # Staging environment
    - name: staging
      url: ${SPECTROCLOUD_STAGING_URL}
      tenant: ${SPECTROCLOUD_STAGING_TENANT}
      apiToken: ${SPECTROCLOUD_STAGING_TOKEN}
    
    # Development environment
    - name: dev
      url: ${SPECTROCLOUD_DEV_URL}
      tenant: ${SPECTROCLOUD_DEV_TENANT}
      apiToken: ${SPECTROCLOUD_DEV_TOKEN}
```

## Troubleshooting

### Common Issues

1. **API Connection Failures**
   - Verify URL and tenant are correct
   - Check API token validity
   - Review network connectivity
   - Check firewall rules

2. **Permission Denied**
   - Check `enablePermissions` setting
   - Verify user's permission policies
   - Review backend logs for authorization failures
   - Confirm RBAC configuration is loaded

3. **Instance Routing Issues**
   - Verify `instance` annotation on entities matches config
   - Check environment name matches exactly
   - Review query parameters in API requests

4. **Authentication Issues**
   - Check token cache is populated (auth backend must be running)
   - Verify `X-SpectroCloud-User-Email` header is sent
   - Check user has valid OIDC session
   - Review auth backend logs

5. **Cluster Creation Failures**
   - Verify user has `createCluster` permission
   - Check cloud account is valid and accessible
   - Confirm profiles exist and are published
   - Review SpectroCloud API error messages
   - Validate infrastructure configuration

6. **Token Cache Issues**
   - Token cache is in-memory and lost on restart
   - Not shared across backend instances (use sticky sessions)
   - Check token expiration times
   - Verify auth backend is storing tokens correctly

7. **vSphere Deployment Issues**
   - Confirm overlord/PCG is accessible
   - Verify datacenter, datastore, and network names
   - Check IP pool has available addresses
   - Validate compute cluster resources

8. **MCP Action Failures**
   - Verify entity exists in catalog with correct type
   - Check entity has required annotations
   - Confirm entity title matches input parameter
   - Review permission for the specific action

