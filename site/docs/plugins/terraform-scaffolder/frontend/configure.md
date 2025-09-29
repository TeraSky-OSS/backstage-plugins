# Configuring the Terraform Scaffolder Plugin

This guide covers the configuration options available for the Terraform Scaffolder plugin.

## Module Sources Configuration

The plugin supports three different ways to configure module sources:

### 1. Configuration-based Modules

Configure modules directly in your `app-config.yaml`:

```yaml
terraformScaffolder:
  # Enable proxy support for private GitHub repositories
  useProxyForGitHub: true
  
  moduleReferences:
    - name: 'AWS ECR Module'
      url: 'https://github.com/terraform-aws-modules/terraform-aws-ecr'
      refs:
        - 'v3.1.0'
        - 'v3.0.0'
      description: 'AWS ECR Module'
    
    # Registry module reference
    - name: 'VPC Module'
      url: 'terraform-aws-modules/vpc/aws'  # Registry path format
      refs:
        - 'v6.0.1'
        - 'v6.0.0'
      description: 'AWS VPC Module'
```

#### Module Reference Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Display name for the module |
| url | string | Yes | GitHub URL or registry path |
| refs | string[] | No | List of versions (tags/branches) |
| description | string | No | Module description for UI |

### 2. Catalog-based Modules

Define modules in your Backstage catalog using annotations:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: my-terraform-module
  annotations:
    terasky.backstage.io/terraform-module-url: 'https://github.com/org/module'
    terasky.backstage.io/terraform-module-name: 'My Module'
    terasky.backstage.io/terraform-module-ref: 'v1.0.0'
    terasky.backstage.io/terraform-module-description: 'Description of the module'
spec:
  type: terraform-module
  # ... other spec fields
```

### 3. Registry-based Modules

Configure Terraform Registry integration:

```yaml
terraformScaffolder:
  registryReferences:
    returnAllVersions: true  # Fetch all versions for each module
    namespaces:
      - terraform-aws-modules
      - vmware
```

## Private Repository Access

### GitHub Proxy Configuration

For private GitHub repositories, configure both the plugin and proxy settings:

1. Enable proxy in the plugin:
```yaml
terraformScaffolder:
  useProxyForGitHub: true
```

2. Configure the proxy endpoint:
```yaml
proxy:
  endpoints:
    '/github-raw':
      target: 'https://raw.githubusercontent.com'
      changeOrigin: true
      headers:
        Authorization: 'Token ${GITHUB_TOKEN}'
```

## Template Configuration

### Basic Field Usage

```yaml
parameters:
  - title: Infrastructure
    properties:
      infrastructure:
        title: Terraform Module
        type: string
        ui:field: TerraformModule
```

## Variable Handling

The plugin automatically handles different variable types:

### Simple Types
- string
- number
- boolean

### Complex Types
- list
- map
- object

### Sensitive Variables

Variables marked as sensitive in variables.tf are automatically handled:

```hcl
variable "password" {
  type      = string
  sensitive = true
}
```

These will be:
1. Masked in the UI
2. Treated securely in templates
3. Never logged or displayed

## Best Practices

### Module Organization
- Use consistent naming conventions
- Provide clear descriptions
- Use semantic versioning for refs
- Group related modules together

### Security
- Use specific refs instead of 'main'
- Properly mark sensitive variables
- Use private repositories for sensitive modules
- Configure proxy settings for private repos

### Version Management
- Use semantic versioning for module versions
- Test modules before adding new versions
- Keep version lists up to date
- Document breaking changes between versions

### Maintenance
- Regular updates of module refs
- Version tracking
- Documentation updates
- Monitor module usage