# Configuring the Module Federation CDN Backend Plugin

This guide covers all configuration options for the Module Federation CDN backend plugin.

## Configuration Reference

The plugin is configured through the `cdn` top-level key in your `app-config.yaml`. The value is an array of CDN entries, where each entry describes one dynamic frontend plugin to load from a CDN.

```yaml
cdn:
  - pluginName: string      # Required: npm package name of the plugin
    publicPath: string      # Required: CDN base URL (must end with /)
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pluginName` | `string` | Yes | The npm package name of the plugin exactly as it appears in the plugin's `package.json`. Example: `@my-org/backstage-plugin-example` |
| `publicPath` | `string` | Yes | The CDN base URL where the plugin assets are hosted. **Must end with a trailing slash.** The plugin will fetch `<publicPath>mf-manifest.json` from this URL. Example: `https://cdn.example.com/plugins/example/` |

## Basic Configuration

A minimal configuration with a single CDN-hosted plugin:

```yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-example"
    publicPath: "https://cdn.example.com/plugins/example/"
```

## Multiple CDN Plugins

You can register any number of plugins:

```yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-dashboard"
    publicPath: "https://cdn.example.com/plugins/dashboard/"
  - pluginName: "@my-org/backstage-plugin-metrics"
    publicPath: "https://cdn.example.com/plugins/metrics/"
  - pluginName: "@another-org/backstage-plugin-security"
    publicPath: "https://security-cdn.example.com/backstage/security/"
```

Each entry is loaded in parallel at startup. If one manifest fetch fails, the others continue unaffected.

## Environment-Specific Configuration

Use Backstage's environment variable substitution to keep CDN URLs configurable per environment:

```yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-example"
    publicPath: "${CDN_BASE_URL}/plugins/example/"
```

Or use separate `app-config.production.yaml` files:

```yaml
# app-config.production.yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-example"
    publicPath: "https://cdn.prod.example.com/plugins/example/"
```

```yaml
# app-config.local.yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-example"
    publicPath: "http://localhost:5173/"
```

## CDN Plugin Requirements

The plugin hosted on the CDN must meet these requirements:

### Required: `mf-manifest.json`

The file `<publicPath>mf-manifest.json` must exist and be a valid Module Federation manifest. Backstage's dynamic plugin build tooling generates this file automatically when you build a plugin with `--dynamic`.

The manifest must contain:

| Field | Description |
|-------|-------------|
| `name` | Used as the stub directory name |
| `metaData.pluginVersion` | Extracted as the plugin version (falls back to `0.0.0`) |
| `metaData.publicPath` | Overwritten by this plugin to point to the CDN URL |

### Required: CORS Headers (if applicable)

If the Backstage backend and CDN are on different origins, ensure the CDN serves appropriate CORS headers so the backend can fetch the manifest:

```
Access-Control-Allow-Origin: *
```

Or restrict to your backend's origin:

```
Access-Control-Allow-Origin: https://backstage.example.com
```

### Required: Public Accessibility

The `mf-manifest.json` (and all JS chunks referenced in it) must be publicly accessible from both the backend (for manifest fetching at startup) and the browser (for loading the actual plugin code).

## No-Op Behaviour

If the `cdn` configuration array is absent or empty, the plugin starts successfully and is a complete no-op:

```yaml
# No cdn key → plugin loads but does nothing
```

## Advanced: Using a CDN with Versioned Paths

For blue/green or canary deployments, include the version in the CDN path:

```yaml
cdn:
  - pluginName: "@my-org/backstage-plugin-example"
    publicPath: "https://cdn.example.com/plugins/example/v1.2.3/"
```

Update `publicPath` to point to the new version when you want to roll out an update. Because the backend fetches the manifest at startup, a backend restart picks up the new version from the CDN.

## Verification

After configuring, restart your backend and confirm the registered plugins:

```bash
# Check backend logs
# Expected: module-federation-cdn: registered CDN remote for <pluginName> from <publicPath>

# Check the dynamic features remotes endpoint
curl -s http://localhost:7007/api/dynamic-features/remotes | jq '.[].name'
```

Your CDN-hosted plugin package names should appear in the JSON output.

## Troubleshooting

### `failed to fetch manifest ... (HTTP 404)`

The `mf-manifest.json` was not found at `<publicPath>mf-manifest.json`. Check:

- The `publicPath` ends with `/`.
- The file exists at that URL (`curl -I <publicPath>mf-manifest.json`).
- The CDN cache is not serving a stale 404.

### `failed to fetch manifest ... (HTTP 403)`

The manifest is not publicly accessible. Add public read permissions in your CDN/storage bucket policy.

### Plugin Not Showing in Frontend

- Confirm the plugin appears in `/api/dynamic-features/remotes`.
- Verify the Backstage frontend's dynamic plugin loading configuration references the plugin package name.
- Check browser network requests for failed chunk fetches from the CDN.

### CORS Errors in Browser

The browser-side chunk fetches (JS files from the CDN) may be blocked by CORS. Ensure the CDN serves `Access-Control-Allow-Origin: *` (or your Backstage app origin) on all assets.

### Backend Starts but Plugin Does Not Load

- Confirm `@backstage/backend-dynamic-feature-service` is properly configured and its startup hook runs before the module federation CDN plugin.
- Enable debug logging to see detailed output:

```yaml
backend:
  log:
    level: debug
```
