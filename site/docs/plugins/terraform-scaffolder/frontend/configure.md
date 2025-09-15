# Configuring the Terraform Scaffolder Plugin

This guide covers the configuration options available for the Terraform Scaffolder plugin.

## Basic Configuration

The plugin requires configuration in your `app-config.yaml`:

```yaml
terraformScaffolder:
  moduleReferences:
    - name: 'AWS VPC'
      url: 'https://github.com/org/terraform-aws-vpc'
      ref: 'main'
      description: 'Creates a VPC with standard configurations'
```

### Configuration Options

#### Module References

Each module reference supports the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Display name for the module |
| url | string | Yes | Git URL for the module |
| ref | string | No | Branch, tag, or commit (defaults to 'main') |
| description | string | No | Module description for UI |

## Advanced Configuration

### GitHub Integration

For GitHub-hosted modules, the plugin automatically converts URLs to raw content format:

```yaml
terraformScaffolder:
  moduleReferences:
    - name: 'AWS S3'
      url: 'https://github.com/org/terraform-aws-s3.git'
      ref: 'v1.0.0'
```

The plugin will:
1. Convert GitHub URLs to raw content format
2. Fetch variables.tf from the specified ref
3. Parse variable definitions

### Multiple Module Sources

You can configure multiple module sources:

```yaml
terraformScaffolder:
  moduleReferences:
    - name: 'AWS Resources'
      url: 'https://github.com/org/terraform-aws-modules'
      ref: 'main'
    - name: 'GCP Resources'
      url: 'https://github.com/org/terraform-gcp-modules'
      ref: 'v2.0.0'
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

1. **Module Organization**
   - Use consistent naming
   - Provide clear descriptions
   - Use semantic versioning for refs

2. **Security**
   - Use specific refs instead of 'main'
   - Properly mark sensitive variables
   - Use private repositories for sensitive modules

3. **Maintenance**
   - Regular updates of module refs
   - Version tracking
   - Documentation updates
