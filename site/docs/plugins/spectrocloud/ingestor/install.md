# Installing the SpectroCloud Ingestor Plugin

This guide will help you install and set up the SpectroCloud ingestor plugin in your Backstage instance.

## Prerequisites

Before installing the ingestor plugin, ensure you have:

1. A working Backstage instance
2. Node.js and npm/yarn installed
3. Access to your Backstage backend configuration
4. SpectroCloud Palette API credentials

## Installation Steps

### 1. Add Required Package

Install the required package using your package manager:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-spectrocloud-ingestor
```

### 2. Add to Backend

Modify your backend entry point (typically `packages/backend/src/index.ts`):

```typescript
// In your backend initialization
backend.add(import('@terasky/backstage-plugin-spectrocloud-ingestor'));
```

### 3. Configure SpectroCloud Connection

Add the following to your `app-config.yaml`:

```yaml
spectrocloud:
  environments:
    - name: production
      url: https://api.spectrocloud.com
      tenant: my-tenant
      apiToken: ${SPECTROCLOUD_API_TOKEN}
      catalogProvider:
        enabled: true
        refreshIntervalSeconds: 600
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. Entities appear in the catalog after the refresh interval
4. Entity relationships are properly created

### Testing the Installation

1. **Check Backend Logs**
   Look for messages like:
   ```
   SpectroCloud entity provider initialized
   SpectroCloud: Discovered X projects, Y profiles, Z clusters
   ```

2. **View Catalog Entities**
   - Navigate to the Backstage catalog
   - Filter by `type:spectrocloud-cluster` or `type:spectrocloud-cluster-profile`
   - Verify entities have correct annotations

3. **Check Entity Relationships**
   - Open a cluster entity
   - Verify it shows the parent system (project)
   - Check profile references in annotations

## Troubleshooting

Common issues and solutions:

### 1. No Entities Appearing
- Verify SpectroCloud API credentials
- Check `catalogProvider.enabled` is `true`
- Wait for the refresh interval to complete
- Check backend logs for errors

### 2. Backend Startup Issues
```bash
# Check backend logs with verbose output
yarn workspace backend start --verbose
```

### 3. API Connection Issues
- Verify SpectroCloud API URL is correct
- Check API token is valid and has read permissions
- Ensure tenant name is correct
- Review network connectivity

### 4. Duplicate Entities
- If using multiple instances, ensure unique `name` values
- Check annotation prefix is consistent
- Review entity naming conventions

## Next Steps

After successful installation:

1. Configure catalog provider options
2. Set up entity refresh schedules
3. Install the frontend plugin for visualization
4. Install the backend plugin for API access

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.

