# Configuring the SpectroCloud Frontend Plugin

The SpectroCloud frontend plugin can be configured to customize its behavior and integrate with Backstage's permission framework.

## Configuration Options

Add the following to your `app-config.yaml`:

```yaml
spectrocloud:
  annotationPrefix: terasky.backstage.io  # Optional, default value
  enablePermissions: true  # Enable permission checks
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `annotationPrefix` | string | `terasky.backstage.io` | Prefix used for SpectroCloud entity annotations |
| `enablePermissions` | boolean | `false` | Enable frontend permission checks |

## Permission Configuration

### Available Permissions

The frontend respects the following permissions:

| Permission | Description | Controls |
|------------|-------------|----------|
| `spectrocloud.cluster.view-info` | View cluster information | Cluster card visibility |
| `spectrocloud.cluster.download-kubeconfig` | Download kubeconfig | Download button |
| `spectrocloud.cluster.view-pack-values` | View pack values | Pack expansion |
| `spectrocloud.cluster.view-pack-manifests` | View pack manifests | Manifest tabs |
| `spectrocloud.profile.view-info` | View profile information | Profile card visibility |
| `spectrocloud.profile.view-clusters` | View clusters for profile | Cluster list expansion |

### Enabling Permissions

To enable permission checks:

1. **Enable in config**:
```yaml
spectrocloud:
  enablePermissions: true
```

2. **Configure permission policies** (using RBAC plugin):
```csv
p, role:default/developers, spectrocloud.cluster.view-info, read, allow
p, role:default/developers, spectrocloud.profile.view-info, read, allow
p, role:default/platform-team, spectrocloud.cluster.download-kubeconfig, read, allow
p, role:default/platform-team, spectrocloud.cluster.view-pack-values, read, allow
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
    terasky.backstage.io/project-id: <project-uid>  # Optional
    terasky.backstage.io/instance: <instance-name>  # Optional
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
    terasky.backstage.io/project-id: <project-uid>  # Optional
    terasky.backstage.io/instance: <instance-name>  # Optional
```

## Customization

### Custom Annotation Prefix

If using a different annotation prefix:

```yaml
spectrocloud:
  annotationPrefix: mycompany.backstage.io
```

Ensure the ingestor plugin uses the same prefix.

## Best Practices

### Security
1. Enable permissions in production environments
2. Use least-privilege permission policies
3. Regularly audit kubeconfig download access

### Performance
1. The frontend fetches data on-demand from the backend
2. Use the refresh button to get latest data
3. Pack content is loaded lazily when expanded

### User Experience
1. Provide clear permission feedback to users
2. Document which roles have which permissions
3. Use meaningful profile and cluster names

## Troubleshooting

### Common Issues

1. **Card Shows "Loading" Forever**
   - Check backend plugin is running
   - Verify API endpoint is accessible
   - Check browser network tab for errors

2. **Permission Denied Messages**
   - Verify `enablePermissions` is set correctly
   - Check user's permission policies
   - Review backend logs

3. **Missing Data**
   - Verify entity has required annotations
   - Check annotation prefix matches config
   - Ensure backend can reach SpectroCloud API

