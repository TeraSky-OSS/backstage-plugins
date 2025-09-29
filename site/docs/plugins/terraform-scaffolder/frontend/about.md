# Terraform Scaffolder Frontend Plugin

The frontend component of the Terraform Scaffolder plugin provides a rich user interface for discovering and configuring Terraform modules within Backstage Software Templates.

## Components

### TerraformModuleForm

The main form component that provides:

- Module selection from multiple sources (Config, Catalog, Registry)
- Version selection for modules with multiple versions
- Dynamic form generation based on module variables
- Type-safe input fields for all Terraform variable types
- Validation of required fields
- Support for sensitive variables
- Display of module documentation

### TerraformModuleSchema

The schema component that:

- Defines the structure of module configurations
- Validates input against Terraform variable types
- Handles complex types like maps and lists
- Provides type definitions for template parameters
- Supports version-specific schema validation

## Features

### Module Discovery
- Multiple module source types:
  - Configuration-based modules
  - Catalog-based modules
  - Registry-based modules
- Rich module metadata display
- Module search and filtering
- Version management and selection

### Version Management
- Support for multiple module versions
- Automatic version sorting and comparison
- Latest version detection
- Version-specific variable handling
- Support for both tags and branches

### Private Repository Support
- Secure access to private GitHub repositories
- Proxy configuration for raw content
- Token-based authentication
- Automatic URL rewriting

### Variable Configuration
- Automatic form generation based on variables.tf
- Support for all Terraform variable types:
  - String
  - Number
  - Boolean
  - List
  - Map
  - Complex objects
- Default value handling
- Required field validation
- Sensitive variable handling

### Type Safety
- Runtime type checking
- Validation before template execution
- Error messages for invalid inputs
- Version-specific type validation

### Documentation
- Inline variable descriptions
- Module documentation display
- Version-specific documentation
- Usage examples

## API

The plugin provides an enhanced client API for interacting with Terraform modules:

```typescript
interface TerraformScaffolderApi {
  getModuleReferences(): Promise<TerraformModuleReference[]>;
  getModuleVersions(moduleRef: TerraformModuleReference): Promise<string[]>;
  getModuleVariables(moduleRef: TerraformModuleReference, version?: string): Promise<TerraformVariable[]>;
}
```

### Types

```typescript
interface TerraformModuleReference {
  name: string;
  url: string;
  refs?: string[];
  description?: string;
  isRegistryModule?: boolean;
}

interface TerraformVariable {
  name: string;
  type: string;
  description?: string;
  default?: any;
  required: boolean;
  sensitive: boolean;
  originalDefinition?: string;
}
```

## Integration

The plugin integrates with Backstage's Software Templates system through:

1. Custom field extensions
2. Form validation
3. Template parameter processing
4. Configuration API integration
5. Proxy integration for private repositories
6. Catalog integration for module discovery

For installation and configuration details, see the [Installation](./install.md) and [Configuration](./configure.md) guides.