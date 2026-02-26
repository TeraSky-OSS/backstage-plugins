# Kubernetes Ingestor Plugin

The Kubernetes Ingestor plugin is a powerful backend plugin for Backstage that automatically creates catalog entities from Kubernetes resources. It provides comprehensive support for standard Kubernetes workloads, custom resources, Crossplane resources, and KRO (Kubernetes Resource Orchestrator) resources, making it easy to maintain an up-to-date catalog of your infrastructure and applications.

## Features

- **Automatic Resource Discovery**: Ingest standard Kubernetes workloads automatically
- **Custom Resource Support**: Add custom GVKs for ingestion
- **Crossplane Integration**: Auto-ingest Crossplane claims and XRDs
- **KRO Integration**: Auto-ingest KRO RGDs and instances
- **Template Generation**: Create templates for Crossplane XRDs and KRO RGDs with enhanced repository picker support and reliable YAML download links (base64-encoded)
- **API Entity Creation**: Generate API entities for XRDs and RGDs with configurable formats (CRD or OpenAPI type)
- **CRD-Type API Support**: Ingest APIs as CRD-type entities with full CRD YAML definitions (requires api-docs-module-crd plugin)
- **API Auto-Registration**: Automatically create API entities from OpenAPI/Swagger definitions exposed by your workloads
- **API-Only Ingestion**: Ingest CRDs, XRDs, and RGDs as API entities only without template generation
- **Resource Entity Support**: Ingest Kubernetes objects as Resource entities instead of Component entities
- **Relationship Mapping**: Track dependencies between resources and APIs
- **Flexible Configuration**: Customize ingestion behavior and mapping
- **Annotation Support**: Rich annotation system for entity customization
- **Enhanced Repository Selection**: Dropdown pickers for repository and organization selection in scaffolder templates

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
  terasky.backstage.io/dependsOn: string              # comma or newline separated
  terasky.backstage.io/providesApis: string           # comma or newline separated
  terasky.backstage.io/consumesApis: string           # comma or newline separated
  terasky.backstage.io/component-annotations: string  # comma or newline separated (key=value)
  terasky.backstage.io/links: string                  # JSON array. Each element must match: { "url": string, "title"?: string, "icon"?: string, "type"?: string }
                                                      #   Example: [{"url": "https://docs.example.com", "title": "Docs", "type": "external"}]
  terasky.backstage.io/backstage-tags: string         # comma- or newline-separated list of key:value pairs
                                                      #   used to populate `metadata.tags` on the resulting entity
                                                      #   supports YAML literal block `|` as well
  terasky.backstage.io/title: string
  terasky.backstage.io/name: string
  terasky.backstage.io/description: string

API Auto-Registration Annotations:
  terasky.backstage.io/provides-api-from-def: string      # URL for $text reference (runtime fetch)
  terasky.backstage.io/provides-api-from-url: string      # URL to fetch and embed at ingestion
  terasky.backstage.io/provides-api-from-resource-ref: JSON  # K8s resource reference
```

For multiline annotations, you can use the YAML block style `|`. Example:

```yaml
terasky.backstage.io/dependsOn: |
  resource:default/my-resource
  component:default/my-component
terasky.backstage.io/links: |
  [
    {
      "url": "https://docs.example.com",
      "title": "Docs",
    },
    {
      "url": "https://dashboard.example.com",
      "title": "Dashboard",
      "icon": "dashboard"
    }
  ]
```

## Getting Started

To get started with the Kubernetes Ingestor plugin:  
1. Install the backend plugin  
2. Configure RBAC settings  
3. Set up ingestion rules  
4. Configure template generation  
5. Start discovering resources  

For detailed installation and configuration instructions, refer to the backend documentation linked above.
