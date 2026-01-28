# Configuring the SpectroCloud Kubernetes Authentication Module

The Kubernetes authentication module has minimal configuration requirements since most settings are inherited from the Kubernetes plugin and SpectroCloud cluster provider.

## Core Configuration

### 1. Disable Default Auth Providers (Required)

```yaml
# app-config.yaml
app:
  extensions:
    - plugin.kubernetes-auth-providers.service:
        disabled: true
```

This is the only module-specific configuration required. Everything else is configured through the Kubernetes plugin.

## Kubernetes Cluster Configuration

### Manual Cluster Configuration

For clusters defined in `app-config.yaml`:

```yaml
kubernetes:
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        - name: prod-cluster
          url: https://prod-cluster.example.com:6443
          authProvider: 'oidc'
          oidcTokenProvider: 'spectrocloud'  # Must match module's provider name
          skipTLSVerify: true
          skipMetricsLookup: false
```

### SpectroCloud Cluster Provider

For auto-discovered clusters:

```yaml
spectrocloud:
  environments:
    - name: production
      url: https://console.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        authType: oidc
        oidcAuthProviderName: spectrocloud  # Must be 'spectrocloud'
```

## Configuration Parameters

| Parameter | Location | Value | Required |
|-----------|----------|-------|----------|
| `app.extensions[].disabled` | app-config | `true` | Yes |
| `authProvider` | kubernetes cluster | `'oidc'` | Yes (per cluster) |
| `oidcTokenProvider` | kubernetes cluster | `'spectrocloud'` | Yes (per cluster) |
| `authType` | spectrocloud.clusterProvider | `'oidc'` | Yes (if using provider) |
| `oidcAuthProviderName` | spectrocloud.clusterProvider | `'spectrocloud'` | Optional (defaults to 'spectrocloud') |

## Full Configuration Examples

### Example 1: SpectroCloud-Only

```yaml
auth:
  providers:
    spectrocloud:
      development:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/abc123/auth
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail

spectrocloud:
  environments:
    - url: https://console.spectrocloud.com
      tenant: abc123
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        authType: oidc
        oidcAuthProviderName: spectrocloud
```

### Example 2: Mixed Authentication

Support both OIDC and service account authentication:

```yaml
kubernetes:
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        # Legacy cluster with service account
        - name: legacy-prod
          url: https://legacy.example.com:6443
          authProvider: 'serviceAccount'
          serviceAccountToken: ${LEGACY_SA_TOKEN}
          skipTLSVerify: true
        # New cluster with OIDC
        - name: new-prod
          url: https://new.example.com:6443
          authProvider: 'oidc'
          oidcTokenProvider: 'spectrocloud'
          skipTLSVerify: true

spectrocloud:
  environments:
    - url: https://console.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        authType: oidc
        includeProjects: [production]
```

### Example 3: Multi-Tenant SpectroCloud

```yaml
spectrocloud:
  environments:
    # US tenant - OIDC auth
    - name: us
      url: https://api-us.spectrocloud.com
      tenant: us-tenant
      apiToken: ${SPECTROCLOUD_US_TOKEN}
      clusterProvider:
        authType: oidc
        includeProjects: [production]
    # EU tenant - Service account auth (for legacy)
    - name: eu
      url: https://api-eu.spectrocloud.com
      tenant: eu-tenant
      apiToken: ${SPECTROCLOUD_EU_TOKEN}
      clusterProvider:
        authType: serviceAccount
        includeProjects: [production]
```

### Example 4: Multi-Provider OIDC

Use different OIDC providers for different clusters:

```yaml
kubernetes:
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        # SpectroCloud OIDC
        - name: spectro-managed
          url: https://spectro.example.com:6443
          authProvider: 'oidc'
          oidcTokenProvider: 'spectrocloud'
        # Google OIDC
        - name: gke-cluster
          url: https://gke.example.com:6443
          authProvider: 'oidc'
          oidcTokenProvider: 'google'
        # Microsoft OIDC
        - name: aks-cluster
          url: https://aks.example.com:6443
          authProvider: 'oidc'
          oidcTokenProvider: 'microsoft'
```

## Cluster Discovery

### Automatic vs Manual

**Automatic (SpectroCloud Cluster Provider):**
- Clusters discovered automatically
- Authentication configured via `clusterProvider.authType`
- No manual cluster definitions needed
- Clusters appear/disappear based on SpectroCloud state

**Manual (Config-Based):**
- Explicit cluster definitions
- Full control over each cluster
- Mix authentication types
- Static configuration

### Combining Both

```yaml
kubernetes:
  clusterLocatorMethods:
    # Manual clusters
    - type: 'config'
      clusters:
        - name: on-prem-cluster
          url: https://onprem.example.com:6443
          authProvider: 'serviceAccount'
          serviceAccountToken: ${SA_TOKEN}

# Plus auto-discovered SpectroCloud clusters
spectrocloud:
  environments:
    - url: https://console.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        authType: oidc
```

## Kubernetes RBAC Configuration

When using OIDC, configure Kubernetes RBAC for your users:

### RoleBinding Example

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developers-view
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: User
  name: scott@terasky.com  # From SpectroCloud email claim
  apiGroup: rbac.authorization.k8s.io
```

### Group-Based RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-team-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: platform-team  # From SpectroCloud groups claim
  apiGroup: rbac.authorization.k8s.io
```

## Troubleshooting

### Configuration Not Applied

**Check if default providers are disabled:**
```bash
# Should return: disabled: true
grep -A 2 "kubernetes-auth-providers" app-config.yaml
```

**Restart Backstage:**
```bash
# Configuration changes require restart
yarn dev
```

### Wrong Token Provider

**Verify cluster configuration:**
```bash
curl http://localhost:7007/api/kubernetes/clusters \
  -H "Authorization: Bearer TOKEN" \
  | jq '.items[] | {name, authProvider, oidcTokenProvider}'
```

All OIDC clusters should show:
```json
{
  "name": "cluster-name",
  "authProvider": "oidc",
  "oidcTokenProvider": "spectrocloud"
}
```

### Clusters Not Appearing

**Check SpectroCloud cluster provider:**
- Verify API token is valid
- Check project filters (includeProjects/excludeProjects)
- Review backend logs for discovery errors

**Check manual cluster config:**
- Verify YAML syntax
- Ensure clusters are in correct locator method
- Check for typos in URLs

### Authentication Failures

**Verify user is signed in:**
```javascript
// In browser console
const authApi = await window.backstage.getApi('core.auth.spectrocloud');
const profile = await authApi.getProfile();
console.log(profile.email);
```

**Check ID token:**
```javascript
const idToken = await authApi.getIdToken();
console.log(idToken); // Should be RS256 JWT
```

## Performance Considerations

### Token Caching
- ID tokens are cached in session
- Tokens refreshed automatically on expiry
- No per-request authentication overhead

### Cluster Discovery
- SpectroCloud cluster provider caches cluster list
- Refresh interval configurable (default: 10 minutes)
- Updates happen in background

## Security Best Practices

1. **Always use HTTPS** in production
2. **Configure proper RBAC** in clusters for users
3. **Enable audit logging** in Kubernetes
4. **Monitor token usage** through logs
5. **Review user permissions** regularly

## Next Steps

- Test authentication with real users
- Configure Kubernetes RBAC for your organization
- Review audit logs for user activity
- Consider migrating service account clusters to OIDC
