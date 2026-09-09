# Installing the DevPod Frontend Plugin

This guide will help you install and set up the DevPod frontend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage instance
2. DevPod installed on your development machine(s)
3. Access to modify your Backstage frontend configuration
4. [Backstage UI](https://ui.backstage.io) styles loaded in your app — this plugin's components are built with `@backstage/ui`, which requires `import '@backstage/ui/css/styles.css';` somewhere in your app's entry point (e.g. `packages/app/src/index.tsx`). Most recent Backstage apps already have this from the `new-frontend-plugin` app template; if the plugin's components render unstyled, add the import.

## Installation Steps

### 1. Add the Package

Install the plugin package using your package manager:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-devpod
```

### 2. Import Components

Add the necessary imports to your Entity Page file (typically `packages/app/src/components/catalog/EntityPage.tsx`):

```typescript
import { DevpodComponent, isDevpodAvailable } from '@terasky/backstage-plugin-devpod';
```

### 3. Add to Entity Page

Add the DevPod component to your overview content:

```typescript
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ... other grid items ... */}

    <EntitySwitch>
      <EntitySwitch.Case if={isDevpodAvailable}>
        <Grid item md={6}>
          <DevpodComponent />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    {/* ... other grid items ... */}
  </Grid>
);
```

## New Frontend System Support (Alpha)

The plugin now supports the new frontend system available in the `/alpha` export. To use this:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { devpodPlugin } from '@terasky/backstage-plugin-devpod/alpha';

export default createApp({
  features: [
    ...
    devpodPlugin,
    ...
  ],
});
```

This replaces the need for manual route configuration in `EntityPage.tsx` and other files. The plugin will be automatically integrated into the appropriate entity pages.

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The DevPod button appears on component overview pages
3. The IDE selection functionality works correctly
4. The CLI command display is accurate

## Troubleshooting

Common issues and solutions:

1. **Missing DevPod Button**
    - Ensure the component is properly imported
    - Check if the entity meets the availability conditions
    - Verify the grid layout configuration

2. **IDE Selection Issues**
    - Confirm DevPod installation on your machine
    - Check the supported IDE list
    - Verify your default IDE configuration

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).
