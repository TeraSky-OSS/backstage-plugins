# Configuring the VCF Automation Ingestor Plugin

This guide covers the configuration options available for the VCF Automation Ingestor plugin.


## Simple Configuration

For a single VCF Automation instance you can provide config as follows:
  
Add the following to your `app-config.yaml`:

```yaml
vcfAutomation:
  name: my-vcf-01
  majorVersion: 8 # 9 is also supported
  baseUrl: 'https://your-vcf-automation-instance'
  orgName: my-org # This is needed only in VCFA 9 and above
  organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9 organization types
  authentication:
    username: 'your-username'
    password: 'your-password'
    domain: 'your-domain' # This is needed only in Aria Automation 8.x
```

## Multi Instance Config

The plugin does support multi instance config in the following format:

```yaml
vcfAutomation:
  instances:
  - name: my-vcf-01
    baseUrl: 'https://your-vcf-automation-instance'
    majorVersion: 9
    orgName: my-org # This is needed only in VCFA 9 and above
    organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9 organization types
    authentication:
      username: 'your-username'
      password: 'your-password'
      domain: 'your-domain' # This is needed only in Aria Automation 8.x
  - name: my-vcf-02
    baseUrl: 'https://your-vcf-02-automation-instance'
    majorVersion: 8
    authentication:
      username: 'your-username'
      password: 'your-password'
      domain: 'your-domain' # This is needed only in Aria Automation 8.x
```

## Authentication

The plugin uses bearer token authentication with the VCF Automation API. It automatically handles token refresh when needed. The token is obtained by making a POST request to `/csp/gateway/am/api/login` with the configured credentials.

## Refresh Schedule

The plugin refreshes the entities every 30 minutes by default. Each refresh:  
1. Authenticates with the VCF Automation API  
2. Fetches all deployments using pagination  
3. For **all-apps** organization type, fetches detailed resource data for CCI resources
4. Transforms the deployments and their resources into Backstage entities  
5. Generates appropriate external links to VCF Automation UI based on organization type:
   - **vm-apps (classic)**: `/automation/#/consume/deployment/{id}`
   - **all-apps**: `/automation/#/build-and-deploy/all-resources/deployments/{id}`
6. Creates proper entity relationships:
   - **CCI.Supervisor.Resource** entities are marked as `subcomponentOf` their parent **CCI.Supervisor.Namespace**
   - **Dependencies** are tracked using `dependsOn` relationships
   - **Entity references** use correct types (Component vs Resource)
7. Updates the Backstage catalog

## Entity Types and Mappings

The ingestor creates different Backstage entity types based on the VCF resource type:

### Domain Entities (Projects)
- **VCF Projects** → **Backstage Domain**
- Contains project metadata (administrators, zones, constraints, etc.)
- Supports both vm-apps and all-apps project structures
- External links point to project-filtered deployment views

### System Entities (Deployments & Standalone Resources)  
- **VCF Deployments** → **Backstage System**
  - Contains deployment metadata (status, cost, ownership, etc.)
  - External links point to specific deployment views
  - Part of parent Project domain
- **Standalone Resources Container** → **Backstage System** (for all-apps only)
  - Named `{project-name}-standalone-resources` with ID `{project-id}-standalone-resources`
  - Created only when a project has standalone supervisor resources
  - Contains all standalone CCI supervisor resources for that project
  - Part of parent Project domain

### Component Entities
- **Cloud.vSphere.Machine** → **Backstage Component** (type: `Cloud.vSphere.Machine`)
- **CCI.Supervisor.Namespace** → **Backstage Component** (type: `CCI.Supervisor.Namespace`)
- **CCI.Supervisor.Resource** → **Backstage Component** (type: `CCI.Supervisor.Resource`)

### Resource Entities (Generic Resources)
- **All other resource types** → **Backstage Resource**

## CCI Resource Support

For **all-apps** organization types, the ingestor provides enhanced support for Cloud Compute Infrastructure (CCI) resources:

### CCI.Supervisor.Namespace
- Created as **Component** entities
- **Two sources**:
  - **Deployment-managed**: From deployment resource details
  - **Direct ingestion**: From `/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces` API
- Contains rich namespace metadata:
  - VM classes and their limits
  - Storage classes and quotas  
  - Zone information
  - Status conditions
  - Namespace endpoint URLs
- **Project Association**: Linked to project domains via `infrastructure.cci.vmware.com/project-id` annotation
- **Hierarchy**: Part of `{project-id}-standalone-resources` system (for standalone namespaces)
- Annotations include:
  - `terasky.backstage.io/vcf-automation-cci-namespace-endpoint`
  - `terasky.backstage.io/vcf-automation-cci-namespace-phase`
  - `terasky.backstage.io/vcf-automation-supervisor-namespace-data` (for direct ingestion)
  - `terasky.backstage.io/vcf-automation-resource-origin` ('SUPERVISOR_NAMESPACE' for standalone)

### CCI.Supervisor.Resource  
- Created as **Component** entities
- **Complex Subcomponent Relationships**:
  - **Deployment-managed**: 
    - **Standard**: `subcomponentOf` their parent CCI.Supervisor.Namespace
    - **Cluster VMs**: VirtualMachines with `cluster.x-k8s.io/cluster-name` label become `subcomponentOf` the Cluster component
  - **Standalone**: 
    - **Standard**: `subcomponentOf` their matching CCI.Supervisor.Namespace (ingested separately)
    - **Cluster VMs**: VirtualMachines with `capv.vmware.com/cluster.name` label become `subcomponentOf` the Cluster component
- Contains complete Kubernetes resource data:
  - **Manifest**: Original resource template/specification
  - **Object**: Live Kubernetes object with current status
  - **Context**: CCI context information
  - **Dependencies**: Tracked via `dependsOn` relationships
- **Smart External Links**: Based on resource kind:
  - **VirtualMachine**: Links to VM service view
  - **Service**: Links to network service view  
  - **Cluster**: Links to TKG service view
  - **Other types**: No external link (still ingested)
- **Smart Tagging**: All CCI resources from all-apps organizations get tagged with `kind:<RESOURCE_KIND>` (e.g., `kind:virtualmachine`, `kind:service`, `kind:cluster`)
- **Remote Console Links**: VirtualMachine components get remote console links with format `/automation/#/machines/remote-console/<PROJECT>/<NAMESPACE>/<VM>`
- Annotations include:
  - `terasky.backstage.io/vcf-automation-cci-resource-manifest` (JSON)
  - `terasky.backstage.io/vcf-automation-cci-resource-object` (JSON)
  - `terasky.backstage.io/vcf-automation-cci-resource-context`
  - `terasky.backstage.io/vcf-automation-resource-origin` ('DEPLOYED', 'STANDALONE', or 'SUPERVISOR_NAMESPACE')

### API Endpoint Usage

The ingestor uses different API endpoints based on organization type:

#### vm-apps (Classic)
- Projects: `/iaas/api/projects/{id}`
- Deployments: Standard deployment API

#### all-apps  
- Projects: `/project-service/api/projects/{id}`
- Deployments: Standard deployment API
- **Resource Details**: `/deployment/api/deployments/{id}/resources` (for CCI resources)
- **Standalone Supervisor Resources**: `/deployment/api/supervisor-resources` (paginated)
- **Supervisor Namespaces**: `/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces` (standalone)
- **Projects**: `/project-service/api/projects` (for project name resolution)  

## Links

- [Installation Guide](install.md)
- [About the plugin](about.md)
