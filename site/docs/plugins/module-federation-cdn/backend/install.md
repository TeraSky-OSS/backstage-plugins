# Installing the Module Federation CDN Backend Plugin

This guide will help you install and set up the Module Federation CDN backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend using the New Backend System
2. The `@backstage/backend-dynamic-feature-service` package installed and configured
3. Dynamic plugins enabled in your Backstage configuration
4. One or more frontend plugins built with Backstage's dynamic plugin tooling and hosted on a CDN

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-module-federation-cdn-backend
```

### 2. Add to Backend

Add the plugin to your backend in `packages/backend/src/index.ts`:

```typescript
const backend = createBackend();

// ... other plugins ...

backend.add(import('@terasky/backstage-plugin-module-federation-cdn-backend'));

backend.start();
```

### 3. Add Configuration

Add your CDN-hosted plugins to `app-config.yaml`:

```yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-example"
    publicPath: "https://cdn.example.com/plugins/example/"
```

See the [Configuration Guide](./configure.md) for the full configuration reference.

## Dynamic Plugins Prerequisite

This plugin relies on Backstage's dynamic features service. Ensure you have the dynamic plugin infrastructure in place. A minimal setup in `app-config.yaml` typically looks like:

```yaml
dynamicPlugins:
  rootDirectory: dynamic-plugins-root
```

The plugin itself does **not** require any files in `dynamic-plugins-root` — the CDN replaces that entirely.

## Verification

After installation, restart your Backstage backend and verify that:

1. The backend starts without errors.
2. Log output includes entries like:
   ```
   module-federation-cdn: registered CDN remote for @my-org/backstage-plugin-example from https://cdn.example.com/plugins/example/
   ```
3. The plugin appears in the dynamic features remotes endpoint:
   ```bash
   curl -s http://localhost:7007/api/dynamic-features/remotes | jq '.[].name'
   ```
   Your CDN plugin's package name should appear in the list.

## Troubleshooting Installation

### Plugin Does Not Appear in Remotes

- Confirm the `cdn` config block is present in `app-config.yaml` and indented correctly.
- Check backend logs for `module-federation-cdn:` entries — look for error-level messages.
- Verify the `mf-manifest.json` URL is publicly reachable:
  ```bash
  curl -I https://cdn.example.com/plugins/example/mf-manifest.json
  ```

### Backend Fails to Start

- Ensure `@backstage/backend-dynamic-feature-service` is installed and correctly wired up.
- Check that the `dynamicPlugins.rootDirectory` path exists (the directory can be empty).

### HTTP Errors Fetching the Manifest

- Confirm the CDN URL ends with a trailing `/`.
- Verify CORS headers allow the backend to fetch from the CDN (if the backend and CDN are on different origins).
- Check that the manifest file is named exactly `mf-manifest.json`.

## Next Steps

After successful installation, proceed to:

1. [Configuration Guide](./configure.md) — Full configuration reference and advanced options
