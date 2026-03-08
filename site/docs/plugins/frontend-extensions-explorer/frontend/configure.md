# Configuring the Frontend Extensions Explorer Plugin

## Overview

The Frontend Extensions Explorer plugin requires no mandatory configuration. It works out of the box once installed and reads all data at runtime from the `appTreeApiRef`.

## Enabling the Plugin

Like any NFS plugin, you can control whether the plugin (and its individual extensions) are active via `app-config.yaml`:

```yaml
app:
  extensions:
    # The plugin is enabled by default once installed.
    # To explicitly disable the page or nav item, use:
    - page:frontend-extensions-explorer:
        disabled: true
    - nav-item:frontend-extensions-explorer:
        disabled: true
```

## Configuring the Nav Item Position

By default the nav item is appended to the sidebar. If your app's sidebar uses groups or ordering, you can control placement via the nav extension config:

```yaml
app:
  extensions:
    - nav-item:frontend-extensions-explorer:
        config:
          # Place after a specific nav item (app-dependent config keys)
          routeRef: /frontend-extensions-explorer
```

## Access Control

This plugin reads and displays information about every extension loaded in the app — including extension IDs, plugin names, and active configuration values. You may want to restrict access in production environments.

To limit the plugin to internal/admin users, disable it by default and enable it only in non-production `app-config` files:

```yaml
# app-config.yaml (production — disable by default)
app:
  extensions:
    - page:frontend-extensions-explorer:
        disabled: true
    - nav-item:frontend-extensions-explorer:
        disabled: true
```

```yaml
# app-config.local.yaml (development — enable explicitly)
app:
  extensions:
    - page:frontend-extensions-explorer:
        disabled: false
    - nav-item:frontend-extensions-explorer:
        disabled: false
```

## Best Practices

1. **Development / staging only** — Consider shipping this plugin enabled only in non-production environments to avoid exposing internal configuration structure to end users.
2. **No backend required** — Do not add a backend plugin; all data is read from the client-side runtime tree.
3. **Always up to date** — Because the plugin reads the live runtime tree, it automatically reflects any extension changes without rebuilding or reconfiguring it separately.
