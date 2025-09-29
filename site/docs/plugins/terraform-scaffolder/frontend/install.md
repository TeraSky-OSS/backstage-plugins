# Installing the Terraform Scaffolder Plugin

This guide will help you install and set up the Terraform Scaffolder plugin in your Backstage instance.

## Prerequisites

- Backstage application
- Node.js and npm/yarn
- Access to Terraform modules (e.g., GitHub repositories, Terraform Registry)
- GitHub token (if using private repositories)

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
  # Enable proxy support for private GitHub repositories
  useProxyForGitHub: true
  
  # Registry module configuration (optional)
  registryReferences:
    returnAllVersions: true
    namespaces:
      - terraform-aws-modules
      - vmware

  # Direct module references
  moduleReferences:
    - name: 'AWS ECR Module'
      url: 'https://github.com/terraform-aws-modules/terraform-aws-ecr'
      refs:
        - 'v3.1.0'
      description: 'AWS ECR Module'
```

4. If using private GitHub repositories, configure the proxy:

```yaml
proxy:
  endpoints:
    '/github-raw':
      target: 'https://raw.githubusercontent.com'
      changeOrigin: true
      headers:
        Authorization: 'Token ${GITHUB_TOKEN}'
```

5. Add the field extension to your template:

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
   - Choose module versions
   - Configure module variables
   - See validation messages
   - Submit the form successfully
   - Access private repositories (if configured)

## Troubleshooting

Common issues and solutions:

1. **Module Not Found**
   - Check module URL in app-config.yaml
   - Verify GitHub access permissions
   - Check module ref/branch exists
   - Verify registry namespace configuration

2. **Private Repository Access**
   - Check GitHub token permissions
   - Verify proxy configuration
   - Ensure useProxyForGitHub is enabled
   - Check proxy endpoint headers

3. **Type Errors**
   - Ensure all required API dependencies are installed
   - Check for version mismatches
   - Verify type definitions in variables.tf

4. **Form Validation Errors**
   - Verify variables.tf exists in module
   - Check variable type definitions
   - Ensure version references are correct

## Next Steps

After installation:

1. Configure your module sources:
   - Add configuration-based modules
   - Set up catalog-based modules
   - Configure registry integration

2. Set up security:
   - Configure private repository access
   - Set up proxy settings
   - Manage GitHub tokens

3. Create and test templates:
   - Create templates using the TerraformModule field
   - Test with different module versions
   - Verify variable handling

4. Plan for production:
   - Set up CI/CD for your Terraform deployments
   - Document module usage
   - Plan version management strategy

For detailed configuration options, see the [Configuration](./configure.md) guide.