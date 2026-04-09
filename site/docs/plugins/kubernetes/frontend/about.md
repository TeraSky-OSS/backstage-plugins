# Kubernetes Resources Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-resources-frontend) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-kubernetes-resources-frontend)

## Overview

The Kubernetes Resources frontend plugin provides a rich user interface for visualizing and managing Kubernetes resources within Backstage. It offers both graph and table views of resources, along with detailed information about resource configurations and events.

## Features

### Resource Graph View
- Interactive dependency visualization
- Resource relationship mapping
- Zoom and pan controls
- Resource filtering
- Click-through navigation

### Resource Details
- YAML manifest viewer
- Resource events timeline
- Configuration download
- Copy to clipboard
- Resource metadata display

### Table View
- Resource listing
- Sorting and filtering
- Status indicators
- Quick actions
- Bulk operations

### Permission Integration
- Role-based access control
- Resource-level permissions
- Secret handling
- Event visibility control
- YAML access management

## Components

### KubernetesResourcesPage
The main component that provides:  
- Resource table view  
- Filtering capabilities  
- Resource details  
- Event monitoring  

Example usage:
```typescript
import { KubernetesResourcesPage, isKubernetesResourcesAvailable } from '@terasky/backstage-plugin-kubernetes-resources-frontend';

const entityPage = (
  <EntityLayout>
    <EntityLayout.Route 
      path="/kubernetes-resource-page" 
      if={isKubernetesResourcesAvailable}
      title="Kubernetes Resources"
    >
      <KubernetesResourcesPage />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### KubernetesResourceGraph
Interactive graph visualization component:  
- Resource dependency mapping  
- Interactive navigation  
- Resource details on click  
- Zoom and pan controls  

Example usage:
```typescript
import { KubernetesResourceGraph, isKubernetesResourcesAvailable } from '@terasky/backstage-plugin-kubernetes-resources-frontend';

const entityPage = (
  <EntityLayout>
    <EntityLayout.Route 
      path="/kubernetes-resource-graph" 
      if={isKubernetesResourcesAvailable}
      title="Resource Graph"
    >
      <KubernetesResourceGraph />
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Technical Details

### Integration Points
- Kubernetes backend service
- Permission framework
- Entity catalog
- Proxy configuration

### Required Annotations
```yaml
annotations:
  terasky.backstage.io/kubernetes-resource-name: 'resource-name'
  terasky.backstage.io/kubernetes-resource-kind: 'ResourceKind'
  terasky.backstage.io/kubernetes-resource-api-version: 'group/version'
  terasky.backstage.io/kubernetes-resource-namespace: 'namespace' # Optional
  backstage.io/managed-by-origin-location: 'cluster-name'
```

### Permission Framework
The plugin integrates with Backstage's permission framework to control:  
- Resource visibility  
- YAML access  
- Event viewing  
- Secret management  
- Graph access  

## User Experience

### Resource Discovery
1. Navigate to resource page
2. Filter and search resources
3. View resource details
4. Explore dependencies

### Graph Navigation
1. Open graph view
2. Explore resource relationships
3. Click resources for details
4. View related events

### Resource Management
1. View resource YAML
2. Monitor resource events
3. Download configurations
4. Track dependencies

## Example Integrations

### Basic Integration
```typescript
import {
  KubernetesResourcesPage,
  KubernetesResourceGraph,
  isKubernetesResourcesAvailable,
} from '@terasky/backstage-plugin-kubernetes-resources-frontend';

const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route 
      path="/kubernetes-resource-page" 
      if={isKubernetesResourcesAvailable}
      title="Resources"
    >
      <KubernetesResourcesPage />
    </EntityLayout.Route>
    <EntityLayout.Route 
      path="/kubernetes-resource-graph" 
      if={isKubernetesResourcesAvailable}
      title="Resource Graph"
    >
      <KubernetesResourceGraph />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### Advanced Integration
```typescript
import {
  KubernetesResourcesPage,
  KubernetesResourceGraph,
  isKubernetesResourcesAvailable,
} from '@terasky/backstage-plugin-kubernetes-resources-frontend';

const kubernetesContent = (
  <>
    <EntitySwitch>
      <EntitySwitch.Case if={isKubernetesResourcesAvailable}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <KubernetesResourcesPage />
          </Grid>
          <Grid item xs={12}>
            <KubernetesResourceGraph />
          </Grid>
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </>
);

const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route 
      path="/kubernetes" 
      title="Kubernetes"
    >
      {kubernetesContent}
    </EntityLayout.Route>
  </EntityLayout>
);
```

For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md). 