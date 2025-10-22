# Kubernetes Ingestor Plugin

The Kubernetes Ingestor plugin is a powerful backend plugin for Backstage that automatically creates catalog entities from Kubernetes resources. It provides comprehensive support for standard Kubernetes workloads, custom resources, Crossplane resources, and KRO (Kubernetes Resource Orchestrator) resources, making it easy to maintain an up-to-date catalog of your infrastructure and applications.

## Features

- **Automatic Resource Discovery**: Ingest standard Kubernetes workloads automatically
- **Custom Resource Support**: Add custom GVKs for ingestion
- **Crossplane Integration**: Auto-ingest Crossplane claims and XRDs
- **KRO Integration**: Auto-ingest KRO RGDs and instances
- **Template Generation**: Create templates for Crossplane XRDs and KRO RGDs
- **API Entity Creation**: Generate API entities for XRDs and RGDs
- **Relationship Mapping**: Track dependencies between resources and APIs
- **Flexible Configuration**: Customize ingestion behavior and mapping
- **Annotation Support**: Rich annotation system for entity customization

## Plugin Components

### Backend Plugin
The plugin provides backend functionality for:  
- Resource discovery and ingestion  
- Template generation  
- API entity creation  
- Relationship management  

[Learn more about the backend plugin](./backend/about.md)

## Resource Types

### Standard Workloads
- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs
- And more...

### Crossplane Resources
- Claims (v1)
- XRs (v2)
- XRDs
- APIs
- Dependencies

### KRO Resources
- RGDs (Resource Graph Definitions)
- RGD Instances
- Generated CRDs
- Managed Resources
- Dependencies

### Custom Resources
- User-defined GVKs
- Custom workload types
- Specific resource kinds

## Documentation Structure
- [About](./backend/about.md)
- [Installation](./backend/install.md)
- [Configuration](./backend/configure.md)

## Annotations

The plugin supports a rich set of annotations for customizing entity creation:

```yaml
General Annotations:
  terasky.backstage.io/add-to-catalog: true/false
  terasky.backstage.io/exclude-from-catalog: true/false
  terasky.backstage.io/backstage-namespace: string
  terasky.backstage.io/owner: string

Namespace Annotations:
  terasky.backstage.io/system-type: string
  terasky.backstage.io/domain: string

Workload Resource Annotations:
  terasky.backstage.io/system: string
  terasky.backstage.io/source-code-repo-url: string
  terasky.backstage.io/source-branch: string
  terasky.backstage.io/techdocs-path: string
  terasky.backstage.io/kubernetes-label-selector: string
  terasky.backstage.io/component-type: string
  terasky.backstage.io/subcomponent-of: string
  terasky.backstage.io/lifecycle: string
  terasky.backstage.io/dependsOn: string
  terasky.backstage.io/providesApis: string
  terasky.backstage.io/consumesApis: string
  terasky.backstage.io/component-annotations: string
  terasky.backstage.io/links: string
  terasky.backstage.io/title: string
  terasky.backstage.io/name: string
  terasky.backstage.io/description: string
```

## Getting Started

To get started with the Kubernetes Ingestor plugin:  
1. Install the backend plugin  
2. Configure RBAC settings  
3. Set up ingestion rules  
4. Configure template generation  
5. Start discovering resources  

For detailed installation and configuration instructions, refer to the backend documentation linked above.
