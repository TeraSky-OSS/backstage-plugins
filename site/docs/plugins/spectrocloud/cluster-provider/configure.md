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
        authType: serviceAccount  # or 'oidc'
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

## Authentication Types

The cluster provider supports two authentication methods:

### Service Account (Default)

- **How it works:** Creates a service account, ClusterRole, and ClusterRoleBinding in each cluster
- **Use when:** You want Backstage to have its own dedicated credentials per cluster
- **Pros:** 
  - Isolated credentials per cluster
  - Works without additional authentication setup
  - Fine-grained RBAC control
- **Cons:**
  - Creates resources in each cluster
  - Requires admin access to clusters
  - No user-level auditing

### OIDC

- **How it works:** Uses OIDC tokens from user authentication (SpectroCloud)
- **Use when:** Users authenticate via SpectroCloud and you want user-level access
- **Pros:**
  - No resources created in clusters
  - User-level auditing and access control
  - Leverages existing SpectroCloud authentication
- **Cons:**
  - Requires SpectroCloud OIDC auth plugin configured
  - Users must be authenticated
  - Access based on user's permissions

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
| `authType` | string | `serviceAccount` | Authentication type: `serviceAccount` or `oidc` |
| `oidcAuthProviderName` | string | `spectrocloud` | OIDC provider name (when authType is `oidc`) |
| `includeProjects` | string[] | `[]` | Projects to include (empty = all) |
| `excludeProjects` | string[] | `[]` | Projects to exclude |
| `excludeTenantScopedClusters` | boolean | `false` | Exclude tenant-scoped clusters |
| `refreshIntervalSeconds` | number | `300` | Refresh interval |
| `clusterTimeoutSeconds` | number | `30` | Timeout per cluster (serviceAccount only) |
| `skipMetricsLookup` | boolean | `false` | Skip metrics API check |

### RBAC Configuration

**Note:** RBAC settings only apply when `authType` is `serviceAccount`. When using `oidc` authentication, no resources are created in the cluster.

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

### OIDC Authentication

Use OIDC authentication instead of service accounts. No resources are created in clusters.

```yaml
spectrocloud:
  environments:
    - url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        authType: oidc
        oidcAuthProviderName: spectrocloud  # Must match your OIDC auth provider
```

You'll also need to configure the Kubernetes plugin to use OIDC:

```yaml
kubernetes:
  clusterLocatorMethods: []  # Use only SpectroCloud clusters
  clusters:
    # Clusters will be auto-discovered from SpectroCloud
    # Configure them to use OIDC in your spectrocloud config

# Add the spectrocloud-kubernetes-auth-module to your app
# See the spectrocloud-auth plugin documentation for details
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
        authType: oidc  # Use OIDC for EU clusters
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

