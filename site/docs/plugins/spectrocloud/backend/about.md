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

Features:
- Infrastructure and add-on profile attachment
- Profile variable configuration
- Worker pool configuration (instance types, sizes, labels, taints)
- vSphere-specific configuration (datacenters, datastores, networks, IP pools)
- Cluster tags and metadata

### MCP Actions

The plugin provides entity-centric MCP actions for AI agents:

| Action Name | Description | Permission | Input |
|-------------|-------------|------------|-------|
| `get_spectrocloud_health_for_cluster` | Get real-time health status, detailed cluster state, node health, and any issues for a SpectroCloud cluster | `viewClusterInfo` | `clusterName` (cluster title) |
| `get_spectrocloud_kubeconfig_for_cluster` | Generate and download a kubeconfig file for the SpectroCloud cluster (client/OIDC access, not admin) | `downloadKubeconfig` | `clusterName` (cluster title), `frp?` (boolean, default true) |
| `get_spectrocloud_pack_details_for_profile` | Show what packs and versions are in a cluster profile | `viewPackValues` | `profileName` (profile title) |
| `find_spectrocloud_clusters_for_profile` | List all clusters using this cluster profile (reverse lookup) | `viewProfileClusters` | `profileName` (profile title) |

**Note**: MCP actions use entity titles (`metadata.title`) to look up entities, not entity names. Actions resolve entities from the catalog with type `spectrocloud-cluster` or `spectrocloud-cluster-profile` and use annotations to call SpectroCloud APIs.

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
- Power the cluster and profile cards
- Provide real-time data fetching
- Handle kubeconfig downloads securely
- Enable cluster deployment wizard
- Support cluster viewer/browser

### Cluster Lifecycle Management
- Self-service cluster creation
- Multi-cloud deployments
- Infrastructure profile selection
- Worker pool configuration

### AI Automation
- Automated cluster health monitoring
- Programmatic kubeconfig generation
- Profile analysis and reporting
- Cluster-profile relationship discovery

### DevOps Workflows
- Integrate with CI/CD pipelines
- Automate cluster operations
- Generate reports on cluster states
- Track profile usage across clusters

