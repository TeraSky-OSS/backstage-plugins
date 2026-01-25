# Installing the SpectroCloud Backend Plugin

This guide will help you install and set up the SpectroCloud backend plugin in your Backstage instance.

## Prerequisites

Before installing the backend plugin, ensure you have:

1. A working Backstage instance
2. Node.js and npm/yarn installed
3. Access to your Backstage backend configuration
4. SpectroCloud Palette API credentials

## Installation Steps

### 1. Add Required Packages

Install the required packages using your package manager:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-spectrocloud-backend @terasky/backstage-plugin-spectrocloud-common
```

### 2. Add to Backend

Modify your backend entry point (typically `packages/backend/src/index.ts`):

```typescript
// In your backend initialization
backend.add(import('@terasky/backstage-plugin-spectrocloud-backend'));
```

### 3. Configure SpectroCloud Connection

Add the following to your `app-config.yaml`:

```yaml
spectrocloud:
  enablePermissions: false  # Set to true to enable permission checks
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. API endpoints are accessible
4. SpectroCloud API connection works

### Testing the Installation

1. **Check Backend Health**
   ```bash
   curl http://localhost:7007/api/spectrocloud/health
   ```

2. **Test API Endpoint**
   ```bash
   # With a valid cluster UID
   curl http://localhost:7007/api/spectrocloud/clusters/{clusterUid}
   ```

3. **Check Backend Logs**
   Look for successful plugin initialization messages

## Troubleshooting

Common issues and solutions:

### 1. Backend Startup Issues
```bash
# Check backend logs
yarn workspace backend start --verbose
```

### 2. API Connection Issues
- Verify SpectroCloud API URL is correct
- Check API token is valid
- Ensure tenant name is correct
- Review network connectivity

### 3. Permission Framework Issues
- Verify permission framework is enabled in Backstage
- Check permission policy configuration
- Review backend plugin configuration

### 4. Missing Common Package
If you see errors about missing types:
```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-spectrocloud-common
```

## Next Steps

After successful installation:

1. Configure permission policies (if using permissions)
2. Set up MCP actions for AI agents
3. Install the frontend plugin
4. Install the ingestor plugin for catalog entities

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.

