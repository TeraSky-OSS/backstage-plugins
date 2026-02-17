# SpectroCloud Ingestor Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-ingestor)

## Overview

The SpectroCloud Ingestor plugin is a catalog entity provider that automatically discovers and imports SpectroCloud Palette resources into the Backstage catalog. It creates proper entity relationships and adds comprehensive annotations for other plugins to consume.

## Features

### Resource Ingestion
- **Projects**: Imported as System entities
- **Cluster Profiles**: Imported as Resource entities with type `spectrocloud-cluster-profile`
- **Clusters**: Imported as Resource entities with type `spectrocloud-cluster`
- **Cluster Groups**: Imported as Resource entities with type `spectrocloud-cluster-group`
- **Virtual Clusters**: Imported as Resource entities with type `spectrocloud-virtual-cluster`

### Relationship Mapping
- Clusters are linked to their parent project (system)
- Cluster profiles are linked to their parent project (system)
- Clusters have `dependsOn` relationships to attached profiles
- Cluster groups have `dependsOn` relationships to:
  - Member clusters (host clusters in the group)
  - Add-on cluster profiles attached to the group
- Virtual clusters have `dependsOn` relationships to:
  - Host cluster (physical cluster hosting the virtual cluster)
  - Cluster group (group the virtual cluster belongs to)
  - Attached cluster profiles (directly attached to the virtual cluster)

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

### Cluster Groups (Resource)
Cluster groups are imported as Resource entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: my-project-my-cluster-group
  title: my-cluster-group
  annotations:
    terasky.backstage.io/cluster-group-id: cg123
    terasky.backstage.io/scope: project
    terasky.backstage.io/project-id: abc123
    terasky.backstage.io/endpoint-type: Ingress
    terasky.backstage.io/cluster-profile-refs: '[{"name":"addon-profile","uid":"addon123"}]'
spec:
  type: spectrocloud-cluster-group
  owner: spectrocloud
  system: my-project
  dependsOn:
    - resource:default/my-project-host-cluster
    - resource:default/my-project-addon-profile
```

### Virtual Clusters (Resource)
Virtual clusters are imported as Resource entities:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: my-project-my-vcluster
  title: my-vcluster
  annotations:
    terasky.backstage.io/cluster-id: vc456
    terasky.backstage.io/scope: project
    terasky.backstage.io/project-id: abc123
    terasky.backstage.io/cloud-type: nested
    terasky.backstage.io/state: Running
    terasky.backstage.io/host-cluster-id: ghi789
    terasky.backstage.io/cluster-group-id: cg123
    terasky.backstage.io/cpu-limit: 6000
    terasky.backstage.io/cpu-limit-unit: MilliCore
    terasky.backstage.io/memory-limit: 8388608
    terasky.backstage.io/memory-limit-unit: KiB
    terasky.backstage.io/cluster-profile-refs: '[{"name":"vcluster-profile","uid":"vcp123"}]'
spec:
  type: spectrocloud-virtual-cluster
  owner: spectrocloud
  system: my-project
  dependsOn:
    - resource:default/my-project-my-cluster
    - resource:default/my-project-my-cluster-group
    - resource:default/my-project-vcluster-profile
```

## Annotations Reference

**Note**: All annotations use the configured `annotationPrefix` (default: `terasky.backstage.io`). The prefix is shown as `{prefix}` below.

### Project Annotations
| Annotation | Description | Example |
|------------|-------------|---------|
| `{prefix}/project-id` | SpectroCloud project UID | `abc123` |
| `{prefix}/scope` | Always `project` for projects | `project` |
| `{prefix}/tenant-id` | Parent tenant UID | `tenant456` |
| `{prefix}/instance` | SpectroCloud instance name | `production` |

### Profile Annotations
| Annotation | Description | Example |
|------------|-------------|---------|
| `{prefix}/profile-id` | SpectroCloud profile UID | `prof789` |
| `{prefix}/scope` | `tenant` or `project` | `project` |
| `{prefix}/project-id` | Parent project UID (if project-scoped) | `abc123` |
| `{prefix}/overlord-id` | Overlord/PCG UID (if applicable) | `overlord123` |
| `{prefix}/profile-type` | Profile type | `infra`, `add-on`, `cluster` |
| `{prefix}/cloud-type` | Target cloud type | `eks`, `aws`, `aks`, `azure`, `vsphere` |
| `{prefix}/profile-status` | Profile publication status | `published`, `draft` |
| `{prefix}/version` | Current version | `1.0.0` |
| `{prefix}/latest-version` | Latest available version | `1.1.0` |
| `{prefix}/profile-versions` | JSON array of all versions | `[{"uid":"v1","version":"1.0.0"}]` |
| `{prefix}/instance` | SpectroCloud instance name | `production` |

### Cluster Annotations
| Annotation | Description | Example |
|------------|-------------|---------|
| `{prefix}/cluster-id` | SpectroCloud cluster UID | `cluster789` |
| `{prefix}/scope` | `tenant` or `project` | `project` |
| `{prefix}/project-id` | Parent project UID (if project-scoped) | `abc123` |
| `{prefix}/project-name` | Parent project name | `My Project` |
| `{prefix}/overlord-id` | Overlord/PCG UID | `overlord123` |
| `{prefix}/tenant-id` | Parent tenant UID | `tenant456` |
| `{prefix}/cloud-type` | Cloud provider type | `eks`, `aws`, `aks`, `azure`, `vsphere` |
| `{prefix}/state` | Cluster state | `Running`, `Pending`, `Failed`, etc. |
| `{prefix}/kubernetes-version` | Kubernetes version | `1.28.5` |
| `{prefix}/cluster-profile-refs` | JSON array of attached profiles | `[{"name":"my-profile","uid":"version-uid"}]` |
| `{prefix}/instance` | SpectroCloud instance name | `production` |

### Cluster Group Annotations
| Annotation | Description | Example |
|------------|-------------|---------|
| `{prefix}/cluster-group-id` | SpectroCloud cluster group UID | `cg123` |
| `{prefix}/scope` | `tenant` or `project` | `project` |
| `{prefix}/project-id` | Parent project UID (if project-scoped) | `abc123` |
| `{prefix}/tenant-id` | Parent tenant UID | `tenant456` |
| `{prefix}/endpoint-type` | Virtual cluster endpoint type | `Ingress`, `LoadBalancer` |
| `{prefix}/cluster-profile-refs` | JSON array of add-on profiles | `[{"name":"addon","uid":"addon123"}]` |
| `{prefix}/instance` | SpectroCloud instance name | `production` |

### Virtual Cluster Annotations
| Annotation | Description | Example |
|------------|-------------|---------|
| `{prefix}/cluster-id` | SpectroCloud virtual cluster UID | `vc456` |
| `{prefix}/scope` | `tenant` or `project` | `project` |
| `{prefix}/project-id` | Parent project UID (if project-scoped) | `abc123` |
| `{prefix}/project-name` | Parent project name | `My Project` |
| `{prefix}/tenant-id` | Parent tenant UID | `tenant456` |
| `{prefix}/cloud-type` | Always `nested` for virtual clusters | `nested` |
| `{prefix}/state` | Virtual cluster state | `Running`, `Pending`, `Failed`, etc. |
| `{prefix}/host-cluster-id` | UID of host cluster | `ghi789` |
| `{prefix}/cluster-group-id` | UID of cluster group | `cg123` |
| `{prefix}/cpu-limit` | CPU limit value | `6000` |
| `{prefix}/cpu-limit-unit` | CPU limit unit | `MilliCore` |
| `{prefix}/memory-limit` | Memory limit value | `8388608` |
| `{prefix}/memory-limit-unit` | Memory limit unit | `KiB` |
| `{prefix}/cluster-profile-refs` | JSON array of attached profiles | `[{"name":"vcluster-profile","uid":"vcp123"}]` |
| `{prefix}/instance` | SpectroCloud instance name | `production` |

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

