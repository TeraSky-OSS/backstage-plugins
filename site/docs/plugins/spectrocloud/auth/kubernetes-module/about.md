# SpectroCloud Kubernetes Authentication Module

[![npm latest version](https://img.shields.io/npm/v/@terasky/spectrocloud-kubernetes-auth-module/latest.svg)](https://www.npmjs.com/package/@terasky/spectrocloud-kubernetes-auth-module)

## Overview

The SpectroCloud Kubernetes Authentication Module is a frontend module that extends the Backstage Kubernetes plugin to add SpectroCloud OIDC authentication support. It enables user-level authentication to Kubernetes clusters using SpectroCloud identity tokens, providing audit trails and eliminating the need for service account management.

## Features

### OIDC Token Provider
- Integrates SpectroCloud as an OIDC token provider for Kubernetes
- Uses user's SpectroCloud ID token for cluster authentication
- Works alongside Microsoft and Google auth providers
- Supports multiple OIDC providers simultaneously

### User-Level Access
- Authenticate to clusters with user identity
- Kubernetes audit logs show actual user names
- No service account credentials to manage
- Permissions based on user's SpectroCloud roles

### Seamless Integration
- Auto-discovered by Backstage
- No manual App.tsx configuration needed
- Works with SpectroCloud cluster provider
- Compatible with existing Kubernetes plugin features

## Technical Architecture

### Module Structure
This is a frontend module (not a standalone plugin) that extends the `kubernetes` plugin:

```typescript
createFrontendModule({
  pluginId: 'kubernetes',  // Extends kubernetes plugin
  extensions: [kubernetesAuthProvidersExtension],
})
```

### API Blueprint
Creates a custom `KubernetesAuthProviders` instance:

```typescript
ApiBlueprint.make({
  api: kubernetesAuthProvidersApiRef,
  deps: {
    microsoftAuthApi,
    googleAuthApi,
    spectroCloudAuthApi,
  },
  factory: ({ microsoftAuthApi, googleAuthApi, spectroCloudAuthApi }) => {
    return new KubernetesAuthProviders({
      microsoftAuthApi,
      googleAuthApi,
      oidcProviders: {
        spectrocloud: spectroCloudAuthApi,
      },
    });
  },
})
```

### Authentication Flow
1. User signs in to Backstage with SpectroCloud
2. Frontend stores SpectroCloud ID token
3. Kubernetes plugin requests cluster data
4. Module provides SpectroCloud ID token for cluster authentication
5. Kubernetes API server validates token with SpectroCloud OIDC
6. User accesses cluster with their identity

### Integration Points
- SpectroCloud Auth Frontend Plugin (required)
- Backstage Kubernetes Plugin
- Kubernetes Auth Providers API
- Microsoft and Google auth APIs (for multi-provider support)

## Use Cases

### User-Level Kubernetes Access
Replace service accounts with user authentication for better security and audit trails.

### SpectroCloud-Managed Clusters
Seamlessly access Kubernetes clusters managed by SpectroCloud using your SpectroCloud credentials.

### Multi-Provider Environments
Support multiple authentication providers (SpectroCloud, Microsoft, Google) in the same Backstage instance.

### Compliance and Auditing
Track which users access which clusters and what actions they perform through Kubernetes audit logs.

## Comparison with Service Accounts

| Feature | Service Account | OIDC (This Module) |
|---------|----------------|-------------------|
| Setup | Creates SA in each cluster | No cluster resources |
| Identity | Generic backstage-sa | Individual users |
| Audit Trail | Generic service account | Actual user names |
| Permissions | Cluster-wide RBAC | User-specific RBAC |
| Token Management | Manual rotation | Automatic via SpectroCloud |
| Access Control | Same for all users | Per-user control |

## Prerequisites

**Required:**
- SpectroCloud Authentication Backend Module
- SpectroCloud Authentication Frontend Plugin
- Kubernetes Plugin (Backstage core)

**Recommended:**
- SpectroCloud Cluster Provider (for auto-discovery)
- Kubernetes clusters configured with SpectroCloud OIDC

## Technical Details

### Token Provider Name
The module registers SpectroCloud as an OIDC token provider with the name `spectrocloud`. This name must match the `oidcTokenProvider` setting in cluster configurations.

### Supported Providers
The module maintains support for existing providers:
- Microsoft Azure authentication
- Google Cloud authentication
- SpectroCloud OIDC (added by this module)

### API Override
The module replaces the default `kubernetesAuthProvidersApiRef` implementation provided by the Kubernetes plugin. This is why the default implementation must be disabled in configuration.

For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).
