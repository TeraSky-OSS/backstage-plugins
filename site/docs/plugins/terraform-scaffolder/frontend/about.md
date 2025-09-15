# Terraform Scaffolder Frontend Plugin

The frontend component of the Terraform Scaffolder plugin provides a rich user interface for discovering and configuring Terraform modules within Backstage Software Templates.

## Components

### TerraformModuleForm

The main form component that provides:

- Module selection from configured sources
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

## Features

### Module Selection
- Browse available modules from configured sources
- View module descriptions and documentation
- Select specific module versions

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

### Documentation
- Inline variable descriptions
- Module documentation display
- Usage examples

## API

The plugin provides a client API for interacting with Terraform modules:

```typescript
interface TerraformScaffolderApi {
  getModuleReferences(): Promise<TerraformModuleReference[]>;
  getModuleVariables(moduleRef: TerraformModuleReference): Promise<TerraformVariable[]>;
}
```

### Types

```typescript
interface TerraformModuleReference {
  name: string;
  url: string;
  ref?: string;
  description?: string;
}

interface TerraformVariable {
  name: string;
  type: string;
  description?: string;
  default?: any;
  required: boolean;
  sensitive: boolean;
}
```

## Integration

The plugin integrates with Backstage's Software Templates system through:

1. Custom field extensions
2. Form validation
3. Template parameter processing
4. Configuration API integration

For installation and configuration details, see the [Installation](./install.md) and [Configuration](./configure.md) guides.
