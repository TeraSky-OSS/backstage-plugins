# Installing VCF Operations Frontend Plugin

This guide walks you through installing the VCF Operations Frontend plugin in your Backstage application.

## Prerequisites
- VCF Operations Backend plugin installed and configured

## Installation Steps

### 1. Install the Package

Add the frontend plugin to your Backstage application:

```bash
# From your Backstage root directory
yarn --cwd packages/app add @terasky/backstage-plugin-vcf-operations
```
  
### 2. Add to Entity Pages

Add VCF Operations tabs to relevant entity pages in `packages/app/src/components/catalog/EntityPage.tsx`:

#### For Virtual Machine Entities

```typescript
import { VCFOperationsExplorerComponent } from '@terasky/backstage-plugin-vcf-operations';
import { isKind } from '@backstage/plugin-catalog';

// Add to VM entity pages
const vmEntityPage = (
  <EntityPageLayout>
    <EntityPageLayout.Route path="/" title="Overview">
      <EntityOrphanWarning />
      <Grid container spacing={3} alignItems="stretch">
        {/* ... other overview content */}
      </Grid>
    </EntityPageLayout.Route>
    
    {/* Add VCF Operations tab */}
    <EntityPageLayout.Route path="/vcf-operations" title="Metrics">
      <VCFOperationsExplorerComponent />
    </EntityPageLayout.Route>
    
    {/* ... other tabs */}
  </EntityPageLayout>
);

// Update entity page routing
const entityPage = (
  <EntitySwitch>
    {/* ... other cases */}
    <EntitySwitch.Case if={isKind('component')} children={componentPage} />
    <EntitySwitch.Case if={isKind('system')} children={systemPage} />
    
    {/* Add VM support */}
    <EntitySwitch.Case 
      if={entity => entity.metadata.tags?.includes('kind:virtualmachine')}
      children={vmEntityPage} 
    />
    
    <EntitySwitch.Case children={defaultEntityPage} />
  </EntitySwitch>
);
```

#### For Project and Namespace Entities

```typescript
// For VCF Automation projects
const projectEntityPage = (
  <EntityPageLayout>
    {/* ... other tabs */}
    <EntityPageLayout.Route path="/vcf-operations" title="Operations Metrics">
      <VCFOperationsExplorerComponent />
    </EntityPageLayout.Route>
  </EntityPageLayout>
);

// Update routing for domains
<EntitySwitch.Case 
  if={entity => entity.kind === 'Domain' && entity.spec?.type === 'vcf-automation-project'}
  children={projectEntityPage} 
/>
```

## Verification

### 1. Start the Frontend

Start your Backstage frontend to ensure the plugin loads correctly:

```bash
yarn start
```

### 2. Check Plugin Registration

Verify the plugin appears in your Backstage instance:

1. Navigate to an entity with VCF Operations support
2. Look for the "Metrics" or "VCF Operations" tab
3. Check that the tab loads without errors

### 3. Test Functionality

Test the core functionality:

1. Select different metrics categories
2. Try different time ranges and aggregation options
3. Verify auto-refresh functionality
4. Test manual refresh button

## Common Installation Issues

### Permission Errors

If you see permission denied errors:

1. Verify backend plugin is installed and configured
2. Check permission configuration in app-config.yaml
3. Ensure user has required permissions

### Component Not Found Errors

If components don't load:

```bash
# Verify plugin packages are installed
yarn list @terasky/backstage-plugin-vcf-operations
yarn list @terasky/backstage-plugin-vcf-operations-common

# Reinstall if necessary
yarn cache clean
yarn install
```

### Theme Integration Issues

If styling appears broken:

1. Ensure Material-UI version compatibility
2. Check for theme conflicts
3. Verify CSS import order
4. Test with default Backstage theme

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { vcfOperationsPlugin } from '@terasky/backstage-plugin-vcf-operations/alpha';

export default createApp({
  features: [
    ...
    vcfOperationsPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## Next Steps

After successful installation:

1. **[Configure the Frontend](configure.md)** - Set up component options and permissions
2. **Test Integration** - Verify functionality with your VCF Operations environment
3. **Customize Styling** - Adapt the interface to match your organization's branding
4. **Train Users** - Provide documentation and training for end users

## Getting Help

If you encounter issues during installation:

1. Verify all prerequisites are met
2. Review browser console for detailed error messages
3. Ensure backend plugin is properly configured
4. Test with a minimal configuration first

The VCF Operations Frontend plugin provides a powerful interface for infrastructure monitoring - once installed and configured, your teams can start monitoring VCF Operations metrics directly within Backstage!