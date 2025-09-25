# Crossplane Resources Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-crossplane-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-crossplane-resources-frontend)

## Overview

The Crossplane Resources frontend plugin enhances your Backstage instance with comprehensive visualization and management capabilities for Crossplane resources. It provides an intuitive interface for viewing and managing Crossplane claims, composite resources (XRs), and managed resources.

## Features

### Resource Overview Card
- Quick status overview of Crossplane resources
- Essential metadata display
- Direct links to detailed views

### Resource Table View
- Comprehensive list of all related Crossplane resources
- Filtering and sorting capabilities
- Quick access to YAML and events for each resource
- Copy to clipboard and download YAML functionality

### Resource Graph View
- Visual representation of resource relationships
- Interactive graph navigation
- Support for both v1 (claims) and v2 (XR) resources
- Detailed resource information on node selection

### Event Monitoring
- Real-time event tracking for resources
- Chronological event history
- Event filtering and sorting

### Permission Integration
- Seamless integration with Backstage's permission framework
- Granular access control for different features
- Conditional rendering based on user permissions

## Components

The plugin provides several key components:

- `CrossplaneResourcesTableSelector`: Main resource listing component
- `CrossplaneOverviewCardSelector`: Summary card for quick insights
- `CrossplaneResourceGraphSelector`: Interactive resource relationship graph
- Permission-aware wrapper components:

    - `IfCrossplaneOverviewAvailable`
    - `IfCrossplaneResourceGraphAvailable`
    - `IfCrossplaneResourcesListAvailable`

## Technical Details

### Dependencies
- Requires the Kubernetes Ingestor plugin for resource discovery
- Integration with the Crossplane Resources backend plugin
- Compatible with Backstage's latest permission framework

### Data Flow
1. Resources are discovered via the Kubernetes Ingestor
2. Resource data is fetched through backend API endpoints
3. Permission checks are performed (if enabled)
4. UI components render based on available data and permissions

### API Integration
- RESTful API endpoints for resource data
- Event streaming for real-time updates
- Kubernetes API proxy support

### Performance Considerations
- Efficient resource graph rendering
- Optimized YAML handling
- Responsive UI design for large resource sets
- Caching and data optimization
- Lazy loading for large resource sets

### Version Support
- Full support for Crossplane v1.x APIs
- Complete support for Crossplane v2.x APIs
- Backward compatibility maintained
- Version-specific features and optimizations
