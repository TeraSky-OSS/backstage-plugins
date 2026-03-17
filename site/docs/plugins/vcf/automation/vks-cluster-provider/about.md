# VCFA VKS Cluster Provider Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcfa-vks-cluster-provider/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcfa-vks-cluster-provider)

## Overview

The VCFA VKS Cluster Provider plugin is a Kubernetes cluster supplier that automatically discovers and configures VKS (Kubernetes) clusters from VCF Automation for use with the Backstage Kubernetes plugin.

> **Important:** Backstage currently supports only one custom cluster supplier at a time. If you are also using the [SpectroCloud Cluster Provider](../../spectrocloud/cluster-provider/about.md), only one of the two plugins can be enabled in your Backstage instance at a time.

## Features

### Cluster Discovery
- Automatic VKS cluster enumeration from VCFA supervisor resources
- Discovers clusters across all supervisor namespaces
- Includes both standalone clusters and clusters managed by VCFA deployments
- Multi-instance support for multiple VCFA environments

### Authentication
The plugin uses the VCF Automation vCloud Director session API for authentication:

- Authenticates via `POST /cloudapi/1.0.0/sessions` with Basic Auth (`username@orgName:password`)
- Bearer token retrieved from the `x-vmware-vcloud-access-token` response header
- Token cached for 1 hour and automatically refreshed

### Kubeconfig Retrieval
Admin kubeconfigs are fetched directly from the VCFA proxy API:

- Kubeconfig stored as a Kubernetes Secret within each supervisor namespace
- Retrieved via: `{baseUrl}/proxy/k8s/namespaces/{namespaceId}/api/v1/namespaces/{namespaceName}/secrets/{clusterName}-kubeconfig`
- The `data.value` field of the secret contains the base64-encoded kubeconfig YAML

### Service Account Mode
- Creates a dedicated namespace (`backstage-system` by default)
- Creates a service account (`backstage-sa` by default)
- Creates a read-only ClusterRole with configurable rules
- Manages service account token secrets
- Read-only access (get, list, watch) by default

### Security
- Configurable RBAC rules per instance
- Minimal permissions by default
- Support for custom ClusterRole rules
- Isolated namespace for Backstage resources

## Technical Details

### How Cluster Discovery Works

1. The plugin fetches all supervisor namespaces from VCFA to build a map of namespace names to their VCFA namespace IDs (URNs)
2. It then fetches all supervisor resources and filters for resources with `kind: Cluster`
3. For each cluster, it resolves the supervisor namespace URN via the namespace name stored in `metadata.namespace`
4. The admin kubeconfig is fetched from the VCFA proxy API using the namespace URN, namespace name, and cluster name
5. The plugin decodes the base64-encoded `data.value` field from the kubeconfig secret to obtain the raw kubeconfig YAML

### Resources Created Per Cluster

1. **Namespace**: `backstage-system`
2. **ServiceAccount**: `backstage-sa`
3. **Secret**: Service account token (`backstage-sa-token`)
4. **ClusterRole**: `backstage-read-only`
5. **ClusterRoleBinding**: `backstage-read-only-binding`

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
- API server URL
- Service account token
- CA certificate
- Auth provider: `serviceAccount`
- `skipTLSVerify: true` (VKS clusters typically use self-signed certificates)

## Use Cases

### Unified Cluster View

Combine VCFA VKS clusters with other sources:

- VCFA VKS clusters (service account authentication)
- Static config clusters
- GKE clusters
- Catalog-based clusters

### Service Account Mode

- Automated discovery with automatic RBAC setup
- Dedicated Backstage service account per cluster
- No user authentication required
- Suitable for read-only cluster monitoring and resource inspection

### Multi-Instance

Manage VKS clusters across multiple VCFA environments (e.g. development, staging, production) through a single Backstage instance.
