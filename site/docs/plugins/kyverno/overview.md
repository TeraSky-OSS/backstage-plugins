# Kyverno Plugin

The Kyverno plugin for Backstage provides comprehensive integration with Kyverno policy reports, enabling teams to monitor and manage their Kubernetes policy compliance directly within the Backstage interface.

## Plugin Components

### Frontend Plugin (`@terasky/backstage-plugin-kyverno-policy-reports`)
The frontend plugin adds visualization capabilities for Kyverno policy reports, allowing users to:  
- View policy reports associated with components  
- Monitor compliance statistics and metrics  
- Access detailed policy information and YAML configurations  
- Track policy results across different clusters
- View Crossplane-specific policy reports
- Display overview cards with compliance statistics
- Provide YAML viewers with copy/download functionality

[Learn more about the frontend plugin](./frontend/about.md)

### Backend Plugin (`@terasky/backstage-plugin-kyverno-policy-reports-backend`)
The backend plugin provides comprehensive functionality:
- Integration with Kubernetes clusters to fetch policy reports
- API endpoints for retrieving policy information
- Permission management and access control
- MCP actions for programmatic access
- Support for both namespaced and cluster-scoped policies
- Integration with Backstage's permission framework

[Learn more about the backend plugin](./backend/about.md)

### Common Library (`@terasky/backstage-plugin-kyverno-common`)
The common library provides shared functionality:
- Permission definitions and types
- Common interfaces and models
- Shared utilities for frontend and backend
- Type definitions for policy reports and resources

## Documentation Structure

- Frontend Plugin
    - [About](./frontend/about.md)
    - [Installation](./frontend/install.md)
    - [Configuration](./frontend/configure.md)
- Backend Plugin
    - [About](./backend/about.md)
    - [Installation](./backend/install.md)
    - [Configuration](./backend/configure.md)

## Screenshots

### Policy Reports Overview
![Policy Reports Overview](../../images/kyverno-01.png)

### Detailed Resource View
![Detailed Resource View](../../images/kyverno-02.png)

### Policy YAML View
![Policy YAML View](../../images/kyverno-03.png)

### Component Overview
![Component Overview](../../images/kyverno-04.png)

## MCP Actions Integration

The Kyverno plugin provides MCP (Model Control Protocol) actions for interacting with Kyverno policies and policy reports. To enable these actions:

1. First, ensure you have the MCP actions backend plugin installed and configured. See the [MCP Actions Backend Plugin documentation](https://github.com/backstage/backstage/blob/master/plugins/mcp-actions-backend/README.md) for setup instructions.

2. Add the plugin to your actions configuration in `app-config.yaml`:

```yaml
backend:
  actions:
    pluginSources:
      - 'catalog'
      - 'kyverno'
      # ... other action sources
```

### Available MCP Actions

The plugin provides the following MCP actions:

- `get_kyverno_policy_reports`: Get policy reports for a specific entity
  - Input: Entity metadata (name and namespace)
  - Output: List of policy reports with results and summaries

- `get_kyverno_policy`: Get details of a specific Kyverno policy
  - Input: Cluster name, policy name, and optional namespace
  - Output: Full policy details and configuration

## Getting Started

To get started with the Kyverno plugin:

1. Install and configure the backend plugin
2. Set up the frontend components
3. Configure MCP actions in your app-config.yaml
4. Configure permission rules and access policies
5. Start monitoring your policy compliance
