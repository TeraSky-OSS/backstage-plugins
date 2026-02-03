# Kubernetes Ingestor Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-ingestor)

## Overview

The Kubernetes Ingestor backend plugin is a catalog entity provider that automatically creates and maintains Backstage catalog entities from Kubernetes resources. It supports standard workloads, custom resources, and provides deep integration with Crossplane for managing cloud infrastructure.

## Features

### Resource Discovery
- Automatic workload detection
- Custom resource type support
- Namespace filtering
- Selective ingestion
- Multi-cluster support

### Crossplane Integration
- Claim resource ingestion (v1)
- XR resource ingestion (v2)
- XRD template generation
- API entity creation
- Relationship tracking

### Template Generation
- XRD-based templates
- Multiple publishing targets
- Git integration
- YAML download option
- Customizable outputs

### Entity Management
- Automatic updates
- Relationship mapping
- System organization
- Metadata handling
- Annotation processing
- Flexible entity types (Component or Resource)
- API-only ingestion mode

## Components

### Entity Provider
The core component that:  
- Discovers resources  
- Creates entities  
- Maintains relationships  
- Updates catalog  

### Template Generator
Generates software templates for:  
- Crossplane XRDs  
- Custom resources  
- Resource creation  
- Configuration management  
- YAML download links (base64-encoded for browser compatibility)  

### API Manager
Handles API-related tasks:  
- API entity creation (CRD-type or OpenAPI-type)
- Relationship tracking  
- Version management  
- Documentation links
- Schema extraction and processing

## Technical Details

### Resource Processing
The plugin processes resources through:  
1. Discovery phase  
2. Filtering phase  
3. Entity creation  
4. Relationship mapping  
5. Catalog update  

### Mapping Models
Supports various mapping models:  
- Namespace mapping  
- Name mapping  
- Title mapping  
- System mapping  
- Reference mapping  

### Task Runners
Configurable task runners for:  
- Resource discovery  
- Template generation  
- API updates  
- Relationship maintenance  

## Integration Points

### Kubernetes Integration
- Cluster access
- Resource watching
- Event handling
- State management

### Crossplane Integration
- XRD processing
- Claim handling
- API generation
- Template creation

### Git Integration
- Repository access
- PR creation
- Branch management
- File handling

## Use Cases

### Standard Workload Management
1. Discover workloads
2. Create components
3. Map relationships
4. Maintain metadata

### Crossplane Resource Management
1. Process XRDs
2. Generate templates
3. Create API entities
4. Track relationships

### Custom Resource Management
1. Define custom types
2. Configure ingestion
3. Process resources
4. Create entities

## Example Workflows

### Workload Discovery
```yaml
kubernetesIngestor:
  components:
    enabled: true
    taskRunner:
      frequency: 10
      timeout: 600
    excludedNamespaces:
      - kube-system
    customWorkloadTypes:
      - group: pkg.crossplane.io
        apiVersion: v1
        plural: providers
```

### Template Generation
```yaml
kubernetesIngestor:
  crossplane:
    xrds:
      publishPhase:
        allowedTargets: ['github.com', 'gitlab.com']
        target: github
        git:
          repoUrl: github.com?owner=org&repo=templates
          targetBranch: main
        allowRepoSelection: true
```

### Download Link Encoding

Generated templates include "Download YAML Manifest" links that use **base64 encoding** (e.g., `data:application/yaml;base64,...`). This encoding format:
- Ensures reliable downloads across all browsers
- Follows W3C standards for data URIs
- Preserves YAML formatting and newlines
- Provides smaller file sizes compared to URL encoding

For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).
