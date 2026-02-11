# Installing the Template Builder Frontend Plugin

This guide will help you install and set up the Template Builder frontend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage instance (version 1.30.0 or higher)
2. Access to modify your Backstage frontend configuration
3. The Backstage Scaffolder plugin installed and configured

## Installation Steps

### 1. Add the Package

Install the plugin package using your package manager:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-template-builder
```

### 2. Add Route (New Frontend System - Alpha)

The plugin supports the new frontend system. Add it to your app:

```typescript
// packages/app/src/App.tsx
import { createApp } from '@backstage/frontend-defaults';
import { templateBuilderPlugin } from '@terasky/backstage-plugin-template-builder/alpha';

export default createApp({
  features: [
    // ... other features
    templateBuilderPlugin,
  ],
});
```

This will automatically register the `/template-builder` route.

### 3. Add Route (Legacy System)

If using the legacy routing system, add the route manually:

```typescript
// packages/app/src/App.tsx
import { TemplateBuilderPage } from '@terasky/backstage-plugin-template-builder';

// Add to your routes
<Route path="/template-builder" element={<TemplateBuilderPage />} />
```

### 4. Add Entity Action (Optional)

To enable quick access from template entity pages, add the entity action:

```typescript
// packages/app/src/components/catalog/EntityPage.tsx
import { TemplateEditorCard } from '@terasky/backstage-plugin-template-builder';

// In your template entity page
const templatePage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {/* ... other cards ... */}
        
        <Grid item md={12}>
          <TemplateEditorCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The `/template-builder` route is accessible
3. The editor loads without errors
4. Field extensions are properly discovered
5. Actions appear in the action palette

## Next Steps

After successful installation, proceed to:

- [Configuration Guide](./configure.md) - Configure default settings
- [Overview](../overview.md) - Learn about all features

## Support

For additional help:

- Check the [GitHub Issues](https://github.com/TeraSky-OSS/backstage-plugins/issues)
- Review the plugin documentation
- Contact the TeraSky support team
