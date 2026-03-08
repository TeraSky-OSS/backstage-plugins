# Frontend Extensions Explorer Plugin

The Frontend Extensions Explorer plugin for Backstage provides a live introspection page for the New Frontend System (NFS). It reads the runtime app extension tree and surfaces every registered extension with its owning plugin, type, enabled/disabled status, active configuration, and output data refs — all without any backend or network calls.

## Plugin Components

### Frontend Plugin
The frontend plugin provides a comprehensive explorer page with:

- **Plugin-grouped card view**: Extensions organised by plugin, each card collapsible with Collapse All / Expand All controls
- **Flat table view**: Sortable table showing all extensions across all plugins in one place
- **Live stats bar**: Counts of plugins, extensions, enabled, disabled, and not-running extensions
- **Filter bar**: Text search and dropdowns for extension type, owning plugin, and status
- **Extension detail drawer**: Full inspection panel showing type chip, status, attachment point, output data refs, and current applied config as formatted JSON
- **Copy to clipboard**: One-click copy button on every extension row for quick reference

[Learn more about the frontend plugin](./frontend/about.md)

## Documentation Structure
- [About](./frontend/about.md)
- [Installation](./frontend/install.md)
- [Configuration](./frontend/configure.md)

## Key Features

### Zero Backend Dependency
The plugin uses the built-in `appTreeApiRef` from `@backstage/frontend-plugin-api` to read the live, in-memory extension tree assembled at app startup. No server calls are made.

### Extension Type Identification
Extension types are derived from the standard NFS ID prefix convention: `page:`, `nav-item:`, `entity-content:`, `api:`, `entity-card:`, `theme:`, and many more — all with distinct colour-coded chips.

### Enabled vs Disabled vs Not Running
Three statuses are tracked and displayed:

- **Enabled** — `spec.disabled` is `false` and the node is instantiated (`node.instance` present)
- **Disabled** — `spec.disabled` is `true` (user or plugin default)
- **Not Running** — enabled in spec but not yet instantiated (context-dependent)

### Current Config Inspection
The active configuration for each extension (applied from `app-config.yaml` overrides) is displayed as formatted JSON in the detail drawer.

### Output Data Refs
When an extension is instantiated, all of its output data refs (route paths, React elements, API factories, nav targets, etc.) are listed in the detail drawer.

## Supported Extension Types

| ID Prefix | Display Name |
|---|---|
| `page:` | Page |
| `nav-item:` | Nav Item |
| `entity-content:` | Entity Content |
| `entity-card:` | Entity Card |
| `api:` | API |
| `nav:` | Nav |
| `app:` | App |
| `sign-in-page:` | Sign-In Page |
| `plugin-header-action:` | Plugin Header Action |
| `theme:` | Theme |
| `search-result-list-item:` | Search Result Item |
| `scaffold-field:` | Scaffold Field |
| Others | Auto-capitalised from prefix |

## Getting Started

1. Install the plugin in your Backstage instance
2. Add it to your app's dependency list — auto-discovery via `app.packages: all` handles the rest
3. Navigate to `/frontend-extensions-explorer` or click "Extensions Explorer" in the sidebar

For detailed installation and configuration instructions, refer to:

- [About the plugin](./frontend/about.md)
- [Installation Guide](./frontend/install.md)
- [Configuration Guide](./frontend/configure.md)
