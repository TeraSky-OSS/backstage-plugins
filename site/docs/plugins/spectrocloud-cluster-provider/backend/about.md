# SpectroCloud Kubernetes Cluster Supplier Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-cluster-provider/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-cluster-provider)

## Overview

The SpectroCloud Kubernetes Cluster Supplier backend plugin is a Kubernetes cluster discovery provider that automatically discovers and configures clusters from SpectroCloud Palette. It extends Backstage's Kubernetes plugin by providing a custom `KubernetesClustersSupplier` implementation that works seamlessly with existing cluster discovery methods.

## Features

### Automatic Cluster Discovery
- Queries SpectroCloud Palette API for cluster list
- Filters clusters by project membership
- Excludes/includes projects based on configuration
- Supports both tenant-scoped and project-scoped clusters
- Optional tenant-scoped cluster exclusion

### RBAC Configuration
- Idempotent namespace creation (`backstage-system`)
- Service account creation (`backstage-sa`)
- Static secret generation for SA token
- ClusterRole with read-only permissions
- ClusterRoleBinding for permission assignment

### Cluster Supplier Integration
- Implements `KubernetesClustersSupplier` interface
- Works alongside existing suppliers
- Uses `CombinedClustersSupplier` pattern
- Supports all standard cluster locator methods
- Periodic refresh with configurable interval

### Security Features
- **Read-Only Access**: Service accounts can only get, list, and watch resources
- **No Write Permissions**: Cannot create, update, or delete any resources
- **Isolated Namespace**: All Backstage resources in dedicated namespace
- **Minimal RBAC**: ClusterRole limited to necessary verbs only
- **Certificate Verification**: Supports skipTLSVerify for self-signed certificates

## Components

### SpectroCloud Client
Handles communication with SpectroCloud Palette API:
- Authentication with API token
- Cluster list retrieval
- Project metadata fetching
- Admin kubeconfig download
- Error handling and retries

### SpectroCloud Cluster Supplier
Core cluster discovery logic:
- Cluster refresh operations
- Project filtering
- RBAC setup orchestration
- Token extraction
- Cluster registration

### Combined Clusters Supplier
Aggregates multiple cluster sources:
- Config-based clusters
- Catalog-based clusters
- GKE clusters
- Local kubectl proxy
- SpectroCloud clusters

### RBAC Setup Handler
Manages Kubernetes RBAC resources:
- Namespace creation
- ServiceAccount creation
- Secret creation
- ClusterRole creation
- ClusterRoleBinding creation
- Token extraction

## Technical Details

### API Integration
The plugin integrates with SpectroCloud Palette API:
- **Base URL**: Configurable (e.g., `https://api.spectrocloud.com`)
- **Authentication**: API token in `ApiKey` header
- **Endpoints Used**:
    - `/v1/dashboard/spectroclusters/meta` - List clusters
    - `/v1/projects/{projectUid}` - Get project details
    - `/v1/spectroclusters/{clusterUid}/assets/adminKubeconfig` - Download kubeconfig

### Cluster Details Structure
Each discovered cluster provides:
```typescript
{
  name: string;              // Cluster name from SpectroCloud
  url: string;               // API server URL
  authMetadata: {
    'kubernetes.io/auth-provider': 'serviceAccount',
    serviceAccountToken: string  // Base64-encoded SA token
  };
  skipTLSVerify: boolean;    // Always true for SpectroCloud
  skipMetricsLookup: boolean; // Configurable (default: true)
}
```

### RBAC Resources Created

#### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: backstage-system
```

#### ServiceAccount
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backstage-sa
  namespace: backstage-system
```

#### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backstage-sa-token
  namespace: backstage-system
  annotations:
    kubernetes.io/service-account.name: backstage-sa
type: kubernetes.io/service-account-token
```

#### ClusterRole
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: backstage-read-only
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

#### ClusterRoleBinding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: backstage-read-only-binding
subjects:
  - kind: ServiceAccount
    name: backstage-sa
    namespace: backstage-system
roleRef:
  kind: ClusterRole
  name: backstage-read-only
  apiGroup: rbac.authorization.k8s.io
```

### Refresh Mechanism
- **Initial Refresh**: Triggered on plugin startup
- **Periodic Refresh**: Every 10 minutes by default
- **Timeout Handling**: 15-second timeout per cluster
- **Error Recovery**: Failed clusters logged but don't block others

### Cluster Filtering
The plugin supports flexible project-based filtering:
- **includeProjects**: Whitelist of project names (empty = all projects)
- **excludeProjects**: Blacklist of project names
- **excludeTenantScopedClusters**: Toggle for tenant-scoped cluster exclusion

Logic:
1. If `includeProjects` is set and not empty, only those projects are processed
2. If `excludeProjects` is set, those projects are skipped
3. If `excludeTenantScopedClusters` is true, tenant-scoped clusters are skipped

## Integration Points

### Kubernetes Plugin Integration
- Extends `kubernetesClusterSupplierExtensionPoint`
- Provides `KubernetesClustersSupplier` implementation
- Compatible with Kubernetes backend plugin API

### SpectroCloud Palette Integration
- REST API authentication
- Cluster metadata retrieval
- Admin kubeconfig download
- Project membership queries

### Combined Supplier Pattern
- Merges multiple cluster sources
- Handles duplicate cluster names
- Maintains cluster source information
- Provides unified cluster list

## Use Cases

### Multi-Source Cluster Management
```yaml
kubernetes:
  clusterLocatorMethods:
    - type: 'config'
      clusters: [...]
    - type: 'gke'
      projectId: my-project
    - type: 'spectrocloud'
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
```

### Production vs. Development Separation
```yaml
kubernetes:
  clusterLocatorMethods:
    - type: 'spectrocloud'
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      includeProjects: [production, staging]
      excludeTenantScopedClusters: true
```

### Automated Discovery with Overrides
```yaml
kubernetes:
  clusterLocatorMethods:
    # Static override for specific cluster
    - type: 'config'
      clusters:
        - name: critical-cluster
          url: https://critical.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${CRITICAL_TOKEN}
    # Auto-discover everything else
    - type: 'spectrocloud'
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
```

## Performance Considerations

### Cluster Discovery
- Initial discovery runs asynchronously
- Does not block backend startup
- Parallel cluster processing with timeouts
- Failed clusters don't affect others

### RBAC Setup
- Idempotent operations (safe to re-run)
- Individual cluster timeouts (15 seconds)
- Automatic retry on transient failures
- Graceful handling of inaccessible clusters

### Memory Usage
- Minimal memory footprint
- Clusters cached in memory
- Periodic refresh updates cache
- No persistent storage required


For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).

