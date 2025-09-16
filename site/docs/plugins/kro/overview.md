# KRO (Kubernetes Resource Orchestrator) Plugins

The KRO plugins for Backstage provide a comprehensive solution for managing and visualizing KRO resources within your Backstage instance. These plugins enable teams to effectively monitor and control their Kubernetes resources provisioned through KRO.

## Plugin Suite Components

The KRO plugin suite consists of several components:

- **Frontend Plugin (`kro-resources`)**: Provides visualization and management capabilities for KRO resources
- **Backend Plugin (`kro-permissions`)**: Handles permission management and access control
- **Common Library (`kro-common`)**: Shared utilities and permission definitions

## Key Features

- **Resource Visualization**: View KRO RGDs, instances, and managed resources
- **YAML Management**: Access and manage YAML configurations for all resource types
- **Event Monitoring**: Track events related to your KRO resources
- **Resource Graph**: Visual representation of resource relationships
- **Permission Controls**: Granular access control for different resource types and actions
- **Overview Cards**: Quick insights into resource status and relationships

## Screenshots

### Resource Graph View
![Graph View](../../images/kro-resource-graph.png)

### Resource Table View
![Table](../../images/kro-resources.png)
![YAML Viewer](../../images/kro-yaml-viewer.png)
![Events View](../../images/kro-events.png)

### Overview Information
![Overview](../../images/kro-info.png)

## Available Permissions

The plugin suite provides granular permission controls for:

- KRO RGDs (list, view YAML, show events)
- KRO Instances (list, view YAML, show events)
- Managed Resources (list, view YAML, show events)
- Additional Resources like CRDs (list, view YAML, show events)
- Resource Graph visualization

## Getting Started

To get started with the KRO plugins, you'll need to:

1. Install and configure the [Kubernetes Ingestor plugin](../kubernetes-ingestor/overview.md)
2. Set up the permissions backend (optional but recommended)
3. Install the frontend components
4. Configure the plugins according to your needs

For detailed installation and configuration instructions, refer to the individual plugin documentation:

- [Kubernetes Ingestor Plugin Installation](../kubernetes-ingestor/backend/install.md)
- [Kubernetes Ingestor Plugin Configuration](../kubernetes-ingestor/backend/configure.md)
- [Frontend Plugin Installation](./frontend/install.md)
- [Frontend Plugin Configuration](./frontend/configure.md)
- [Backend Plugin Installation](./backend/install.md)
- [Backend Plugin Configuration](./backend/configure.md)
