# SpectroCloud Kubernetes Cluster Supplier

The SpectroCloud Kubernetes Cluster Supplier is a backend plugin for Backstage that automatically discovers and configures Kubernetes clusters from SpectroCloud Palette. It seamlessly integrates with Backstage's Kubernetes plugin by providing a custom cluster supplier that works alongside existing discovery methods.

## Features

- **Automatic Cluster Discovery**: Discovers clusters from SpectroCloud Palette API automatically
- **Works Alongside Existing Suppliers**: Integrates with all standard Kubernetes cluster locator methods (config, catalog, gke, localKubectlProxy)
- **Secure RBAC Setup**: Automatically creates read-only service accounts with minimal permissions
- **Idempotent Operations**: Safe to run multiple times without side effects
- **Project Filtering**: Include or exclude clusters based on SpectroCloud project names
- **Tenant-Scoped Support**: Option to exclude tenant-scoped clusters
- **Configurable Performance**: Customizable refresh intervals and timeouts
- **RBAC Customization**: Override namespace, service account, and ClusterRole names and permissions
- **All-in-One Solution**: Handles all Kubernetes cluster locator methods in a single unified plugin

## Plugin Components

### Backend Plugin
The plugin provides backend functionality for:
- Cluster discovery from SpectroCloud
- Automatic RBAC configuration
- Service account token management
- Integration with all standard cluster suppliers

[Learn more about the backend plugin](./backend/about.md)

## How It Works

### Service Account Token Authentication

1. **Fetch Clusters**: Queries SpectroCloud Palette API for cluster list
2. **Download Kubeconfig**: Retrieves admin kubeconfig for each cluster
3. **Create Namespace**: Idempotently creates `backstage-system` namespace
4. **Setup Service Account**: Creates `backstage-sa` service account with associated secret
5. **Configure RBAC**: Creates `backstage-read-only` ClusterRole with get/list/watch permissions
6. **Bind Role**: Creates ClusterRoleBinding to grant permissions
7. **Extract Token**: Retrieves and stores service account token
8. **Register Cluster**: Makes cluster available to Backstage's Kubernetes plugin

### Security Model

- **Read-Only Access**: Service account can only get, list, and watch resources
- **No Write Permissions**: Cannot create, update, or delete any resources
- **Isolated Namespace**: All Backstage resources in dedicated `backstage-system` namespace
- **Minimal Permissions**: ClusterRole limited to read-only verbs only

## Supported Cluster Sources

This plugin supports **all** Kubernetes cluster locator methods:

### 1. SpectroCloud (New!)
Automatic discovery from SpectroCloud Palette

### 2. Config
Manual cluster configuration with static credentials

### 3. Catalog
Discover clusters from Backstage catalog entities

### 4. GKE
Automatic discovery from Google Kubernetes Engine

### 5. Local Kubectl Proxy
Connect to local kubectl proxy for development

## Use Cases

### Multi-Cloud Cluster Management
Combine SpectroCloud-managed clusters with clusters from other sources:
- SpectroCloud clusters in production
- GKE clusters for additional workloads
- Manual config clusters for edge locations
- Local clusters for development

### Project-Based Filtering
Selectively ingest clusters based on SpectroCloud projects:
- Include only production and staging projects
- Exclude development and sandbox environments
- Tenant-scoped vs project-scoped cluster control

### Automated Discovery
Eliminate manual cluster configuration:
- New clusters automatically appear in Backstage
- RBAC configured automatically
- Service accounts managed automatically
- No manual kubeconfig management

## Documentation Structure
- [About](./backend/about.md)
- [Installation](./backend/install.md)
- [Configuration](./backend/configure.md)

## Example Configuration

### Basic Configuration

```yaml
# Standard Kubernetes clusters (handled by default plugin)
kubernetes:
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        - name: my-cluster
          url: https://k8s.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_TOKEN}

# SpectroCloud configuration (supports multiple instances)
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      includeProjects: [production, staging]
      excludeProjects: [sandbox]
      excludeTenantScopedClusters: false
      skipMetricsLookup: true
```


### Advanced Configuration with Custom RBAC

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      # Project filtering
      includeProjects: [production, staging]
      
      # Performance tuning
      refreshIntervalSeconds: 300   # 5 minutes
      clusterTimeoutSeconds: 30     # 30 seconds
      
      # Custom RBAC configuration
      rbac:
        namespace: my-backstage
        serviceAccountName: my-sa
        clusterRoleRules:
          # Use 'core' for Kubernetes core API group (pods, services, etc.)
          - apiGroups: ['core']
            resources: ['pods', 'services']
            verbs: ['get', 'list', 'watch']
          - apiGroups: ['apps']
            resources: ['deployments']
            verbs: ['get', 'list', 'watch']
```

### Multi-Source Configuration

```yaml
kubernetes:
  clusterLocatorMethods:
    # Static clusters
    - type: 'config'
      clusters:
        - name: edge-cluster
          url: https://edge.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${EDGE_TOKEN}
    
    # GKE clusters
    - type: 'gke'
      projectId: my-gcp-project
      region: us-central1

# SpectroCloud clusters (supports multiple instances)
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    name: prod  # Optional: prefix for cluster names (e.g., "my-cluster" becomes "prod-my-cluster")
    clusterProvider:
      includeProjects: [production]
  
  # Optional: Add more SpectroCloud instances
  - url: https://api-eu.spectrocloud.com
    tenant: eu-tenant
    apiToken: ${SPECTROCLOUD_EU_API_TOKEN}
    name: staging-eu  # Prevents name conflicts with prod clusters
    clusterProvider:
      includeProjects: [staging]
```

## Getting Started

To get started with the SpectroCloud Kubernetes Cluster Supplier plugin, follow these steps:

1. [Install the plugin](./backend/install.md)
2. [Configure the plugin](./backend/configure.md)
3. Verify clusters appear in Backstage

