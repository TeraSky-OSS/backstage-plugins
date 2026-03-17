# Configuring the VCFA VKS Cluster Provider Plugin

The VCFA VKS cluster provider offers configuration options for authentication, cluster access, and RBAC setup.

## Configuration Structure

```yaml
vcfaVks:
  instances:
    - baseUrl: https://vcfa.example.com
      name: production                    # Optional display name
      orgName: vcfa
      authentication:
        username: ${VCFA_USERNAME}
        password: ${VCFA_PASSWORD}
      clusterProvider:
        skipMetricsLookup: true
        refreshIntervalSeconds: 600
        clusterTimeoutSeconds: 15
        rbac:
          namespace: backstage-system
          serviceAccountName: backstage-sa
          secretName: backstage-sa-token
          clusterRoleName: backstage-read-only
          clusterRoleBindingName: backstage-read-only-binding
          clusterRoleRules:
            - apiGroups: ['*']
              resources: ['*']
              verbs: ['get', 'list', 'watch']
```

## Authentication

The plugin authenticates with VCFA using the vCloud Director session API. It sends a `POST` request to `/cloudapi/1.0.0/sessions` using HTTP Basic Auth with credentials formatted as `username@orgName:password`. The Bearer token is extracted from the `x-vmware-vcloud-access-token` response header and cached for 1 hour before automatically re-authenticating.

## Configuration Parameters

### Instance Settings

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `baseUrl` | string | yes | VCFA base URL (e.g. `https://vcfa.example.com`) |
| `name` | string | no | Optional display name used as a prefix for cluster names |
| `orgName` | string | yes | VCFA organization name, appended to the username as `username@orgName` |
| `authentication.username` | string | yes | VCFA username |
| `authentication.password` | string | yes | VCFA password (use environment variable) |

### Cluster Provider Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skipMetricsLookup` | boolean | `true` | Skip the Kubernetes metrics API check for discovered clusters |
| `refreshIntervalSeconds` | number | `600` | How often (in seconds) to re-discover clusters from VCFA |
| `clusterTimeoutSeconds` | number | `15` | Per-cluster timeout (in seconds) for service account setup |

### RBAC Configuration

The RBAC settings control the resources created in each VKS cluster to enable Backstage's read-only access.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rbac.namespace` | string | `backstage-system` | Namespace created for Backstage resources |
| `rbac.serviceAccountName` | string | `backstage-sa` | Service account name |
| `rbac.secretName` | string | `backstage-sa-token` | Name of the token secret for the service account |
| `rbac.clusterRoleName` | string | `backstage-read-only` | ClusterRole name |
| `rbac.clusterRoleBindingName` | string | `backstage-read-only-binding` | ClusterRoleBinding name |
| `rbac.clusterRoleRules` | array | read-only on all | Custom RBAC rules (overrides the default) |

## Configuration Examples

### Basic Setup

Minimal configuration to discover VKS clusters from a single VCFA instance:

```yaml
vcfaVks:
  instances:
    - baseUrl: https://vcfa.example.com
      orgName: vcfa
      authentication:
        username: ${VCFA_USERNAME}
        password: ${VCFA_PASSWORD}
```

### With Instance Name Prefix

Use the optional `name` field to prefix all cluster names discovered from this instance, useful when multiple VCFA environments might contain clusters with the same name:

```yaml
vcfaVks:
  instances:
    - baseUrl: https://vcfa.example.com
      name: prod
      orgName: vcfa
      authentication:
        username: ${VCFA_USERNAME}
        password: ${VCFA_PASSWORD}
```

With this configuration a cluster named `my-cluster` will be registered in Backstage as `prod-my-cluster`.

### Custom RBAC Rules

Override the default ClusterRole rules to restrict or expand Backstage's access:

```yaml
vcfaVks:
  instances:
    - baseUrl: https://vcfa.example.com
      orgName: vcfa
      authentication:
        username: ${VCFA_USERNAME}
        password: ${VCFA_PASSWORD}
      clusterProvider:
        rbac:
          namespace: backstage-readonly
          serviceAccountName: backstage-viewer
          clusterRoleRules:
            - apiGroups: ['core']
              resources: ['pods', 'services', 'configmaps', 'events']
              verbs: ['get', 'list', 'watch']
            - apiGroups: ['apps']
              resources: ['deployments', 'replicasets', 'daemonsets', 'statefulsets']
              verbs: ['get', 'list', 'watch']
```

> **Note:** Use `'core'` for the Kubernetes core API group (pods, services, etc.). The plugin automatically converts this to an empty string as required by the Kubernetes RBAC API.

### Adjusted Refresh and Timeout

```yaml
vcfaVks:
  instances:
    - baseUrl: https://vcfa.example.com
      orgName: vcfa
      authentication:
        username: ${VCFA_USERNAME}
        password: ${VCFA_PASSWORD}
      clusterProvider:
        refreshIntervalSeconds: 300   # Refresh every 5 minutes
        clusterTimeoutSeconds: 30     # Allow 30 seconds per cluster for RBAC setup
        skipMetricsLookup: false      # Enable metrics if metrics-server is installed
```

### Multi-Instance

Discover VKS clusters from multiple VCFA environments:

```yaml
vcfaVks:
  instances:
    - name: dev
      baseUrl: https://vcfa-dev.example.com
      orgName: vcfa-dev
      authentication:
        username: ${VCFA_DEV_USERNAME}
        password: ${VCFA_DEV_PASSWORD}
      clusterProvider:
        refreshIntervalSeconds: 300
    - name: prod
      baseUrl: https://vcfa-prod.example.com
      orgName: vcfa-prod
      authentication:
        username: ${VCFA_PROD_USERNAME}
        password: ${VCFA_PROD_PASSWORD}
      clusterProvider:
        refreshIntervalSeconds: 600
        clusterTimeoutSeconds: 30
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify `orgName` matches the organization display name in VCFA (not the org ID)
   - Ensure the credentials have access to the `all-apps` organization type
   - Check that the VCFA version is 9.x or later

2. **Clusters Not Appearing**
   - Verify the VCFA user has read access to supervisor resources (`/deployment/api/supervisor-resources`)
   - Confirm VKS clusters exist as `kind: Cluster` resources in your supervisor namespaces
   - Review the `refreshIntervalSeconds` — clusters appear after the first successful refresh

3. **RBAC Errors in VKS Clusters**
   - Verify the admin kubeconfig retrieved from VCFA grants cluster-admin access
   - Check VKS cluster network reachability from the Backstage backend host
   - Increase `clusterTimeoutSeconds` if clusters are slow to respond
