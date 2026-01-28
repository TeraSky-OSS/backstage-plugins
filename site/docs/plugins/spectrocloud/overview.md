# SpectroCloud Plugins

The SpectroCloud plugins for Backstage provide comprehensive integration with SpectroCloud Palette, enabling teams to visualize, manage, and interact with their SpectroCloud resources directly within Backstage. The suite includes catalog ingestion, frontend visualization, and AI-powered automation through MCP actions.

## Plugin Suite Components

The SpectroCloud plugin suite consists of several components for resource management and authentication:

- **Frontend Plugin (`@terasky/backstage-plugin-spectrocloud`)**: 
  - Entity cards for clusters and cluster profiles
  - Cluster information display (K8s version, cloud type, state)
  - Profile version tracking and upgrade indicators
  - Kubeconfig download functionality
  - Pack/layer visualization with YAML viewer
  - Permission-based access control

- **Backend Plugin (`@terasky/backstage-plugin-spectrocloud-backend`)**:
  - HTTP API for frontend communication
  - MCP actions for AI agents
  - Permission enforcement
  - Secure SpectroCloud API integration

- **Ingestor Plugin (`@terasky/backstage-plugin-spectrocloud-ingestor`)**:
  - Catalog entity provider
  - Project, cluster profile, and cluster ingestion
  - Relationship mapping between entities
  - Scheduled refresh of resources

- **Cluster Provider Plugin (`@terasky/backstage-plugin-spectrocloud-cluster-provider`)**:
  - Kubernetes cluster discovery from Palette
  - Automatic RBAC setup with service accounts
  - Integration with Backstage Kubernetes plugin

- **Cluster Provider Plugin (`@terasky/backstage-plugin-spectrocloud-cluster-provider`)**:
  - Kubernetes cluster discovery from Palette
  - Service account or OIDC authentication support
  - Automatic RBAC setup (service account mode)
  - Integration with Backstage Kubernetes plugin

- **Authentication Backend Module (`@terasky/backstage-plugin-spectrocloud-auth-backend`)**:
  - SpectroCloud OIDC authentication integration
  - OAuth2 authorization code flow with token exchange
  - RS256 ID token for Kubernetes authentication
  - User profile extraction and sign-in resolution

- **Authentication Frontend Plugin (`@terasky/backstage-plugin-spectrocloud-auth`)**:
  - OAuth2 client for SpectroCloud authentication
  - Sign-in page integration
  - Session management and user identity APIs
  - Auto-discovered by Backstage

- **Kubernetes Auth Module (`@terasky/backstage-plugin-spectrocloud-kubernetes-auth-module`)**:
  - Extends Backstage Kubernetes plugin for OIDC
  - User-level authentication to clusters
  - Uses SpectroCloud identity tokens
  - Provides audit trails with actual user names

- **Common Library (`@terasky/backstage-plugin-spectrocloud-common`)**:
  - Shared types and interfaces
  - Permission definitions
  - Common utilities

## Key Features

### Catalog Integration
- **Automatic Resource Ingestion**:
  - Projects as System entities
  - Cluster Profiles as Resource entities
  - Clusters as Resource entities
  - Automatic relationship mapping

### Frontend Visualization
- **Cluster Cards**:
  - Kubernetes version display
  - Attached profiles with versions
  - Upgrade availability indicators
  - Cloud type and scope information
  - Kubeconfig download

- **Profile Cards**:
  - Version listing with cluster counts
  - Expandable cluster lists per version
  - Profile type and scope display

### Pack/Layer Details
- **YAML Viewer**:
  - Syntax-highlighted configuration display
  - Values and manifest viewing
  - Tab-based navigation for manifest packs

### Access Control
- **Permission Management**:
  - Fine-grained access control
  - Kubeconfig download permissions
  - Pack values/manifests viewing permissions
  - Profile and cluster info permissions

### AI Integration
- **MCP Actions**:
  - Cluster health monitoring
  - Kubeconfig generation
  - Profile pack details
  - Cluster-to-profile reverse lookup

## Available Permissions

The plugin suite provides granular permission controls:

- `spectrocloud.cluster.view-info`: View basic cluster information
- `spectrocloud.cluster.download-kubeconfig`: Download cluster kubeconfig
- `spectrocloud.cluster.view-pack-values`: View pack configuration values
- `spectrocloud.cluster.view-pack-manifests`: View pack manifest content
- `spectrocloud.profile.view-info`: View profile information
- `spectrocloud.profile.view-clusters`: View clusters using a profile

## Configuration

All SpectroCloud plugins share a common configuration structure:

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io  # Optional, default
  enablePermissions: true  # Enable permission checks
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
        refreshIntervalSeconds: 600
      clusterProvider:
        includeProjects: [production]
        excludeProjects: [sandbox]
```

## Getting Started

### Resource Management Plugins

To get started with SpectroCloud resource management:

1. **Install the ingestor plugin** for catalog integration
2. **Install the backend plugin** for API and MCP actions
3. **Install the frontend plugin** for visualization
4. **Optionally install the cluster provider** for Kubernetes plugin integration
5. **Configure permissions** as needed

### Authentication Plugins

To enable SpectroCloud authentication:

1. **Install the backend auth module** for OIDC authentication
2. **Install the frontend auth plugin** (auto-discovered)
3. **Optional: Install Kubernetes auth module** for user-level cluster access
4. **Configure sign-in resolvers** and authentication providers

## Documentation

### Resource Management

- [Frontend Plugin](./frontend/about.md)
- [Backend Plugin](./backend/about.md)
- [Ingestor Plugin](./ingestor/about.md)
- [Cluster Provider](./cluster-provider/about.md)

### Authentication

- [Authentication Overview](./auth/overview.md)
- [Backend Auth Module](./auth/backend/about.md)
- [Frontend Auth Plugin](./auth/frontend/about.md)
- [Kubernetes Auth Module](./auth/kubernetes-module/about.md)

