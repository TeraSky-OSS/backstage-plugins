# Installing the Crossplane Resources Frontend Plugin

This guide will help you install and set up the Crossplane Resources frontend plugin in your Backstage instance.

## Prerequisites

Before installing the frontend plugin, ensure you have:

1. A working Backstage instance
2. The Kubernetes Ingestor plugin installed and configured
3. The Crossplane Resources backend plugin (`@terasky/backstage-plugin-crossplane-resources-backend`) installed

## Installation Steps

### 1. Add the Package

Install the frontend plugin package using your package manager:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-crossplane-resources-frontend
```

### 2. Import Components

Add the necessary imports to your Entity Page file (typically `packages/app/src/components/catalog/EntityPage.tsx`):

```typescript
import {
  CrossplaneResourcesTableSelector,
  CrossplaneOverviewCardSelector,
  CrossplaneResourceGraphSelector,
  useResourceGraphAvailable,
  useResourcesListAvailable,
  IfCrossplaneOverviewAvailable,
  IfCrossplaneResourceGraphAvailable,
  IfCrossplaneResourcesListAvailable,
} from '@terasky/backstage-plugin-crossplane-resources-frontend';
```

### 3. Configure the Entity Page

Add the Crossplane components to your Entity Page:

```typescript
const crossplaneOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <IfCrossplaneOverviewAvailable>
      <Grid item md={6}>
        <CrossplaneOverviewCardSelector />
      </Grid>
    </IfCrossplaneOverviewAvailable>
    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
  </Grid>
);

// Create the Crossplane entity page component with permission checks
const CrossplaneEntityPage = () => {
  const isResourcesListAvailable = useResourcesListAvailable();
  const isResourceGraphAvailable = useResourceGraphAvailable();

  return (
    <EntityLayout>
      <EntityLayout.Route path="/" title="Overview">
        {crossplaneOverviewContent}
      </EntityLayout.Route>

      <EntityLayout.Route if={isResourcesListAvailable} path="/crossplane-resources" title="Crossplane Resources">
        <IfCrossplaneResourcesListAvailable>
          <CrossplaneResourcesTableSelector />
        </IfCrossplaneResourcesListAvailable>
      </EntityLayout.Route>

      <EntityLayout.Route if={isResourceGraphAvailable} path="/crossplane-graph" title="Crossplane Graph">
        <IfCrossplaneResourceGraphAvailable>
          <CrossplaneResourceGraphSelector />
        </IfCrossplaneResourceGraphAvailable>
      </EntityLayout.Route>
    </EntityLayout>
  );
};
```

### 4. Add to Entity Switch

Include the Crossplane entity page in your entity switch:

```typescript
const componentPage = (
  <EntitySwitch>
    {/* ... other cases ... */}
    <EntitySwitch.Case if={isComponentType('crossplane-claim')}>
      <CrossplaneEntityPage />
    </EntitySwitch.Case>
    <EntitySwitch.Case if={isComponentType('crossplane-xr')}>
      <CrossplaneEntityPage />
    </EntitySwitch.Case>
  </EntitySwitch>
);
```

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { crossplaneResourcesPlugin } from '@terasky/backstage-plugin-crossplane-resources-frontend/alpha';

export default createApp({
  features: [
    ...
    crossplaneResourcesPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The components are properly imported in your Entity Page
3. The Crossplane tabs appear for appropriate entity types
4. The permission checks are working as expected

## Troubleshooting

Common issues and solutions:

1. **Missing Tabs**: Ensure the entity has the correct component type
2. **Permission Issues**: Verify the permissions backend is properly configured
3. **Resource Loading**: Check the Kubernetes Ingestor configuration
