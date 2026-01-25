# SpectroCloud Cluster Provider Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-cluster-provider/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-cluster-provider)

## Overview

The SpectroCloud Cluster Provider plugin is a Kubernetes cluster supplier that automatically discovers and configures clusters from SpectroCloud Palette for use with the Backstage Kubernetes plugin.

## Features

### Cluster Discovery
- Automatic cluster enumeration from SpectroCloud
- Project-based filtering
- Multi-instance support

### RBAC Setup
- Creates dedicated namespace (`backstage-system`)
- Creates service account (`backstage-sa`)
- Creates read-only ClusterRole
- Manages service account tokens

### Security
- Read-only access (get, list, watch only)
- No write permissions
- Isolated namespace
- Minimal RBAC footprint

## Technical Details

### Resources Created

1. **Namespace**: `backstage-system`
2. **ServiceAccount**: `backstage-sa`
3. **Secret**: Service account token
4. **ClusterRole**: `backstage-read-only`
5. **ClusterRoleBinding**: Links service account to role

### Default Permissions

```yaml
rules:
  - apiGroups: ['*']
    resources: ['*']
    verbs: ['get', 'list', 'watch']
```

### Cluster Registration

Each discovered cluster is registered with:
- Name (prefixed by instance name if configured)
- API URL
- Service account token
- CA certificate

## Use Cases

### Unified Cluster View
Combine SpectroCloud clusters with other sources:
- SpectroCloud clusters
- Static config clusters
- GKE clusters
- Catalog-based clusters

### Automated Discovery
- New clusters appear automatically
- RBAC configured automatically
- No manual kubeconfig management

