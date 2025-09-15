# Installing the Terraform Scaffolder Plugin

This guide will help you install and set up the Terraform Scaffolder plugin in your Backstage instance.

## Prerequisites

- Backstage application
- Node.js and npm/yarn
- Access to Terraform modules (e.g., GitHub repositories)

## Installation Steps

1. Install the plugin package:

```bash
# Using yarn
yarn --cwd packages/app add @backstage/plugin-terraform-scaffolder
```

2. Register the plugin in your Backstage app:

```typescript
// packages/app/src/apis.ts
import { terraformScaffolderPlugin } from '@backstage/plugin-terraform-scaffolder';

export const apis = [
  // ... other APIs
  terraformScaffolderPlugin,
];
```

3. Configure the plugin in your `app-config.yaml`:

```yaml
terraformScaffolder:
  moduleReferences:
    - name: 'AWS VPC'
      url: 'https://github.com/org/terraform-aws-vpc'
      ref: 'main'
      description: 'Creates a VPC with standard configurations'
```

4. Add the field extension to your template:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: terraform-infrastructure
  title: Create Infrastructure
spec:
  parameters:
    - title: Infrastructure
      properties:
        infrastructure:
          title: Terraform Module
          type: string
          ui:field: TerraformModule
```

## Verification

To verify the installation:

1. Navigate to your software templates
2. Create a new component using a template with the TerraformModule field
3. Verify that you can:
   - Select from available modules
   - Configure module variables
   - See validation messages
   - Submit the form successfully

## Troubleshooting

Common issues and solutions:

1. **Module Not Found**
   - Check module URL in app-config.yaml
   - Verify GitHub access permissions
   - Check module ref/branch exists

2. **Type Errors**
   - Ensure all required API dependencies are installed
   - Check for version mismatches

3. **Form Validation Errors**
   - Verify variables.tf exists in module
   - Check variable type definitions

## Next Steps

After installation:

1. Configure your module sources
2. Create templates using the TerraformModule field
3. Test the template creation process
4. Set up CI/CD for your Terraform deployments

For detailed configuration options, see the [Configuration](./configure.md) guide.
