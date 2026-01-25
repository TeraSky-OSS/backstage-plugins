# SpectroCloud Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-backend)

## Overview

The SpectroCloud Backend plugin provides HTTP API endpoints for the frontend plugin and MCP actions for AI agents. It handles secure communication with SpectroCloud Palette APIs, permission enforcement, and data processing.

## Features

### HTTP API Endpoints
- **Kubeconfig Download**: Secure kubeconfig retrieval with FRP support
- **Cluster Details**: Fetch full cluster information including profiles
- **Profile Packs**: Retrieve pack configurations and manifests
- **Profile Search**: Search profiles across instances

### MCP Actions
The plugin provides entity-centric MCP actions for AI agents:

- `spectrocloud_get_cluster_health`: Get cluster health and status
- `spectrocloud_get_kubeconfig`: Generate kubeconfig (OIDC/client)
- `spectrocloud_get_profile_packs`: Get profile pack details
- `spectrocloud_search_profiles_by_cluster`: Find profiles used by a cluster

### Permission Management
- Fine-grained access control
- Integration with Backstage's permission framework
- Per-action permission checks
- Configurable permission policies

### Multi-Instance Support
- Connect to multiple SpectroCloud environments
- Instance-specific configuration
- Automatic instance routing based on entity annotations

## Technical Architecture

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/clusters/:clusterUid/kubeconfig` | GET | Download kubeconfig |
| `/clusters/:clusterUid` | GET | Get cluster details |
| `/clusters/:clusterUid/profiles` | GET | Get cluster profiles with packs |
| `/profiles/:profileUid/packs/:packUid/manifests` | GET | Get pack manifests |
| `/search/profiles` | GET | Search profiles |

### Permission Model

The plugin implements comprehensive permission checks:

1. **Cluster Permissions**
   - View cluster info
   - Download kubeconfig
   - View pack values
   - View pack manifests

2. **Profile Permissions**
   - View profile info
   - View clusters using profile

### Security Considerations
- All API endpoints require authentication
- Permission checks before data access
- Secure token handling for SpectroCloud API
- No sensitive data in error messages

## Integration Benefits

1. **Unified API Layer**
   - Single point of access for frontend
   - Consistent error handling
   - Request/response normalization

2. **AI Agent Support**
   - Programmatic access via MCP actions
   - Entity-context aware operations
   - Comprehensive action coverage

3. **Security**
   - Centralized permission enforcement
   - Audit logging capabilities
   - Secure credential management

## Use Cases

### Frontend Integration
- Power the cluster and profile cards
- Provide real-time data fetching
- Handle kubeconfig downloads securely

### AI Automation
- Automated cluster health monitoring
- Programmatic kubeconfig generation
- Profile analysis and reporting

### DevOps Workflows
- Integrate with CI/CD pipelines
- Automate cluster operations
- Generate reports on cluster states

