# Configuring the VCF Automation Frontend Plugin

This guide covers the configuration options available for the VCF Automation frontend plugin.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. The configuration in `app-config.yaml` is still respected as described below.

## Configuration

Add the following to your `app-config.yaml`:  
  
Single Instance:  
```yaml
vcfAutomation:
  name: my-vcf-01
  baseUrl: http://your-vcf-automation-service
  majorVersion: 9 # 8 or 9 supported
  orgName: my-org # Required for VCF 9
  organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9
  # Enable permission checks
  enablePermissions: true
  # Auth details
  authentication:
    username: 'your-username'
    password: 'your-password'
    domain: 'your-domain' # Required for Aria Automation 8.x
```

Multi Instance:  
```yaml
vcfAutomation:
  enablePermissions: true
  instances:
  - name: my-vcf-01
    baseUrl: 'https://your-vcf-automation-instance'
    majorVersion: 8
    authentication:
      username: 'your-username'
      password: 'your-password'
      domain: 'your-domain'
  - name: my-vcf-02
    baseUrl: 'https://your-vcf-02-automation-instance'
    majorVersion: 9
    orgName: my-org # Required for VCF 9
    organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9
    authentication:
      username: 'your-username'
      password: 'your-password'
```  
  
## Links

- [Installation Guide](install.md)
- [About the plugin](about.md)

## Configuration File

The plugin is configured through your `app-config.yaml`. Here's a comprehensive example:

```yaml
vcfAutomation:
  enablePermissions: true
  instances:
  - name: my-vcf-01
    baseUrl: 'https://your-vcf-automation-instance'
    majorVersion: 8
    authentication:
      username: 'your-username'
      password: 'your-password'
      domain: 'your-domain'
  - name: my-vcf-02
    baseUrl: 'https://your-vcf-02-automation-instance'
    majorVersion: 9
    orgName: my-org # Required for VCF 9
    organizationType: 'all-apps' # Options: 'vm-apps' (default) or 'all-apps' for VCF 9
    authentication:
      username: 'your-username'
      password: 'your-password'
```
  
## Best Practices

1. **Component Configuration**
     - Set appropriate refresh intervals
     - Handle errors gracefully
     - Use consistent styling
     - Implement proper validation

2. **Permission Management**
     - Define clear role boundaries
     - Implement least privilege
     - Document access levels
     - Regular permission audits

3. **Performance Optimization**
     - Cache API responses
     - Minimize refresh frequency
     - Implement error boundaries
     - Monitor resource usage

4. **Security**
     - Use secure tokens
     - Implement HTTPS
     - Validate input data
     - Regular security audits

## CCI Supervisor Resource YAML Editing

The VCF Automation plugin provides powerful YAML editing capabilities for CCI Supervisor resources in VCF Automation 9.x with all-apps organization types. This feature allows users to directly modify Kubernetes resource manifests through an integrated Monaco Editor.

### Prerequisites

- VCF Automation 9.x environment with all-apps organization type
- CCI Supervisor resources (both standalone and deployment-managed resources are supported)
- User must have the `vcf-automation.supervisor-resource.edit` permission

### Permission Configuration

To enable YAML editing functionality, ensure the `vcf-automation.supervisor-resource.edit` permission is properly configured in your permission system:

```typescript
// In your permission policy
import { supervisorResourceEditPermission } from '@terasky/backstage-plugin-vcf-automation-common';

// Allow specific users/roles to edit CCI resources
const policy: PermissionPolicy = {
  handle: async (request, user) => {
    if (isPermission(request.permission, supervisorResourceEditPermission)) {
      // Add your authorization logic here
      return { result: AuthorizeResult.ALLOW };
    }
    // ... other permissions
  },
};
```

### Features

#### 1. Resource Overview Modal Editor
- **Location**: CCI Supervisor Resource Overview page
- **Trigger**: "Edit Resource Manifest" button (appears when user has permissions)
- **Interface**: Full-screen modal with Monaco Editor
- **Features**: 
  - YAML syntax highlighting
  - Real-time validation with error feedback
  - Save confirmation dialog
  - Automatic page refresh after successful save

#### 2. Resource Details Tab Editor  
- **Location**: CCI Supervisor Resource Details page
- **Trigger**: "Edit Manifest" tab (automatically loads manifest when selected)
- **Interface**: Embedded tab with full-height Monaco Editor
- **Features**:
  - Integrated directly into the details page
  - Auto-loading of resource manifest
  - Inline save/cancel actions
  - Real-time YAML validation

### Supported Resource Types

The YAML editor supports any Kubernetes resource type available in CCI Supervisor namespaces, including:

- **VirtualMachine**: VMware vSphere virtual machines
- **TanzuKubernetesCluster**: Tanzu Kubernetes clusters
- **ConfigMap**: Configuration data
- **Secret**: Sensitive data
- **Pod**: Individual container instances
- **Service**: Network services
- **Deployment**: Application deployments
- And any other valid Kubernetes resources

### Usage Workflow

1. **Access**: Navigate to a CCI Supervisor Resource entity page
2. **Permission Check**: Verify you have the required edit permission
3. **Edit**: 
   - **Modal**: Click "Edit Resource Manifest" button in overview
   - **Tab**: Click "Edit Manifest" tab in details view
4. **Modify**: Edit the YAML using the Monaco Editor with syntax highlighting
5. **Validate**: Real-time validation ensures YAML syntax correctness
6. **Save**: Click "Save Changes" and confirm in the dialog
7. **Apply**: Changes are applied directly to the Kubernetes resource

### Technical Details

- **Editor**: Monaco Editor (VS Code editor) with YAML language support
- **Validation**: Real-time YAML parsing using js-yaml library
- **API**: Uses VCF Automation's Kubernetes proxy endpoints
- **Security**: Permission-based access control
- **Error Handling**: Comprehensive error messages and user feedback

### Limitations

- Requires VCF Automation 9.x with all-apps organization type
- User must have appropriate VCF Automation permissions in addition to Backstage permissions
- Resource must have valid apiVersion, kind, namespace, and name metadata
- Resource context must contain valid namespace URN ID information

### Troubleshooting

**Editor not appearing**: Verify user has `vcf-automation.supervisor-resource.edit` permission

**Save fails**: Verify YAML syntax is valid and user has write permissions in VCF Automation

For installation instructions, refer to the [Installation Guide](./install.md).
