# Installing the SpectroCloud Kubernetes Cluster Supplier Plugin

This guide will help you install and set up the SpectroCloud Kubernetes Cluster Supplier plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend instance
2. Access to SpectroCloud Palette API
3. SpectroCloud API token with cluster read permissions
4. Network connectivity from Backstage backend to SpectroCloud clusters
5. Backstage's Kubernetes plugin already configured

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-spectrocloud-cluster-provider
```

### 2. Add to Backend

Modify your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Add the Kubernetes backend plugin (if not already added)
backend.add(import('@backstage/plugin-kubernetes-backend'));

// Add the SpectroCloud cluster supplier
backend.add(import('@terasky/backstage-plugin-spectrocloud-cluster-provider'));

backend.start();
```

### 3. Configure Kubernetes Plugin

Ensure the Kubernetes plugin is configured in your `app-config.yaml`:

```yaml
kubernetes:
  serviceLocatorMethod:
    type: 'multiTenant'
  clusterLocatorMethods: []  # Will be populated by our plugin
```

### 4. Configure SpectroCloud Supplier

Add SpectroCloud configuration to your `app-config.yaml`:

```yaml
kubernetes:
  clusterLocatorMethods:
    - type: 'spectrocloud'
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      
      # Optional: Filter by projects
      includeProjects: []
      excludeProjects: []
      
      # Optional: Exclude tenant-scoped clusters
      excludeTenantScopedClusters: false
      
      # Optional: Skip metrics lookup
      skipMetricsLookup: true
```

### 5. Set Environment Variables

Set your SpectroCloud API token as an environment variable:

```bash
export SPECTROCLOUD_API_TOKEN=your-api-token-here
```

Or add it to your `.env` file:

```bash
SPECTROCLOUD_API_TOKEN=your-api-token-here
```

### 6. Configure Pod Deletion (Optional)

Enable pod deletion in Kubernetes plugin (optional):

```yaml
kubernetes:
  frontend:
    podDelete:
      enabled: true
```

## Verification

After installation, verify that:

### 1. Backend Starts Successfully

Check backend logs for:
```
[kubernetes] info: ✓ Loaded X cluster(s) from config
[kubernetes] info: ✓ Registered SpectroCloud cluster supplier
[kubernetes] info: ✓ Initial SpectroCloud refresh complete
[kubernetes] info: Kubernetes cluster supplier registered with X supplier(s)
```

### 2. Clusters Are Discovered

Check for successful cluster configuration:
```
[kubernetes] info: ✓ cluster-name-01 configured
[kubernetes] info: ✓ cluster-name-02 configured
```

### 3. Clusters Appear in Backstage

1. Navigate to a component with Kubernetes annotation
2. Check the Kubernetes tab
3. Verify SpectroCloud clusters are listed
4. Verify you can view resources in each cluster

## Combining with Other Cluster Sources

You can use SpectroCloud alongside other cluster discovery methods:

```yaml
kubernetes:
  clusterLocatorMethods:
    # Static clusters
    - type: 'config'
      clusters:
        - name: legacy-cluster
          url: https://legacy.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${LEGACY_TOKEN}
    
    # GKE clusters
    - type: 'gke'
      projectId: my-gcp-project
      region: us-central1
    
    # Catalog-based clusters
    - type: 'catalog'
    
    # SpectroCloud clusters
    - type: 'spectrocloud'
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
```

## Network Requirements

### Outbound Access Required

The Backstage backend needs outbound access to:

1. **SpectroCloud Palette API**: `https://api.spectrocloud.com` (or your custom URL)
2. **Cluster API Servers**: Each discovered cluster's API server URL

### Firewall Rules

Ensure firewall rules allow:
- HTTPS (443) to SpectroCloud Palette API
- HTTPS (typically 6443) to cluster API servers
- TLS handshake completion

### Certificate Handling

The plugin automatically sets `skipTLSVerify: true` for SpectroCloud clusters to handle:
- Self-signed certificates
- Internal CA certificates
- Certificate verification issues


For configuration options and customization, proceed to the [Configuration Guide](./configure.md).

