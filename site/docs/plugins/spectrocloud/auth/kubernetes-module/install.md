# Installing the SpectroCloud Kubernetes Authentication Module

This guide will help you install the SpectroCloud Kubernetes authentication module to enable user-level OIDC authentication to Kubernetes clusters.

## Prerequisites

Before installing this module, ensure you have:

1. A working Backstage instance (version 1.47.1 or later)
2. Node.js 18+ and Yarn installed
3. **SpectroCloud backend auth module installed and configured** (required)
4. **SpectroCloud frontend auth plugin installed** (required)
5. Kubernetes clusters configured with SpectroCloud OIDC

## Installation Steps

### 1. Add Required Package

Install the package using your package manager:

```bash
yarn --cwd packages/app add @terasky/spectrocloud-kubernetes-auth-module
```

### 2. Automatic Discovery

The module is automatically discovered and loaded by Backstage. No manual wiring in `App.tsx` is needed!

### 3. Disable Default Kubernetes Auth Providers

Since this module replaces the default Kubernetes auth providers, you must disable the default in your configuration:

```yaml
# app-config.yaml
app:
  extensions:
    # Disable the default Kubernetes auth providers
    - plugin.kubernetes-auth-providers.service:
        disabled: true
```

**Important:** This step is required to avoid `API_FACTORY_CONFLICT` errors.

### 4. Configure Kubernetes Clusters for OIDC

Update your Kubernetes cluster configurations to use SpectroCloud OIDC:

```yaml
kubernetes:
  clusters:
    - name: my-cluster
      url: https://my-cluster.example.com
      authProvider: 'oidc'
      oidcTokenProvider: 'spectrocloud'
      skipTLSVerify: true  # For self-signed certs
```

**Or with SpectroCloud Cluster Provider:**
```yaml
spectrocloud:
  environments:
    - url: https://console.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        authType: oidc  # Use OIDC instead of service accounts
        oidcAuthProviderName: spectrocloud
```

## Verification

After installation, verify the module is working:

### 1. Check Dependencies
```bash
cat packages/app/package.json | grep spectrocloud-kubernetes-auth-module
```

Should show:
```json
"@terasky/spectrocloud-kubernetes-auth-module": "^0.1.0"
```

### 2. Verify Backend Configuration
```bash
curl http://localhost:7007/api/kubernetes/clusters \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Clusters should show:
```json
{
  "items": [
    {
      "name": "my-cluster",
      "authProvider": "oidc",
      "oidcTokenProvider": "spectrocloud"
    }
  ]
}
```

### 3. Test Kubernetes Access

1. Sign in to Backstage with SpectroCloud
2. Navigate to a component with Kubernetes resources
3. View the Kubernetes tab
4. Verify resources load without errors

## Configuration Requirements

### Backend Auth Module
Must be configured with proper OIDC settings:
```yaml
auth:
  providers:
    spectrocloud:
      development:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/{tenant}/auth
        callbackUrl: http://localhost:7007/api/auth/spectrocloud/handler/frame
```

### Kubernetes Clusters
Clusters must support SpectroCloud OIDC:
- Configure OIDC in cluster API server
- Or use SpectroCloud-managed clusters (pre-configured)

### SpectroCloud Tenant
OIDC must be enabled for your tenant:
- Contact SpectroCloud support if OIDC is not available
- Verify you can use kubectl with OIDC (test with `kubectl oidc-login`)

## Troubleshooting

### Clusters Not Using OIDC
Clusters still showing as service account auth:

**Solution:** Check cluster configuration:
```yaml
kubernetes:
  clusters:
    - name: my-cluster
      authProvider: 'oidc'  # Must be set
      oidcTokenProvider: 'spectrocloud'  # Must match module
```

## Next Steps

After successful installation:

1. Configure Kubernetes clusters for OIDC
2. Test cluster access with user credentials
3. Optional: Configure SpectroCloud cluster provider for auto-discovery
4. Review Kubernetes RBAC for user-level permissions

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.
