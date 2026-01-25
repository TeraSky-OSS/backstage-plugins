# Installing the SpectroCloud Frontend Plugin

This guide will help you install and set up the SpectroCloud frontend plugin in your Backstage instance.

## Prerequisites

Before installing the frontend plugin, ensure you have:

1. A working Backstage instance
2. Node.js and npm/yarn installed
3. The SpectroCloud backend plugin installed
4. The SpectroCloud ingestor plugin installed (for catalog entities)
5. SpectroCloud cluster and profile entities in your catalog

## Installation Steps

### 1. Add Required Packages

Install the required package using your package manager:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-spectrocloud
```

### 2. Add Entity Cards (New Frontend System)

If using the new frontend system, add to your `packages/app/src/App.tsx`:

```typescript
import { createApp } from '@backstage/frontend-defaults';

const app = createApp({
  features: [
    // ... other features
    import('@terasky/backstage-plugin-spectrocloud/alpha'),
  ],
});
```

### 3. Add Entity Cards (Legacy System)

If using the legacy frontend system, add to your entity page:

```typescript
// packages/app/src/components/catalog/EntityPage.tsx
import {
  SpectroCloudClusterCard,
  SpectroCloudClusterProfileCard,
} from '@terasky/backstage-plugin-spectrocloud';

// Add to your cluster resource page
const spectroCloudClusterPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SpectroCloudClusterCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);

// Add to your profile resource page
const spectroCloudProfilePage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SpectroCloudClusterProfileCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

### 4. Configure Entity Page Routing

Add routing for SpectroCloud entity types:

```typescript
// In your EntityPage.tsx
case 'spectrocloud-cluster':
  return spectroCloudClusterPage;
case 'spectrocloud-cluster-profile':
  return spectroCloudProfilePage;
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The app builds without errors
3. Cluster and profile cards render correctly
4. Data loads from the backend API

### Testing the Installation

1. **Navigate to a SpectroCloud Cluster Entity**
   - Verify the cluster card displays
   - Check that cluster information is shown
   - Test the kubeconfig download button

2. **Navigate to a SpectroCloud Profile Entity**
   - Verify the profile card displays
   - Check version information
   - Test expanding cluster lists

## Troubleshooting

Common issues and solutions:

### 1. Cards Not Showing
- Verify entity has correct `spec.type` (`spectrocloud-cluster` or `spectrocloud-cluster-profile`)
- Check entity annotations are present
- Verify backend plugin is running

### 2. Data Not Loading
- Check browser console for API errors
- Verify backend plugin is accessible
- Check network connectivity

### 3. Permission Errors
- Verify permission configuration
- Check user has required permissions
- Review backend logs for permission denials

## Next Steps

After successful installation:

1. Configure permissions (optional but recommended)
2. Customize card appearance if needed
3. Set up proper entity pages for your use case

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.

