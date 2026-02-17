# SpectroCloud Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud)

## Overview

The SpectroCloud Frontend plugin provides comprehensive integration with SpectroCloud Palette, including entity cards for visualizing clusters and profiles, standalone pages for cluster deployment and management, and Kubernetes resource visualization. It integrates with the SpectroCloud backend plugin for real-time data and provides interactive features like kubeconfig downloads, pack exploration, and cluster creation.

## Features

### Entity Cards

#### Cluster Card
- **Basic Information**:
  - Cluster name and state
  - Kubernetes version
  - Cloud type (EKS, AWS, AKS, Azure, vSphere, etc.)
  - Scope (project or tenant)
  - Project name (if project-scoped)

- **Attached Profiles**:
  - Expandable profile list with pack details
  - Profile version display
  - Upgrade availability indicators
  - Pack/layer details with syntax-highlighted YAML viewer
  - Permission-based visibility of pack values and manifests

- **Kubeconfig Download**:
  - One-click kubeconfig download
  - FRP (reverse proxy) support
  - Permission-controlled access

#### Profile Card
- **Profile Information**:
  - Profile type (infra, add-on, cluster)
  - Cloud type
  - Scope (project or tenant)
  - Profile status (published, draft)
  - Latest version

- **Version Management**:
  - All available versions listed
  - Cluster count per version
  - Expandable cluster lists
  - Direct links to cluster entities

#### Cluster Group Card
- **Basic Information**:
  - Cluster group name and ID
  - Scope (project or tenant)
  - Project name with link to system entity
  - Endpoint type (Ingress, LoadBalancer)

- **Member Clusters**:
  - List of clusters in the group
  - Clickable links to cluster entities

- **Add-on Profiles**:
  - List of add-on profiles attached to the group
  - Clickable links to profile entities

#### Virtual Cluster Card
- **Basic Information**:
  - Virtual cluster name, ID, and state
  - Scope and project (linked to system entity)
  - Cloud type (always "nested")

- **Resource Quotas**:
  - CPU quotas: requests, limits, and usage
  - Memory quotas: requests, limits, and usage
  - Visual progress bars with usage percentages
  - Color-coded warnings when usage exceeds limits

- **References**:
  - Host cluster (clickable link)
  - Cluster group (clickable link)
  - Attached profiles (clickable links)

- **Actions**:
  - Download kubeconfig
  - Permission-controlled access

#### Entity Content Tabs

##### Kubernetes Resources Tab
- **Resource Visualization**:
  - View Kubernetes resources for SpectroCloud clusters
  - Integration with `backstage.io/kubernetes-cluster` annotation
  - Support for standard Kubernetes resources
  - Support for Crossplane claims and composites
  - Support for KRO (Kubernetes Resource Orchestrator) instances

- **Filtering Capabilities**:
  - Filter by namespace
  - Filter by resource kind
  - Filter by resource category
  - Filter by entity kind
  - Filter by owner
  - Text search

- **View Options**:
  - Flat grouped view (default)
  - Optional graph view
  - Optional hierarchical table view

##### Cluster Group Settings Tab
Available for `spectrocloud-cluster-group` entities:

- **Version Information**:
  - Kubernetes version
  - vCluster version
  - Kubernetes distribution

- **Basic Configuration**:
  - Endpoint type (Ingress, LoadBalancer)
  - Member clusters count
  - Metrics Server integration status

- **Resource Limits**:
  - CPU limits per virtual cluster
  - Memory limits per virtual cluster
  - Storage limits
  - Over-subscription percentage

- **Deployed Components**:
  - Local Path Provisioner status
  - CNI (Flannel) status
  - Kube Proxy status
  - MetalLB status
  - Ingress NGINX status
  - Metrics Server status

- **Resource Sync Configuration**:
  - Resources synced to host cluster (table)
  - Resources synced from host cluster (table)

- **Policies**:
  - Resource Quota: enabled/disabled with detailed limits table
  - Limit Range: enabled/disabled with default requests/limits tables
  - Network Policy: enabled/disabled with:
    - Fallback DNS settings
    - Outgoing connections CIDR and exceptions
    - Extra control plane rules
    - Extra workload rules

- **vCluster Plugins**:
  - List of configured plugins with image and version

- **Raw Configuration**:
  - Collapsible Helm values YAML
  - Syntax-highlighted display

### Standalone Pages

#### Cluster Deployment Page
A comprehensive wizard for deploying new SpectroCloud clusters:

**Supported Cloud Types**:
- Amazon EKS
- AWS (Palette eXtended Kubernetes)
- Azure AKS
- Azure (Palette eXtended Kubernetes)
- VMware vSphere

**Deployment Steps**:
1. **Cloud Type Selection**: Choose target cloud provider
2. **Project Selection**: Select SpectroCloud project
3. **Cloud Account Selection**: Choose configured cloud account
4. **Profile Selection**: Select infrastructure and add-on profiles
5. **Profile Variables**: Configure profile-level variables
6. **Cluster Configuration**: Set cluster name, description, tags, and variables
7. **Infrastructure Configuration**:
   - Control plane configuration
   - Worker pool configuration (instance types, sizes, labels, taints)
   - vSphere-specific: datacenters, datastores, networks, IP pools
8. **Review and Deploy**: Review configuration and create cluster

#### Cluster Viewer Page
Browse and manage all accessible SpectroCloud clusters:

- **View Modes**: Card view and list view
- **Filtering**: Modal-based filtering with:
  - Filter by project
  - Filter by cloud type
  - Filter by cluster status
  - Filter by Kubernetes version
  - Show only clusters with updates available (checkbox)
- **Actions**:
  - Create new clusters (redirects to deployment wizard)
  - Download kubeconfig
  - Navigate to cluster entity page
  - Sort by various fields
- **Updates Detection**: Identifies clusters where profile versions are behind latest

#### Virtual Cluster Viewer Page
Browse and manage all accessible SpectroCloud virtual clusters:

- **View Modes**: Card view and table view
- **Filtering**:
  - Filter by project
  - Filter by status
  - Show only clusters with updates available (checkbox)
- **Display Information**:
  - Virtual cluster name and state
  - Project (clickable link to system entity)
  - Host cluster and cluster group (clickable links)
  - Resource quotas (CPU and memory usage)
  - Attached profiles (clickable links)
- **Actions**:
  - Download kubeconfig
  - Navigate to virtual cluster entity page
  - Refresh list
- **Updates Detection**: Identifies virtual clusters where profile versions are behind latest

### Pack/Layer Viewer
- **Configuration Display**:
  - Syntax-highlighted YAML viewer (using react-syntax-highlighter)
  - Values configuration with schema information
  - Pack presets display
  - Manifest content (for manifest packs)
  - Tab-based navigation between values and manifests

## Technical Architecture

### Plugin System Support

The plugin supports both **legacy** and **new frontend system** approaches:

#### Legacy System (`plugin.ts`)
- Uses `createPlugin` and `createComponentExtension`
- Compatible with apps using `@backstage/app-defaults`
- Import from `@terasky/backstage-plugin-spectrocloud`

#### New Frontend System (`alpha.tsx`)
- Uses `createFrontendPlugin` with blueprints
- Import from `@terasky/backstage-plugin-spectrocloud/alpha`
- Provides:
  - `ApiBlueprint` for SpectroCloud API and Auth API
  - `EntityCardBlueprint` for cluster and profile cards
  - `EntityContentBlueprint` for Kubernetes resources tab
  - `PageBlueprint` for deployment and viewer pages
  - `NavItemBlueprint` for navigation

### API Integration

The plugin provides a comprehensive API client (`SpectroCloudApiClient`) with methods for:

- **User & Projects**: `getUserProjects()`, `getProjects()`
- **Clusters**: `getAllClusters()`, `getClusterDetails()`, `createCluster()`
- **Virtual Clusters**: `getAllVirtualClusters()`, `getVirtualClusterDetails()`
- **Cluster Groups**: `getClusterGroupDetails()`
- **Kubeconfig**: `getKubeconfig()`, `getVirtualClusterKubeconfig()`
- **Profiles**: `getClusterProfiles()`, `searchProfiles()`, `getProjectProfiles()`, `getProfileWithPacks()`, `getProfileVariables()`
- **Packs**: `getPackManifest()`
- **Cloud Accounts**: `getCloudAccounts()`, `getCloudAccount()`
- **vSphere**: `getVSphereCloudAccountMetadata()`, `getVSphereComputeClusterResources()`, `getVSphereIPPools()`
- **Infrastructure**: `getUserSSHKeys()`, `getOverlords()`

### Permission Integration

The frontend implements a comprehensive permission system with guards and hooks:

**Permission Guards (Components)**:
- `IfCanViewClusterInfo`
- `IfCanDownloadKubeconfig`
- `IfCanViewPackValues`
- `IfCanViewPackManifests`
- `IfCanViewProfileInfo`
- `IfCanViewProfileClusters`
- `IfCanCreateCluster`

**Permission Hooks**:
- `useCanViewClusterInfo()`
- `useCanDownloadKubeconfig()`
- `useCanViewPackValues()`
- `useCanViewPackManifests()`
- `useCanViewProfileInfo()`
- `useCanViewProfileClusters()`
- `useCanCreateCluster()`

Permissions are controlled by the `spectrocloud.enablePermissions` configuration option.

### Route Structure

| Route | Path | Description |
|-------|------|-------------|
| `rootRouteRef` | `/spectrocloud` | Root route |
| `clusterDeploymentRouteRef` | `/spectrocloud/deploy` | Cluster deployment wizard |
| `clusterViewerRouteRef` | `/spectrocloud/clusters` | Cluster viewer/browser |
| `virtualClusterViewerRouteRef` | `/spectrocloud/virtual-clusters` | Virtual cluster viewer/browser |

### Data Flow

1. **Entity Cards**: Read basic information from annotations, fetch detailed data from backend API
2. **Cluster Viewer**: Fetches all clusters from backend, applies client-side filtering
3. **Cluster Deployment**: Multi-step wizard with progressive data fetching (projects → accounts → profiles → metadata)
4. **Kubernetes Resources**: Uses catalog tags and annotations to identify resources
5. **Real-time Refresh**: Manual refresh buttons and automatic data revalidation
6. **Permission Checks**: Conditional rendering based on permission evaluation

### Authentication

The plugin integrates with `@terasky/backstage-plugin-spectrocloud-auth`:
- Uses OIDC tokens for authentication
- Supports HS256 session tokens for SpectroCloud API
- Sends `X-SpectroCloud-Token` and `X-SpectroCloud-User-Email` headers
- Handles re-authentication requirements from backend

## Use Cases

### Cluster Management
- View cluster health and status at a glance
- Access kubeconfig for cluster operations
- Monitor profile versions and available upgrades
- Browse all clusters across projects
- Identify clusters needing updates

### Cluster Deployment
- Self-service cluster creation through Backstage
- Deploy to multiple cloud types (EKS, AWS, AKS, Azure, vSphere)
- Configure infrastructure and add-on profiles
- Set up worker pools with custom configurations
- vSphere deployments with PCG/overlord selection

### Profile Tracking
- Track which clusters use which profile versions
- Plan profile upgrades across clusters
- Understand profile adoption
- View profile version history

### Configuration Review
- Review pack configurations without accessing Palette
- Compare values across profiles
- Audit manifest content
- View pack presets and schemas

### Kubernetes Resource Management
- View resources deployed in SpectroCloud clusters
- Support for Crossplane and KRO resources
- Filter and search capabilities
- Category-based organization

### Virtual Cluster Management
- Browse all virtual clusters across projects
- Monitor resource quotas and usage
- Track CPU and memory consumption
- Identify virtual clusters needing updates
- Access kubeconfig for virtual clusters
- Navigate between virtual clusters, host clusters, and cluster groups

### Cluster Group Configuration
- Review cluster group settings and policies
- Understand resource sync configurations
- View resource quotas and limit ranges
- Inspect network policy settings
- Analyze deployed components and integrations
- Examine vCluster plugin configurations

