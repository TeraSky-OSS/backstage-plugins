# Terraform Scaffolder Plugin

The Terraform Scaffolder plugin for Backstage provides a powerful interface for scaffolding new services and resources using Terraform modules. It enables teams to discover, configure, and use Terraform modules directly within the Backstage Software Templates interface, making infrastructure provisioning a seamless part of the service creation process.

## Plugin Components

### Frontend Plugin
The frontend plugin provides a user interface for:

- Discovering available Terraform modules from multiple sources
- Configuring module variables with type-safe inputs
- Validating module configurations before template execution
- Displaying module documentation and descriptions
- Supporting complex variable types (maps, lists, objects)
- Handling sensitive variables appropriately
- Managing multiple versions of modules

[Learn more about the frontend plugin](./frontend/about.md)

## Key Features

### Module Discovery
The plugin supports three different ways to discover and list Terraform modules:

1. **Configuration-based Modules**: Define modules directly in your `app-config.yaml`
2. **Catalog-based Modules**: Discover modules from your Backstage catalog
3. **Registry-based Modules**: Automatically fetch modules from the Terraform Registry

### Multi-Version Support
- Support for multiple versions of the same module
- Version selection during template creation
- Automatic version sorting and latest version detection

### Private Repository Support
- Built-in support for private GitHub repositories
- Configurable proxy settings for secure access
- Token-based authentication handling

### Additional Features
- **Type-Safe Inputs**: Automatic form generation based on module variables
- **Variable Validation**: Built-in validation for required fields and type checking
- **Complex Types Support**: Support for maps, lists, and nested object variables
- **Sensitive Data Handling**: Special handling for sensitive variables
- **Documentation**: Integrated display of variable descriptions and module documentation

## Getting Started

To get started with the Terraform Scaffolder plugin:

1. Follow the [Installation Guide](./frontend/install.md)
2. Configure the plugin using the [Configuration Guide](./frontend/configure.md)
3. Start creating infrastructure through your templates

## Documentation Structure

Frontend Plugin  
- [About](./frontend/about.md) - Learn about the plugin's components and features
- [Installation](./frontend/install.md) - Step-by-step installation guide
- [Configuration](./frontend/configure.md) - Detailed configuration options