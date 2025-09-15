# Terraform Scaffolder Plugin

The Terraform Scaffolder plugin for Backstage provides a powerful interface for scaffolding new services and resources using Terraform modules. It enables teams to discover, configure, and use Terraform modules directly within the Backstage Software Templates interface, making infrastructure provisioning a seamless part of the service creation process.

## Plugin Components

### Frontend Plugin
The frontend plugin provides a user interface for:

- Discovering available Terraform modules from configured sources
- Configuring module variables with type-safe inputs
- Validating module configurations before template execution
- Displaying module documentation and descriptions
- Supporting complex variable types (maps, lists, objects)
- Handling sensitive variables appropriately

[Learn more about the frontend plugin](./frontend/about.md)

## Features

- **Module Discovery**: Automatic discovery of Terraform modules from configured sources
- **Type-Safe Inputs**: Automatic form generation based on module variables
- **Variable Validation**: Built-in validation for required fields and type checking
- **Complex Types Support**: Support for maps, lists, and nested object variables
- **Sensitive Data Handling**: Special handling for sensitive variables
- **GitHub Integration**: Automatic parsing of variables from GitHub-hosted modules
- **Default Values**: Support for module-defined default values
- **Documentation**: Integrated display of variable descriptions and module documentation

## Configuration

The plugin requires configuration in your `app-config.yaml`:

```yaml
terraformScaffolder:
  moduleReferences:
    - name: 'AWS S3 Bucket'
      url: 'https://github.com/org/terraform-aws-s3'
      ref: 'main'
      description: 'Creates an S3 bucket with standard configurations'
    - name: 'GCP Cloud SQL'
      url: 'https://github.com/org/terraform-gcp-cloudsql'
      ref: 'v1.0.0'
      description: 'Provisions a Cloud SQL instance'
```

## Usage in Templates

The plugin provides a custom field type for Software Templates:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: terraform-resource
  title: Create Terraform Resources
  description: Creates infrastructure using Terraform modules
spec:
  parameters:
    - title: Infrastructure Configuration
      properties:
        infrastructure:
          title: Terraform Module
          type: string
          ui:field: TerraformModule
```

## Documentation Structure

Frontend Plugin  
- [About](./frontend/about.md)  
- [Installation](./frontend/install.md)  
- [Configuration](./frontend/configure.md)  

## Getting Started

To get started with the Terraform Scaffolder plugin:

1. Install the plugin package
2. Configure module references in your app-config.yaml
3. Add the TerraformModule field type to your templates
4. Start creating infrastructure through your templates

For detailed installation and configuration instructions, refer to the individual plugin documentation linked above.
