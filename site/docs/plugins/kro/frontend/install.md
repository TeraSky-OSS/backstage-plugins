# Installing the KRO Resources Frontend Plugin

## Prerequisites

- Backstage application
- KRO Resources backend plugin (`@terasky/backstage-plugin-kro-resources-backend`)
- Kubernetes plugin

## Installation Steps

1. Install the plugin package:

```bash
# From your Backstage root directory
yarn add --cwd packages/app @terasky/backstage-plugin-kro-resources-frontend
```

### 2. Import Components

Add the necessary imports to your Entity Page file (typically `packages/app/src/components/catalog/EntityPage.tsx`):

```typescript
import { 
    IfKroOverviewAvailable, 
    IfKroResourceGraphAvailable, 
    IfKroResourcesListAvailable, 
    isKroAvailable, 
    KroOverviewCard, 
    KroResourceGraph, 
    KroResourceTable, 
    useKroResourceListAvailable, 
    useKroResourceGraphAvailable 
} from '@terasky/backstage-plugin-kro-resources-frontend';

```

### 3. Configure the Entity Page

Add the KRO components to your Entity Page:

```typescript
const kroOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <IfKroOverviewAvailable>
      <Grid item md={6}>
        <KroOverviewCard />
      </Grid>
    </IfKroOverviewAvailable>
    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
  </Grid>
);

// Create the KRO entity page component with permission checks
const KroEntityPage = () => {
  const isKroResourceListAvailable = useKroResourceListAvailable();
  const isKroResourceGraphAvailable = useKroResourceGraphAvailable();

  return (
    <EntityLayout>
      <EntityLayout.Route path="/" title="Overview">
        {kroOverviewContent}
      </EntityLayout.Route>

      <EntityLayout.Route if={isKroResourceListAvailable} path="/kro-resources" title="KRO Resources">
        <IfKroResourcesListAvailable>
          <KroResourceTable />
        </IfKroResourcesListAvailable>
      </EntityLayout.Route>

      <EntityLayout.Route if={isKroResourceGraphAvailable} path="/kro-graph" title="KRO Graph">
        <IfKroResourceGraphAvailable>
          <KroResourceGraph />
        </IfKroResourceGraphAvailable>
      </EntityLayout.Route>
    </EntityLayout>
  );
};
```

### 4. Add to Entity Switch

Include the KRO entity page in your entity switch:

```typescript
const componentPage = (
  <EntitySwitch>
    {/* ... other cases ... */}
    <EntitySwitch.Case if={isComponentType('kro-instance')}>
      <KroEntityPage />
    </EntitySwitch.Case>
  </EntitySwitch>
);
```

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { kroResourcesPlugin } from '@terasky/backstage-plugin-kro-resources-frontend/alpha';

export default createApp({
  features: [
    ...
    kroResourcesPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The components are properly imported in your Entity Page
3. The KRO tabs appear for appropriate entity types
4. The permission checks are working as expected

## Troubleshooting

Common issues and solutions:

1. **Missing Tabs**: Ensure the entity has the correct component type
2. **Permission Issues**: Verify the permissions backend is properly configured
3. **Resource Loading**: Check the Kubernetes Ingestor configuration
