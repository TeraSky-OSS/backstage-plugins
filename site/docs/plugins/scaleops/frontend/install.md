# Installing the ScaleOps Frontend Plugin

This guide will help you install and set up the ScaleOps frontend plugin in your Backstage instance.

## Prerequisites

Before installing the frontend plugin, ensure you have:

1. A working Backstage instance
2. **ScaleOps Backend Plugin** installed and configured (required)
3. Access to a ScaleOps instance

## Installation Steps

### 1. Install Backend Plugin First

The frontend plugin requires the backend plugin to be installed and configured. See the [Backend Installation Guide](../backend/install.md) if not already done.

### 2. Add the Frontend Package

Install the plugin package:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-scaleops-frontend
```

### 3. Add to Entity Page

Modify your entity page configuration in `packages/app/src/components/catalog/EntityPage.tsx`:

```typescript
import { ScaleOpsDashboard, isScaleopsAvailable } from '@terasky/backstage-plugin-scaleops-frontend';

const serviceEntityPage = (
  <EntityLayout>
    {/* ... other routes ... */}
    
    <EntityLayout.Route 
      path="/scaleops" 
      if={isScaleopsAvailable}
      title="ScaleOps"
    >
      <ScaleOpsDashboard />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### 4. (Optional) Add Summary Card

Add the ScaleOps card to your overview page:

```typescript
import { ScaleopsCard } from '@terasky/backstage-plugin-scaleops-frontend';

const overviewContent = (
  <Grid container spacing={3}>
    {/* ... other cards ... */}
    
    <Grid item md={6}>
      <ScaleopsCard />
    </Grid>
  </Grid>
);
```

### 5. Configure Entity Annotations

Add the required annotation to your component entities in `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    backstage.io/kubernetes-label-selector: 'app=my-service,env=prod'
spec:
  type: service
  lifecycle: production
```

## New Frontend System Support (Alpha)

The plugin supports the new frontend system available in the `/alpha` export:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { scaleopsPlugin } from '@terasky/backstage-plugin-scaleops-frontend/alpha';

export default createApp({
  features: [
    // ... other features
    scaleopsPlugin,
  ],
});
```

This automatically integrates the plugin into appropriate entity pages without manual route configuration.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The ScaleOps tab appears on entities with the kubernetes label selector annotation
3. Cost data is being displayed correctly
4. Dashboard links work (if enabled in backend config)

### Testing the Installation

1. **Check Entity Page**
   - Navigate to a component with `backstage.io/kubernetes-label-selector` annotation
   - Look for the "ScaleOps" tab
   - Verify data loads without errors

2. **Check Browser Console**
   - No error messages related to ScaleOps
   - API calls to `/api/scaleops/api/*` succeed

## Next Steps

After successful installation:

1. Configure backend plugin settings (see [Backend Configuration](../backend/configure.md))
2. Add annotations to more entities
3. Enable dashboard links (optional)
4. Start monitoring costs and optimizations

For configuration options, proceed to the [Configuration Guide](./configure.md).
