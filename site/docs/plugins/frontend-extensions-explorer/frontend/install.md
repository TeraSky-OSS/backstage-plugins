# Installing the Frontend Extensions Explorer Plugin

This guide explains how to install the Frontend Extensions Explorer plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A Backstage instance using the **New Frontend System** (`@backstage/frontend-defaults`)
2. Access to modify `packages/app/package.json`

> **Note:** This plugin requires the New Frontend System. It will not work with legacy apps that use `@backstage/app-defaults`.

## Installation Steps

### 1. Add the Package

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-frontend-extensions-explorer
```

### 2. Enable Auto-Discovery (Recommended)

If your app uses `app.packages: all` in `app-config.yaml`, the plugin is discovered and loaded automatically — no code changes needed:

```yaml
# app-config.yaml
app:
  packages: all
```

### 3. Explicit Registration (Alternative)

If you manage features explicitly in `packages/app/src/App.tsx`, import and add the plugin:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import frontendExtensionsExplorerPlugin from '@terasky/backstage-plugin-frontend-extensions-explorer';

export default createApp({
  features: [
    // ... other features
    frontendExtensionsExplorerPlugin,
  ],
});
```

## Verification

After installation:

1. Start the app with `yarn start`
2. Look for **Extensions Explorer** in the sidebar navigation
3. Navigate to `/frontend-extensions-explorer`
4. Confirm the stats bar shows the expected number of plugins and extensions

## Next Steps

- [Configuration Guide](./configure.md) — adjust which extensions are included or how the nav item is positioned
- [Overview](../overview.md) — learn about all features

## Support

- Check the [GitHub Issues](https://github.com/TeraSky-OSS/backstage-plugins/issues)
- Review the plugin documentation
- Contact the TeraSky support team
