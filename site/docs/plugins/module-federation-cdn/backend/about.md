# Module Federation CDN Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-module-federation-cdn-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-module-federation-cdn-backend) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-module-federation-cdn-backend)

## Overview

The Module Federation CDN backend plugin (`@terasky/backstage-plugin-module-federation-cdn-backend`) enables dynamic Backstage frontend plugins to be loaded directly from a CDN. It integrates with the `@backstage/backend-dynamic-feature-service` to inject virtual plugin entries at backend startup, eliminating the need to copy plugin assets to the backend server's filesystem.

## Features

### CDN-Hosted Dynamic Plugins

- Load any number of dynamic frontend plugins from CDN endpoints
- No changes to the backend server filesystem required
- Plugins are registered at startup time via configuration
- Each plugin is independently configured with its own CDN URL

### Manifest-Based Discovery

- Automatically fetches `mf-manifest.json` from each configured CDN URL
- Extracts plugin version from `manifest.metaData.pluginVersion`
- Patches `manifest.metaData.publicPath` so the browser fetches all JS chunks from the CDN
- Writes lightweight stub files to a temporary directory for the dynamic features router

### Dynamic Plugin Manager Integration

- Monkey-patches `DynamicPluginManager.frontendPlugins()` to include CDN-hosted plugins in the `/api/dynamic-features/remotes` response
- Monkey-patches `DynamicPluginManager.getScannedPackage()` to return the stub location for CDN plugins
- Registers a `ResolverProvider` with `frontendRemotesServer` so the manifest is served as-is

### Robust Error Handling

- Failed manifest fetches (HTTP errors) are logged and skipped — other CDN entries continue to load
- Unexpected errors are caught and logged without crashing the backend
- Backend starts cleanly even if no `cdn` entries are configured (the plugin is a no-op)

## Technical Details

### Plugin ID

`module-federation-cdn`

### Package Name

`@terasky/backstage-plugin-module-federation-cdn-backend`

### Core Services Used

| Service | Purpose |
|---------|---------|
| `coreServices.rootConfig` | Read `cdn[]` entries from `app-config.yaml` |
| `coreServices.rootLogger` | Emit info/error log messages |
| `dynamicPluginsServiceRef` | Inject virtual plugin entries into the dynamic features service |
| `dynamicPluginsFrontendServiceRef` | Register the CDN manifest resolver provider |

### Startup Sequence

1. Reads all entries from the `cdn` configuration array.
2. For each entry in parallel:
   - Fetches `<publicPath>mf-manifest.json`.
   - Patches `manifest.metaData.publicPath` to the CDN URL.
   - Writes `<tmpdir>/module-federation-cdn/<manifest.name>/package.json` and `dist/mf-manifest.json`.
   - Adds an entry to `virtualPlugins[]` and `scannedPackages` map.
3. Monkey-patches the `DynamicPluginManager` instance.
4. Calls `frontendRemotesServer.setResolverProvider()` with a pass-through resolver for CDN plugins.

### Temporary File Location

Stub files are written to `<os.tmpdir()>/module-federation-cdn/<manifest.name>/`. These are needed only to satisfy the dynamic features router's disk-based manifest serving; the actual JS chunks are served from the CDN.

### Stub File Structure

```
/tmp/module-federation-cdn/
└── <manifest.name>/
    ├── package.json          # { name, version, main, backstage: { role } }
    └── dist/
        └── mf-manifest.json  # CDN-patched manifest
```

## Logging

All log entries are emitted at the root logger level with the prefix `module-federation-cdn:`.

| Level | Message |
|-------|---------|
| `info` | `module-federation-cdn: registered CDN remote for <pluginName> from <publicPath>` |
| `error` | `module-federation-cdn: failed to fetch manifest for <pluginName> from <manifestUrl> (HTTP <status>)` |
| `error` | `module-federation-cdn: unexpected error setting up <pluginName>` |
