# SpectroCloud Ingestor Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-ingestor)

## Overview

The SpectroCloud Ingestor plugin is a catalog entity provider that automatically discovers and imports SpectroCloud Palette resources into the Backstage catalog. It creates proper entity relationships and adds comprehensive annotations for other plugins to consume.

## Features

### Resource Ingestion
- **Projects**: Imported as System entities
- **Cluster Profiles**: Imported as Resource entities with type `spectrocloud-cluster-profile`
- **Clusters**: Imported as Resource entities with type `spectrocloud-cluster`

### Relationship Mapping
- Clusters are linked to their parent project
- Cluster profiles are linked to their parent project
- Cross-references between clusters and attached profiles

### Smart Naming Conventions
- Prevents name conflicts across multiple instances
- Preserves original names in `metadata.title`
- Uses scoped naming for uniqueness

### Scheduled Refresh
- Configurable refresh intervals
- Automatic detection of new resources
- Removal of deleted resources

### Multi-Instance Support
- Connect to multiple SpectroCloud environments
- Instance-specific configuration
- Proper entity namespacing

## Entity Types

### Projects (System)
SpectroCloud projects are imported as System entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: my-project
  title: My Project
  annotations:
    terasky.backstage.io/project-id: abc123
    terasky.backstage.io/scope: tenant
    terasky.backstage.io/instance: production
spec:
  owner: spectrocloud
```

### Cluster Profiles (Resource)
Cluster profiles are imported as Resource entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: my-project-my-profile
  title: my-profile
  annotations:
    terasky.backstage.io/profile-id: def456
    terasky.backstage.io/scope: project
    terasky.backstage.io/project-id: abc123
    terasky.backstage.io/cloud-type: vsphere
    terasky.backstage.io/profile-versions: '[{"uid":"v1","version":"1.0.0"}]'
spec:
  type: spectrocloud-cluster-profile
  owner: spectrocloud
  system: my-project
```

### Clusters (Resource)
Clusters are imported as Resource entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: my-project-my-cluster
  title: my-cluster
  annotations:
    terasky.backstage.io/cluster-id: ghi789
    terasky.backstage.io/scope: project
    terasky.backstage.io/project-id: abc123
    terasky.backstage.io/cloud-type: vsphere
    terasky.backstage.io/state: Running
    terasky.backstage.io/kubernetes-version: 1.28.5
    terasky.backstage.io/cluster-profile-refs: '[{"name":"my-profile","uid":"def456"}]'
spec:
  type: spectrocloud-cluster
  owner: spectrocloud
  system: my-project
```

## Annotations Reference

### Project Annotations
| Annotation | Description |
|------------|-------------|
| `project-id` | SpectroCloud project UID |
| `scope` | Always `tenant` for projects |
| `instance` | SpectroCloud instance name |

### Profile Annotations
| Annotation | Description |
|------------|-------------|
| `profile-id` | SpectroCloud profile UID |
| `scope` | `tenant` or `project` |
| `project-id` | Parent project UID (if project-scoped) |
| `cloud-type` | Target cloud type |
| `profile-versions` | JSON array of available versions |

### Cluster Annotations
| Annotation | Description |
|------------|-------------|
| `cluster-id` | SpectroCloud cluster UID |
| `scope` | `tenant` or `project` |
| `project-id` | Parent project UID (if project-scoped) |
| `cloud-type` | Cloud provider type |
| `state` | Cluster state (Running, Pending, etc.) |
| `kubernetes-version` | Kubernetes version |
| `cluster-profile-refs` | JSON array of attached profile references |

## Use Cases

### Catalog Discovery
- Automatically populate catalog with SpectroCloud resources
- No manual entity registration required
- Stays in sync with SpectroCloud

### Cross-Plugin Integration
- Frontend plugin uses annotations for display
- Backend plugin uses annotations for API routing
- Kubernetes plugin can reference cluster entities

### Multi-Environment Management
- Track resources across multiple SpectroCloud instances
- Unified view in Backstage catalog
- Environment-specific filtering

