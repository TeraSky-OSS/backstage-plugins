# Module Federation CDN Plugin

The Module Federation CDN plugin for Backstage enables dynamic frontend plugins to be loaded directly from a Content Delivery Network (CDN) without requiring any files to be placed in the `dynamic-plugins-root` directory on the backend server.

## Plugin Components

### Backend Plugin (`@terasky/backstage-plugin-module-federation-cdn-backend`)

The backend plugin handles all CDN integration at startup time:

- Fetches `mf-manifest.json` from each configured CDN endpoint
- Patches the manifest so all JavaScript chunks are served from the CDN instead of the backend
- Writes minimal stub files to a temporary directory so the dynamic features router can serve them
- Injects virtual `FrontendDynamicPlugin` entries into the `DynamicPluginManager` via monkey-patching

[Learn more about the backend plugin](./backend/about.md)

## Documentation Structure

- Backend Plugin
    - [About](./backend/about.md)
    - [Installation](./backend/install.md)
    - [Configuration](./backend/configure.md)

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  Backstage Backend Startup                                          │
│                                                                     │
│  1. module-federation-cdn plugin initialises                        │
│     └─► reads cdn[] array from app-config.yaml                     │
│                                                                     │
│  2. For each CDN entry:                                             │
│     ├─► GET <publicPath>mf-manifest.json                           │
│     ├─► patches manifest.metaData.publicPath → CDN URL             │
│     ├─► writes stub files to /tmp/module-federation-cdn/<name>/    │
│     └─► builds virtualPlugins[] and scannedPackages map            │
│                                                                     │
│  3. Monkey-patches DynamicPluginManager                             │
│     ├─► frontendPlugins() → adds virtualPlugins                    │
│     └─► getScannedPackage() → returns stub location                │
│                                                                     │
│  4. Registers resolver provider with frontendRemotesServer          │
│     └─► manifest passes through as-is (publicPath already baked)   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Browser Runtime                                                    │
│                                                                     │
│  Backstage frontend loads /api/dynamic-features/remotes             │
│  └─► backend returns the CDN-patched mf-manifest.json              │
│      └─► browser fetches all JS chunks directly from CDN           │
└─────────────────────────────────────────────────────────────────────┘
```

## Use Cases

### Host Plugins on a CDN

Instead of bundling or copying dynamic plugin assets to the backend host, publish them to any CDN (AWS CloudFront, Cloudflare, Azure CDN, GitHub Pages, etc.) and configure the CDN URLs in `app-config.yaml`. The backend will discover and serve the plugins at startup with zero disk writes to the production filesystem.

### Decouple Plugin Releases from Backend Deployments

Because plugins are loaded from the CDN at runtime, updating a plugin only requires publishing a new build to the CDN — no backend restart or redeployment is needed (subject to caching headers on the CDN).

### Accelerate Global Load Times

All JavaScript chunks are served from the CDN closest to the user's browser rather than from the centralised Backstage backend, significantly reducing load times for globally distributed teams.

## Prerequisites

- Backstage New Backend System
- `@backstage/backend-dynamic-feature-service` configured in your backend
- Dynamic plugins feature enabled (`dynamicPlugins` in your backend)
- One or more frontend plugins built with the Backstage dynamic plugin build tooling and hosted on a CDN

## Getting Started

1. Install and configure the backend plugin — see [Installation](./backend/install.md)
2. Add CDN entries to your `app-config.yaml` — see [Configuration](./backend/configure.md)
3. Verify the plugins appear in the `/api/dynamic-features/remotes` response
