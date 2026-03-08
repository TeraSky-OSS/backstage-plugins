# Frontend Extensions Explorer Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-frontend-extensions-explorer/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-frontend-extensions-explorer)

## Overview

The Frontend Extensions Explorer is a purely client-side Backstage plugin that provides live introspection of the New Frontend System (NFS) extension tree. It is designed exclusively for NFS apps built with `@backstage/frontend-defaults` and reads data directly from the `appTreeApiRef` runtime API — no backend plugin or network calls are required.

## Features

### Stats Bar
A summary row at the top of the page shows at a glance:

- Total number of plugins contributing extensions
- Total number of registered extensions
- Count of enabled extensions (instantiated and active)
- Count of disabled extensions (flagged off by default or config)
- Count of not-running extensions (enabled in spec but not yet instantiated)

### Plugin Card View (Default)
Extensions are grouped into collapsible cards, one per owning plugin. Each card header shows the plugin ID and a quick summary (`N extensions · N enabled · N disabled`). Individual extension rows show:

- Status icon (green check, red cross, or orange power icon)
- Full extension ID (monospace)
- Copy-to-clipboard button with a 1.5-second confirmation flash
- Colour-coded type chip

A **Collapse All** and **Expand All** button pair above the grid gives fast control over all cards simultaneously.

### Flat Table View
Toggle to a sortable table with columns for Extension ID, Plugin, Type, Status, Attachment Point, and Config. Clicking any row opens the detail drawer. All columns are sortable by clicking the header.

### Filter Bar
Four controls narrow the view:

| Control | Options |
|---|---|
| Search | Free-text match on extension ID or plugin name |
| Type | Dropdown of all distinct extension types present in the tree |
| Plugin | Dropdown of all plugins present in the tree |
| Status | All / Enabled / Disabled / Not Running |

### Extension Detail Drawer
Clicking any extension row opens a slide-in drawer on the right showing:

- **Extension ID** — full monospace ID
- **Plugin** — owning plugin ID
- **Extension Type** — colour-coded chip
- **Status** — chip plus human-readable description of why it has that status
- **Attaches To** — the parent extension ID and input slot name
- **Output Data Refs** — all data refs produced by this extension when instantiated
- **Current Config** — formatted JSON of the active configuration applied from `app-config.yaml`

## Technical Details

### Data Source
All data comes from a single API call at render time:

```typescript
const { tree } = useApi(appTreeApiRef).getTree();
```

`AppTree.nodes` is a `ReadonlyMap<string, AppNode>` containing every extension node (enabled, disabled, and orphaned) in the app.

### Extension Status Logic

| Condition | Status |
|---|---|
| `node.spec.disabled === true` | Disabled |
| `node.spec.disabled === false && node.instance !== undefined` | Enabled |
| `node.spec.disabled === false && node.instance === undefined` | Not Running |

### Extension Type Detection
The extension type is derived from the prefix of the extension ID (the segment before the first `:`). Known prefixes map to human-friendly labels; unknown prefixes are auto-capitalised.

### Config Display
`node.spec.config` contains the configuration object applied to this extension from `app-config.yaml` overrides. If no config has been applied, `null` is shown with a note that extension defaults are in use.
