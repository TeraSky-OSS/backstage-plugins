# KRO Resources Frontend Plugin

The KRO Resources frontend plugin provides a comprehensive UI for managing and visualizing KRO resources in your Backstage instance.

## Features

- **Resource Graph**: Interactive visualization of KRO resources and their relationships
- **Resource Table**: Detailed view of KRO instances and their managed resources
- **YAML Viewer**: Access and inspect YAML configurations
- **Event Monitoring**: Track events for all KRO-related resources
- **Overview Cards**: Quick status insights for KRO instances

## Components

The plugin provides several React components:

- `KroOverviewCard`: Shows status and basic information about a KRO instance
- `KroResourceGraph`: Interactive graph visualization of resource relationships
- `KroResourceTable`: Detailed table view of resources with YAML and event access
- `isKroAvailable`: Utility components for permission-based rendering

## Integration Points

The plugin integrates with:

- Kubernetes backend plugin for resource access
- Permission framework for access control
- Catalog for entity information

## Screenshots

### Resource Graph
![Resource Graph](../../../images/kro-resource-graph.png)

### Resource Table
![Resource Table](../../../images/kro-resources.png)

### YAML Viewer
![YAML Viewer](../../../images/kro-yaml-viewer.png)

### Events View
![Events](../../../images/kro-events.png)

### Overview Card
![Overview](../../../images/kro-info.png)
