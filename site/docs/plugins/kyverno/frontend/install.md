# Installing the Kyverno Policy Reports Frontend Plugin

This guide will help you install and set up the Kyverno Policy Reports frontend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage instance
2. Kyverno installed in your Kubernetes cluster(s)
3. The Kyverno Policy Reports backend plugin (`@terasky/backstage-plugin-kyverno-policy-reports-backend`) installed


## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-kyverno-policy-reports
```

### 2. Import Components

Add the necessary imports to your Entity Page file (typically `packages/app/src/components/catalog/EntityPage.tsx`):

```typescript
import { 
  KyvernoPolicyReportsTable, 
  KyvernoOverviewCard,
  // Optional: For Crossplane integration
  KyvernoCrossplanePolicyReportsTable,
  KyvernoCrossplaneOverviewCard
} from '@terasky/backstage-plugin-kyverno-policy-reports';
```

### 3. Add to Entity Page

#### Basic Setup
Add the Kyverno components to your entity page:

```typescript
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ... other grid items ... */}

    <EntitySwitch>
      <EntitySwitch.Case if={isKubernetesAvailable}>
        <Grid item md={6}>
          <KyvernoOverviewCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    {/* ... other grid items ... */}
  </Grid>
);

const serviceEntityPage = (
  <EntityLayout>
    {/* ... other routes ... */}
    
    <EntityLayout.Route path="/kyverno-policy-reports" title="Kyverno Policy Reports">
      <KyvernoPolicyReportsTable />
    </EntityLayout.Route>

    {/* ... other routes ... */}
  </EntityLayout>
);
```

#### Crossplane Integration (Optional)
If you're using Crossplane, add the Crossplane-specific components:

```typescript
const crossplaneOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ... other grid items ... */}

    <EntitySwitch>
      <EntitySwitch.Case if={isKubernetesAvailable}>
        <Grid item md={6}>
          <KyvernoCrossplaneOverviewCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    {/* ... other grid items ... */}
  </Grid>
);

const crossplaneEntityPage = (
  <EntityLayout>
    {/* ... other routes ... */}
    
    <EntityLayout.Route path="/kyverno-policy-reports" title="Kyverno Policy Reports">
      <KyvernoCrossplanePolicyReportsTable />
    </EntityLayout.Route>

    {/* ... other routes ... */}
  </EntityLayout>
);
```

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { kyvernoPolicyReportsPlugin } from '@terasky/backstage-plugin-kyverno-policy-reports/alpha';

export default createApp({
  features: [
    ...
    kyvernoPolicyReportsPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The Kyverno overview card appears on component pages
3. The policy reports tab is accessible
4. Policy data is being properly displayed

## Troubleshooting

Common issues and solutions:

1. **Missing Overview Card**
    - Ensure the component is properly imported
    - Check if `isKubernetesAvailable` returns true
    - Verify the grid layout configuration

2. **No Policy Data**
    - Confirm Kyverno is running in your cluster
    - Check if policy reports are being generated
    - Verify permissions if using the backend plugin

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).
