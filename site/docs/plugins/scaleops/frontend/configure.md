# Configuring the ScaleOps Frontend Plugin

This guide covers the frontend-specific configuration options for the ScaleOps plugin.

## Backend Configuration

**Important:** All authentication and API configuration is handled by the backend plugin. See the [Backend Configuration Guide](../backend/configure.md) for:
- ScaleOps authentication setup
- Dashboard link enablement
- API connectivity

The frontend plugin automatically uses the backend API at `/api/scaleops/api/*`.

## Entity Configuration

The frontend plugin displays data for entities with the required annotation.

### Required Annotation

Add to your `catalog-info.yaml`:

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

### Label Selector Format

The `kubernetes-label-selector` annotation should contain Kubernetes labels in the format:

```yaml
# Single label
backstage.io/kubernetes-label-selector: 'app=my-service'

# Multiple labels (AND logic)
backstage.io/kubernetes-label-selector: 'app=my-service,env=prod,tier=backend'
```

## Component Placement

### Dashboard Tab

Add to entity pages in `packages/app/src/components/catalog/EntityPage.tsx`:

```typescript
import { ScaleOpsDashboard, isScaleopsAvailable } from '@terasky/backstage-plugin-scaleops-frontend';

const serviceEntityPage = (
  <EntityLayout>
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

### Summary Card (Optional)

Add to overview page:

```typescript
import { ScaleopsCard } from '@terasky/backstage-plugin-scaleops-frontend';

const overviewContent = (
  <Grid container spacing={3}>
    <Grid item md={6}>
      <ScaleopsCard />
    </Grid>
  </Grid>
);
```

## New Frontend System Configuration (Alpha)

When using the new frontend system, the plugin is configured automatically:

```typescript
import { scaleopsPlugin } from '@terasky/backstage-plugin-scaleops-frontend/alpha';

export default createApp({
  features: [
    scaleopsPlugin,
  ],
});
```

No manual route configuration needed - the plugin automatically appears on entities with the correct annotation.

## Display Customization

### Tab Title

Customize the tab title:

```typescript
<EntityLayout.Route 
  path="/scaleops" 
  if={isScaleopsAvailable}
  title="Cost Optimization"  // Custom title
>
  <ScaleOpsDashboard />
</EntityLayout.Route>
```

### Conditional Display

The `isScaleopsAvailable` function checks for the `kubernetes-label-selector` annotation. The tab only appears when this annotation is present.

## Best Practices

### Entity Annotations

1. **Label Accuracy**
   - Ensure labels match your Kubernetes workloads exactly
   - Use the same labels ScaleOps uses to track workloads
   - Test labels against your cluster

2. **Label Specificity**
   - Use specific labels to avoid matching unrelated workloads
   - Include environment labels when appropriate
   - Document label meanings in entity descriptions

### UI Integration

1. **Tab Placement**
   - Place near other operations/monitoring tabs
   - Use consistent naming across services
   - Consider your team's workflow

2. **Component Selection**
   - Use dashboard for detailed analysis
   - Use card for quick overview
   - Consider both on important services

## Troubleshooting

### Tab Not Appearing

**Issue:** ScaleOps tab doesn't show on entity page

**Solutions:**
1. Verify `backstage.io/kubernetes-label-selector` annotation exists
2. Check annotation format is correct
3. Ensure `isScaleopsAvailable` condition is used
4. Check browser console for errors

### No Data Displayed

**Issue:** Tab appears but shows no data

**Solutions:**
1. Verify backend plugin is installed and configured
2. Check entity labels match ScaleOps workloads
3. Verify ScaleOps has data for those labels
4. Check browser console for API errors
5. Verify backend authentication is working

### Dashboard Links Not Working

**Issue:** "View Dashboard" links don't work

**Solution:**
- Enable dashboard links in backend configuration:
  ```yaml
  scaleops:
    linkToDashboard: true
  ```

For backend configuration issues, see the [Backend Configuration Guide](../backend/configure.md).
