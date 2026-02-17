# SpectroCloud Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-backend)

## Overview

The SpectroCloud Backend plugin provides comprehensive HTTP API endpoints for the frontend plugin, MCP actions for AI agents, and cluster creation capabilities. It handles secure communication with SpectroCloud Palette APIs, permission enforcement, data processing, and integrates with the SpectroCloud auth backend for user-scoped API access.

## Features

### HTTP API Endpoints

#### Cluster Operations
- **List Clusters**: Fetch all accessible clusters with basic metadata
- **Cluster Details**: Get complete cluster information including configuration
- **Cluster Profiles**: Retrieve attached profiles with pack metadata
- **Kubeconfig Download**: Secure kubeconfig retrieval with FRP (reverse proxy) support
- **Pack Manifests**: Fetch pack manifest content
- **Cluster Creation**: Deploy new clusters to multiple cloud types (EKS, AWS, AKS, Azure, vSphere)

#### Virtual Cluster Operations
- **List Virtual Clusters**: Fetch all accessible virtual clusters with metadata
- **Virtual Cluster Details**: Get complete virtual cluster information including resource quotas
- **Virtual Cluster Kubeconfig**: Download kubeconfig for virtual clusters
- **Virtual Cluster Creation**: Deploy new virtual clusters within cluster groups

#### Cluster Group Operations
- **List Cluster Groups**: Fetch all accessible cluster groups (host clusters only)
- **Cluster Group Details**: Fetch cluster group configuration including Helm values and settings

#### Profile Operations
- **Profile Details**: Fetch profile information
- **Profile Search**: Search profiles by name across instances
- **Profile Packs**: Retrieve pack configurations with values, schemas, and presets
- **Profile Variables**: Get profile-level variables
- **Project Profiles**: List profiles for a specific project

#### Project Operations
- **User Projects**: Get projects accessible to the current user
- **All Projects**: List all projects

#### Cloud Account Operations
- **List Cloud Accounts**: Fetch cloud accounts by type (AWS, Azure, vSphere)
- **Cloud Account Details**: Get specific cloud account information
- **vSphere Metadata**: Fetch datacenters, folders, and networks
- **vSphere Compute Resources**: Get datastores, networks, and resource pools

#### Infrastructure Operations
- **User SSH Keys**: Retrieve user's SSH keys
- **Overlords/PCGs**: List private cloud gateways
- **vSphere IP Pools**: Fetch IP pools for vSphere deployments

#### Authentication & Health
- **Health Check**: Unauthenticated endpoint for service health
- **Auth Debug**: Token presence and header debugging

### Cluster Creation

The backend supports creating clusters on multiple cloud providers:

- **Amazon EKS**: Managed Kubernetes on AWS
- **AWS (PXK)**: Palette eXtended Kubernetes on AWS EC2
- **Azure AKS**: Managed Kubernetes on Azure
- **Azure (PXK)**: Palette eXtended Kubernetes on Azure VMs
- **vSphere**: VMware vSphere clusters with PCG/overlord support
- **Virtual Clusters**: Nested virtual clusters within cluster groups

**Physical Cluster Features**:
- Infrastructure and add-on profile attachment
- Profile variable configuration
- Worker pool configuration (instance types, sizes, labels, taints)
- vSphere-specific configuration (datacenters, datastores, networks, IP pools)
- Cluster tags and metadata

**Virtual Cluster Features**:
- Cluster group selection
- Resource quota configuration (CPU cores, memory GiB, storage GiB)
- Automatic endpoint type inheritance from cluster group
- Simplified metadata (no tags or descriptions)

### MCP Actions

The plugin provides MCP actions for AI agents. Some actions are **entity-centric** (they look up catalog entities by title); others accept **UIDs or filters** (e.g. `instanceName`, `projectUid`) and use the backend API token.

#### Entity-centric actions (catalog lookup by title)

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `get_spectrocloud_health_for_cluster` | Get real-time health status, detailed cluster state, node health, and any issues for a SpectroCloud cluster | `viewClusterInfo` | `clusterName` (cluster title) |
| `get_spectrocloud_kubeconfig_for_cluster` | Generate and download a kubeconfig file for the SpectroCloud cluster (client/OIDC access, not admin) | `downloadKubeconfig` | `clusterName` (cluster title), `frp?` (boolean, default true) |
| `get_spectrocloud_pack_details_for_profile` | Show what packs and versions are in a cluster profile | `viewPackValues` | `profileName` (profile title) |
| `find_spectrocloud_clusters_for_profile` | List all clusters using this cluster profile (reverse lookup) | `viewProfileClusters` | `profileName` (profile title) |

#### List and discovery actions (optional `instanceName`, `projectUid` where applicable)

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `list_spectrocloud_clusters` | List all SpectroCloud clusters (optionally by project) | `viewClusterInfo` | `instanceName?`, `projectUid?` |
| `list_spectrocloud_virtual_clusters` | List all SpectroCloud virtual clusters | `viewClusterInfo` | `instanceName?` |
| `list_spectrocloud_projects` | List all SpectroCloud projects | `viewClusterInfo` | `instanceName?` |
| `list_spectrocloud_cluster_groups` | List cluster groups (optionally by project) | `viewClusterInfo` | `instanceName?`, `projectUid?` |
| `list_spectrocloud_cloud_accounts` | List cloud accounts by type (e.g. aws, azure, vsphere) | `viewClusterInfo` | `cloudType`, `projectUid?`, `instanceName?` |

#### Profile actions

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `search_spectrocloud_profiles_by_names` | Resolve profile UIDs and details by profile names | `viewProfileInfo` | `names` (string array), `projectUid?`, `instanceName?` |
| `get_spectrocloud_profile_variables` | Get variable definitions for a cluster profile | `viewProfileInfo` | `profileName?` (entity title) or `profileUid?`, `projectUid?`, `instanceName?` |
| `list_spectrocloud_profiles_for_project` | List cluster profiles in a project (optional cloud/type filter) | `viewProfileInfo` | `projectUid`, `cloudType?`, `profileType?`, `instanceName?` |

#### Pack and cluster profile actions (cluster by name or UID)

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `get_spectrocloud_pack_manifest_for_cluster` | Get manifest content for a pack on a cluster | `viewPackManifests` | `clusterName?` or `clusterUid?`, `manifestUid`, `projectUid?`, `instanceName?` |
| `get_spectrocloud_cluster_profiles` | Get profiles and pack metadata attached to a cluster | `viewPackValues` | `clusterName?` or `clusterUid?`, `projectUid?`, `instanceName?` |

#### Virtual cluster actions (UID-based)

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `get_spectrocloud_virtual_cluster_details` | Get health and details for a virtual cluster | `viewClusterInfo` | `virtualClusterUid`, `projectUid?`, `instanceName?` |
| `get_spectrocloud_kubeconfig_for_virtual_cluster` | Generate and download kubeconfig for a virtual cluster (client/OIDC access) | `downloadKubeconfig` | `virtualClusterUid`, `projectUid?`, `frp?`, `instanceName?` |

#### Cluster group action

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `get_spectrocloud_cluster_group` | Get cluster group details by UID | `viewClusterInfo` | `clusterGroupUid`, `projectUid?`, `instanceName?` |

**Notes**:

- **Entity-centric actions** use entity titles (`metadata.title`) to look up entities, not entity names. They resolve entities from the catalog with type `spectrocloud-cluster` or `spectrocloud-cluster-profile` and use annotations to call SpectroCloud APIs.
- **List and UID-based actions** use the backend API token (no user token in MCP context). Pass `instanceName` when multiple SpectroCloud environments are configured.

### Authentication Integration

The backend integrates with the SpectroCloud auth backend for user-scoped API access:

- **Token Cache**: Shared in-memory cache of HS256 session tokens by user email
- **Header-Based Auth**: Accepts `X-SpectroCloud-Token` and `X-SpectroCloud-User-Email` headers
- **Re-Auth Signaling**: Returns `X-SpectroCloud-ReAuth-Required` header when token is missing
- **Fallback Auth**: Uses static API token when user token is unavailable

### Permission Management

- **Seven Permissions**: viewClusterInfo, downloadKubeconfig, viewPackValues, viewPackManifests, createCluster, viewProfileInfo, viewProfileClusters
- **Fine-grained Access Control**: Per-endpoint permission checks
- **Integration with Backstage**: Uses Backstage's permission framework
- **Configurable Enforcement**: Enable/disable via `spectrocloud.enablePermissions`
- **Service Credentials**: Uses `auth.getOwnServiceCredentials()` for permission checks

### Multi-Instance Support

- **Multiple Environments**: Connect to multiple SpectroCloud instances
- **Instance Routing**: Automatic routing based on `instance` query parameter or entity annotations
- **Per-Instance Configuration**: Separate URLs, tenants, and API tokens
- **Unified API**: Single API interface across all instances

## Technical Architecture

### API Routes

All routes are under the `spectrocloud` backend plugin base path.

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/health` | Health check | Unauthenticated |
| GET | `/auth/debug` | Auth debug info | Any |
| GET | `/users/me/projects` | User's accessible projects | User token |
| GET | `/clusters` | List clusters | `viewClusterInfo` |
| GET | `/clusters/:clusterUid` | Cluster details | `viewClusterInfo` |
| GET | `/clusters/:clusterUid/kubeconfig` | Download kubeconfig | `downloadKubeconfig` |
| GET | `/clusters/:clusterUid/profiles` | Cluster profiles with packs | `viewPackValues` |
| GET | `/clusters/:clusterUid/pack/manifests/:manifestUid` | Pack manifest | `viewPackManifests` |
| POST | `/clusters` | Create cluster | `createCluster` |
| GET | `/virtualclusters` | List virtual clusters | `viewClusterInfo` |
| GET | `/virtualclusters/:clusterUid` | Virtual cluster details | `viewClusterInfo` |
| GET | `/virtualclusters/:clusterUid/kubeconfig` | Download virtual cluster kubeconfig | `downloadKubeconfig` |
| POST | `/virtualclusters` | Create virtual cluster | `createCluster` |
| GET | `/clustergroups` | List cluster groups (host clusters) | `viewClusterInfo` |
| GET | `/clustergroups/:clusterGroupUid` | Cluster group details | `viewClusterInfo` |
| GET | `/projects` | List projects | `viewClusterInfo` |
| GET | `/profiles/:profileUid` | Profile details | `viewProfileInfo` |
| POST | `/profiles/search` | Search profiles by name | `viewProfileInfo` |
| GET | `/profiles/:profileUid/packs` | Profile with pack details | `viewPackValues` |
| GET | `/profiles/:profileUid/variables` | Profile variables | No permission |
| GET | `/projects/:projectUid/profiles` | Project profiles | `viewProfileInfo` |
| GET | `/cloudaccounts/:cloudType` | Cloud accounts | `viewClusterInfo` |
| GET | `/cloudaccounts/:cloudType/:accountUid` | Cloud account details | `viewClusterInfo` |
| GET | `/cloudaccounts/vsphere/:accountUid/metadata` | vSphere metadata | No permission |
| GET | `/cloudaccounts/vsphere/:accountUid/computecluster/resources` | vSphere compute resources | No permission |
| GET | `/users/sshkeys` | User SSH keys | No permission |
| GET | `/overlords` | Overlords/PCGs | No permission |
| GET | `/overlords/vsphere/:overlordUid/pools` | vSphere IP pools | No permission |

### Query Parameters

- `instance`: Instance name for multi-instance routing
- `projectUid`: Project UID for project-scoped operations
- `frp`: FRP (reverse proxy) mode for kubeconfig (default: `true`)
- `cloudType`, `profileType`: Filtering parameters
- `datacenter`, `computecluster`: vSphere resource filtering

### SpectroCloud API Client

The `SpectroCloudClient` provides methods for interacting with SpectroCloud Palette API:

**Authentication**:
1. `userToken` (OIDC/OAuth HS256 session token) if present
2. `apiToken` (static API key) as fallback

**Core Methods**:
- User & Projects: `getUserInfo()`, `getAllProjects()`, `getProject()`
- Clusters: `getAllClusters()`, `getCluster()`, `getClustersForProject()`, `getTenantClusters()`, `getClientKubeConfig()`
- Virtual Clusters: `getAllVirtualClusters()`, `getVirtualCluster()`, `getVirtualClusterKubeConfig()`, `createVirtualCluster()`
- Cluster Groups: `getClusterGroup()`, `getClusterGroups()`
- Profiles: `getClusterProfile()`, `getProjectClusterProfiles()`, `searchClusterProfilesByName()`, `getClusterProfiles()`, `getProfileWithPacks()`, `getProfileVariables()`, `getPackManifest()`
- Cloud Accounts: `getCloudAccounts()`, `getCloudAccount()`, `getVSphereCloudAccountMetadata()`, `getVSphereComputeClusterResources()`
- Infrastructure: `getUserSSHKeys()`, `getOverlords()`, `getVSphereIPPools()`
- Cluster Creation: `createEKSCluster()`, `createAWSCluster()`, `createAKSCluster()`, `createAzureCluster()`, `createVSphereCluster()`

### Security Considerations

- **Authentication Required**: All endpoints (except `/health`) require authentication
- **Permission Checks**: Per-endpoint checks when `enablePermissions` is true
- **Secure Token Handling**: Tokens never logged or exposed in errors
- **No Sensitive Data**: Error messages sanitized
- **Service Credentials**: Backend uses its own credentials for permission checks
- **Token Cache Security**: In-memory cache with expiration checking

## Integration Benefits

### Unified API Layer
- Single point of access for frontend
- Consistent error handling
- Request/response normalization
- Multi-instance abstraction

### User-Scoped Operations
- Per-user token resolution
- User-specific cluster and project access
- Audit trail via user identity

### AI Agent Support
- Programmatic access via MCP actions
- Entity-context aware operations
- Comprehensive action coverage
- Catalog-backed entity resolution

### Security
- Centralized permission enforcement
- Audit logging capabilities
- Secure credential management
- Token expiration handling

## Use Cases

### Frontend Integration
- Power the cluster, profile, virtual cluster, and cluster group cards
- Provide real-time data fetching
- Handle kubeconfig downloads securely (clusters and virtual clusters)
- Enable cluster deployment wizard (physical and virtual clusters)
- Support cluster viewer and virtual cluster viewer pages
- Provide cluster group configuration details and listing

### Cluster Lifecycle Management
- Self-service cluster creation (physical and virtual)
- Multi-cloud deployments
- Virtual cluster creation within cluster groups
- Infrastructure profile selection
- Worker pool configuration
- Resource quota management for virtual clusters

### AI Automation
- Automated cluster health monitoring and cluster listing
- Programmatic kubeconfig generation (clusters and virtual clusters)
- Profile analysis, profile search by name, profile variables, and project profiles
- Cluster-profile relationship discovery
- Pack manifest and cluster profile inspection
- Virtual cluster details and kubeconfig
- Cluster group and cloud account discovery

### DevOps Workflows
- Integrate with CI/CD pipelines
- Automate cluster operations
- Generate reports on cluster states
- Track profile usage across clusters

