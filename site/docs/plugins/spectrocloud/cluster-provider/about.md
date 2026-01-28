# SpectroCloud Cluster Provider Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-cluster-provider/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-cluster-provider)

## Overview

The SpectroCloud Cluster Provider plugin is a Kubernetes cluster supplier that automatically discovers and configures clusters from SpectroCloud Palette for use with the Backstage Kubernetes plugin.

## Features

### Cluster Discovery
- Automatic cluster enumeration from SpectroCloud
- Project-based filtering
- Multi-instance support
- Tenant and project-scoped cluster support

### Authentication Modes
The plugin supports two authentication methods:

**Service Account Mode (Default)**
- Creates dedicated namespace (`backstage-system`)
- Creates service account (`backstage-sa`)
- Creates read-only ClusterRole
- Manages service account tokens
- Read-only access (get, list, watch only)

**OIDC Mode**
- No resources created in clusters
- User-level authentication
- Uses SpectroCloud identity tokens
- Audit trail with actual user names
- Requires SpectroCloud authentication backend module

### Security
- Configurable RBAC rules
- Minimal permissions by default
- Support for custom ClusterRole rules
- Isolated namespace (service account mode)
- User-level access control (OIDC mode)

## Technical Details

### Service Account Mode (Default)

**Resources Created:**
1. **Namespace**: `backstage-system`
2. **ServiceAccount**: `backstage-sa`
3. **Secret**: Service account token
4. **ClusterRole**: `backstage-read-only`
5. **ClusterRoleBinding**: Links service account to role

**Default Permissions:**
```yaml
rules:
  - apiGroups: ['*']
    resources: ['*']
    verbs: ['get', 'list', 'watch']
```

**Cluster Registration:**
- Name (prefixed by instance name if configured)
- API URL
- Service account token
- CA certificate
- Auth provider: `serviceAccount`

### OIDC Mode

**Resources Created:**
- None - no cluster resources created

**Cluster Registration:**
- Name (prefixed by instance name if configured)
- API URL
- CA certificate
- Auth provider: `oidc`
- OIDC token provider: `spectrocloud` (configurable)

**Requirements:**
- SpectroCloud authentication backend module
- SpectroCloud authentication frontend plugin
- SpectroCloud Kubernetes auth module
- Kubernetes clusters configured for SpectroCloud OIDC

## Use Cases

### Unified Cluster View
Combine SpectroCloud clusters with other sources:
- SpectroCloud clusters (service account or OIDC)
- Static config clusters
- GKE clusters
- Catalog-based clusters

### Service Account Mode
- Automated discovery with automatic RBAC setup
- Generic backstage service account for all users
- No user authentication required
- Suitable for read-only cluster access

### OIDC Mode
- User-level cluster authentication
- Kubernetes audit logs show actual users
- No service account management
- Requires user authentication with SpectroCloud
- Suitable for compliance and security requirements

### Mixed Authentication
- Use service accounts for legacy clusters
- Use OIDC for new clusters requiring user-level access
- Configure per-environment authentication strategies

