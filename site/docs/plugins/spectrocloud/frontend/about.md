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

#### Kubernetes Resources Tab
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
- **Filtering**:
  - Filter by project
  - Filter by cloud type
  - Filter by cluster status
  - Filter by Kubernetes version
  - Show only clusters with updates available
- **Actions**:
  - Download kubeconfig
  - Navigate to cluster entity page
  - Sort by various fields
- **Updates Detection**: Identifies clusters where profile versions are behind latest

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
- **Kubeconfig**: `getKubeconfig()`
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

