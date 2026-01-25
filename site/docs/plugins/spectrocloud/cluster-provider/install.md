# Installing the SpectroCloud Cluster Provider Plugin

This guide will help you install and set up the SpectroCloud cluster provider plugin.

## Prerequisites

1. A working Backstage instance
2. The Backstage Kubernetes plugin installed
3. SpectroCloud Palette API credentials

## Installation Steps

### 1. Add Required Package

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-spectrocloud-cluster-provider
```

### 2. Add to Backend

Modify `packages/backend/src/index.ts`:

```typescript
backend.add(import('@terasky/backstage-plugin-spectrocloud-cluster-provider'));
```

### 3. Configure SpectroCloud

Add to your `app-config.yaml`:

```yaml
spectrocloud:
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      clusterProvider:
        includeProjects: [production]
```

## Verification

After installation:

1. Check backend logs for cluster discovery messages
2. Navigate to a component with Kubernetes resources
3. Verify SpectroCloud clusters appear

### Testing

Look for log messages like:
```
SpectroCloud: Discovered X clusters
SpectroCloud: Created RBAC for cluster Y
```

## Troubleshooting

### Common Issues

1. **No Clusters Found**
   - Verify API credentials
   - Check project filters
   - Review network connectivity

2. **RBAC Setup Failures**
   - Verify kubeconfig has admin access
   - Check cluster connectivity
   - Review backend logs

## Next Steps

1. Configure [project filtering](./configure.md)
2. Customize [RBAC settings](./configure.md#rbac-customization)

