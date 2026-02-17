# Configuring the SpectroCloud Frontend Plugin

The SpectroCloud frontend plugin can be configured to customize its behavior and integrate with Backstage's permission framework.

## Configuration Options

Add the following to your `app-config.yaml`:

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io  # Optional, default value
  enablePermissions: true  # Enable permission checks

kubernetesIngestor:
  annotationPrefix: terasky.backstage.io  # Optional, for Kubernetes Resources tab
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `annotationPrefix` | string | `terasky.backstage.io` | Prefix used for SpectroCloud entity annotations |
| `enablePermissions` | boolean | `false` | Enable frontend permission checks |
| `kubernetesIngestor.annotationPrefix` | string | - | Fallback annotation prefix for Kubernetes Resources tab |

## Permission Configuration

### Available Permissions

The frontend respects the following permissions:

| Permission | Description | Controls |
|------------|-------------|----------|
| `spectrocloud.cluster.view-info` | View cluster information | Cluster card visibility, cluster viewer |
| `spectrocloud.cluster.download-kubeconfig` | Download kubeconfig | Download button in cards and viewer |
| `spectrocloud.cluster.view-pack-values` | View pack values | Pack expansion and values viewing |
| `spectrocloud.cluster.view-pack-manifests` | View pack manifests | Manifest tabs in pack viewer |
| `spectrocloud.cluster.create` | Create clusters | Cluster deployment page access |
| `spectrocloud.profile.view-info` | View profile information | Profile card visibility |
| `spectrocloud.profile.view-clusters` | View clusters for profile | Cluster list expansion in profile card |

### Enabling Permissions

To enable permission checks:

1. **Enable in config**:
```yaml
spectrocloud:
  enablePermissions: true
```

2. **Configure permission policies** (using RBAC plugin):
```csv
# Developers - read-only access
p, role:default/developers, spectrocloud.cluster.view-info, read, allow
p, role:default/developers, spectrocloud.profile.view-info, read, allow

# Platform Team - full access
p, role:default/platform-team, spectrocloud.cluster.view-info, read, allow
p, role:default/platform-team, spectrocloud.cluster.download-kubeconfig, read, allow
p, role:default/platform-team, spectrocloud.cluster.view-pack-values, read, allow
p, role:default/platform-team, spectrocloud.cluster.view-pack-manifests, read, allow
p, role:default/platform-team, spectrocloud.cluster.create, create, allow
p, role:default/platform-team, spectrocloud.profile.view-info, read, allow
p, role:default/platform-team, spectrocloud.profile.view-clusters, read, allow
```

## Entity Card Configuration

### Cluster Card

The cluster card automatically displays for entities with:
- `kind: Resource`
- `spec.type: spectrocloud-cluster`

Required annotations:
```yaml
metadata:
  annotations:
    terasky.backstage.io/cluster-id: <cluster-uid>
    terasky.backstage.io/project-id: <project-uid>  # Optional, for project-scoped clusters
    terasky.backstage.io/instance: <instance-name>  # Optional, for multi-instance setups
```

Additional annotations used by the card:
```yaml
metadata:
  annotations:
    terasky.backstage.io/cloud-type: eks|aws|aks|azure|vsphere
    terasky.backstage.io/state: Running|Pending|Failed|...
    terasky.backstage.io/kubernetes-version: "1.28.5"
    terasky.backstage.io/scope: project|tenant
    terasky.backstage.io/project-name: "My Project"
    terasky.backstage.io/cluster-profile-refs: '[{"name":"profile","uid":"version-uid"}]'
```

### Profile Card

The profile card automatically displays for entities with:
- `kind: Resource`
- `spec.type: spectrocloud-cluster-profile`

Required annotations:
```yaml
metadata:
  annotations:
    terasky.backstage.io/profile-id: <profile-uid>
    terasky.backstage.io/project-id: <project-uid>  # Optional, for project-scoped profiles
    terasky.backstage.io/instance: <instance-name>  # Optional, for multi-instance setups
```

Additional annotations used by the card:
```yaml
metadata:
  annotations:
    terasky.backstage.io/profile-type: infra|add-on|cluster
    terasky.backstage.io/cloud-type: eks|aws|aks|azure|vsphere
    terasky.backstage.io/scope: project|tenant
    terasky.backstage.io/profile-status: published|draft
    terasky.backstage.io/version: "1.0.0"
    terasky.backstage.io/latest-version: "1.1.0"
    terasky.backstage.io/profile-versions: '[{"uid":"v1","version":"1.0.0"}]'
```

### Kubernetes Resources Tab

The Kubernetes Resources tab displays for entities with:
- `kind: Resource`
- `spec.type: spectrocloud-cluster`
- `backstage.io/kubernetes-cluster` annotation or `cluster:<cluster-name>` tag

Required configuration:
```yaml
metadata:
  annotations:
    backstage.io/kubernetes-cluster: <cluster-name>
    # OR use tags:
  tags:
    - cluster:<cluster-name>
```

The tab supports filtering and viewing Kubernetes resources, including:
- Standard Kubernetes resources
- Crossplane claims and composites
- KRO (Kubernetes Resource Orchestrator) instances

## Page Configuration

### Cluster Viewer Page

The cluster viewer page is available at `/spectrocloud/clusters` and provides:
- List and card view of all accessible clusters
- Filtering by project, cloud type, status, and Kubernetes version
- "Updates Available" filter to identify clusters behind latest profile versions
- Kubeconfig download (permission-controlled)
- Direct links to cluster entity pages

### Cluster Deployment Page

The cluster deployment page is available at `/spectrocloud/deploy` and provides a wizard for creating new clusters:

Supported cloud types:
- **Amazon EKS**: Managed Kubernetes on AWS
- **AWS (PXK)**: Palette eXtended Kubernetes on AWS
- **Azure AKS**: Managed Kubernetes on Azure
- **Azure (PXK)**: Palette eXtended Kubernetes on Azure
- **vSphere**: VMware vSphere clusters with PCG/overlord support

The page requires the `spectrocloud.cluster.create` permission when permissions are enabled.

## Customization

### Custom Annotation Prefix

If using a different annotation prefix:

```yaml
spectrocloud:
  annotationPrefix: mycompany.backstage.io
```

Ensure the ingestor plugin uses the same prefix.

### Kubernetes Resources Configuration

The Kubernetes Resources tab can use either the `spectrocloud.annotationPrefix` or fall back to `kubernetesIngestor.annotationPrefix`:

```yaml
spectrocloud:
  annotationPrefix: mycompany.backstage.io

kubernetesIngestor:
  annotationPrefix: mycompany.backstage.io  # Fallback for K8s resources
```

The annotation resolution order is:
1. `spectrocloud.annotationPrefix`
2. `kubernetesIngestor.annotationPrefix` (fallback)
3. `terasky.backstage.io` (default)

## Integration with Authentication

The frontend integrates with `@terasky/backstage-plugin-spectrocloud-auth` for authentication:

1. **OIDC Tokens**: Uses OAuth2/OIDC for user authentication
2. **Session Tokens**: Supports HS256 session tokens for SpectroCloud API
3. **Headers**: Sends `X-SpectroCloud-Token` and `X-SpectroCloud-User-Email`
4. **Re-authentication**: Handles `X-SpectroCloud-ReAuth-Required` responses

## Best Practices

### Security
1. Enable permissions in production environments
2. Use least-privilege permission policies
3. Restrict cluster creation permission to authorized users
4. Regularly audit kubeconfig download access
5. Review who has access to pack values and manifests

### Performance
1. The frontend fetches data on-demand from the backend
2. Use the refresh button to get latest data
3. Pack content is loaded lazily when expanded
4. Cluster viewer applies client-side filtering for responsiveness
5. Profile metadata is cached during deployment wizard

### User Experience
1. Provide clear permission feedback to users
2. Document which roles have which permissions
3. Use meaningful profile and cluster names
4. Add descriptive titles to entities for better searchability
5. Configure appropriate refresh intervals for catalog data

## Troubleshooting

### Common Issues

1. **Card Shows "Loading" Forever**
   - Check backend plugin is running
   - Verify API endpoint is accessible
   - Check browser network tab for errors
   - Confirm entity has required annotations

2. **Permission Denied Messages**
   - Verify `enablePermissions` is set correctly
   - Check user's permission policies
   - Review backend logs
   - Confirm RBAC configuration is correct

3. **Missing Data**
   - Verify entity has required annotations
   - Check annotation prefix matches config
   - Ensure backend can reach SpectroCloud API
   - Check instance name matches in annotations and config

4. **Cluster Deployment Page Not Accessible**
   - Verify user has `spectrocloud.cluster.create` permission
   - Check authentication is working correctly
   - Review backend API connectivity
   - Ensure projects and cloud accounts are configured

5. **Kubernetes Resources Tab Not Showing**
   - Verify entity has `backstage.io/kubernetes-cluster` annotation or `cluster:` tag
   - Check Kubernetes ingestor is running
   - Confirm resources are being ingested into catalog
   - Review annotation prefix configuration

6. **Authentication Issues**
   - Check `X-SpectroCloud-ReAuth-Required` header in network tab
   - Verify OIDC tokens are valid
   - Confirm auth backend is configured correctly
   - Check cookie settings for `spectrocloud-api-token`

