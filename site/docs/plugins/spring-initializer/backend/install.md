# Installing the Spring Initializer Backend Module

This guide will help you install and set up the Spring Initializer backend module in your Backstage instance.

## Prerequisites

- Backstage application
- Node.js and npm/yarn
- Access to Spring Initializer API (start.spring.io or self-hosted)

## Installation Steps

1. Install the module package:

```bash
# Using yarn
yarn --cwd packages/backend add @terasky/backstage-plugin-scaffolder-backend-module-spring-initializer
```

2. Add the module to your backend in `packages/backend/src/index.ts`:

```typescript
import { scaffolderModule as springInitializerModule } from '@terasky/backstage-plugin-scaffolder-backend-module-spring-initializer';

const backend = createBackend();

// ... other modules

// Add Spring Initializer module
backend.add(springInitializerModule);
```

3. (Optional) Configure a custom Spring Initializer endpoint in `app-config.yaml`:

```yaml
springInitializer:
  endpoint: 'https://start.spring.io'  # default
```

4. Restart your backend:

```bash
yarn --cwd packages/backend start
```

## Verification

To verify the installation:

1. Check backend logs for successful module registration:
```
info: Registered scaffolder action: terasky:spring-initializer
```

2. Create a test template that uses the action:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-spring-initializer
  title: Test Spring Initializer
spec:
  owner: platform-team
  type: service
  
  parameters:
    - title: Test
      properties:
        test:
          title: Test
          type: string
          
  steps:
    - id: generate-spring
      name: Generate Spring Boot Project
      action: terasky:spring-initializer
      input:
        type: maven-project
        language: java
        bootVersion: '3.5.10'
        groupId: com.test
        artifactId: test-app
        name: Test App
        description: Test application
        packageName: com.test.app
        packaging: jar
        javaVersion: '17'
        dependencies: web
```

3. Execute the template and verify:
   - Action runs without errors
   - Spring Boot project is generated
   - Files are extracted to workspace
   - Detailed logs are visible

## Troubleshooting

Common issues and solutions:

1. **Module Not Registered**
   - Verify package is installed: `yarn why @terasky/backstage-plugin-scaffolder-backend-module-spring-initializer`
   - Check import statement in `packages/backend/src/index.ts`
   - Ensure `backend.add(springInitializerModule)` is called
   - Restart backend after adding module

2. **Action Not Found**
   - Check backend logs for registration message
   - Verify module is loaded before templates
   - Check for conflicting action IDs

3. **API Connection Issues**
   - Verify Spring Initializer API is accessible from backend
   - Check network/firewall rules
   - Test API directly: `curl https://start.spring.io`
   - Check for proxy requirements

4. **ZIP Extraction Fails**
   - Verify workspace permissions
   - Check disk space
   - Review output path configuration
   - Check backend logs for specific errors

5. **Dependency Errors (400 Bad Request)**
   - This is expected for incompatible combinations
   - Use frontend plugin to filter compatible dependencies
   - Check Spring Initializer error message in logs
   - Verify dependency IDs are correct

## Action Registration

The module registers the action automatically using Backstage's new backend system:

```typescript
export const scaffolderModule = createBackendModule({
  moduleId: 'spring-initializer-action',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolderActions, config }) {
        scaffolderActions.addActions(
          createSpringInitializerAction({ config })
        );
      }
    });
  },
});
```

## Testing the Action

### Manual Testing

Test the action directly:

```bash
# From your Backstage root
curl http://localhost:7007/api/scaffolder/v2/actions
```

Look for `terasky:spring-initializer` in the response.

### Integration Testing

Create a test template and execute it:

1. Register the template in your catalog
2. Navigate to "Create" page
3. Select the test template
4. Fill in required parameters
5. Execute and monitor logs
6. Verify project is created

## Next Steps

After installation:

1. Configure custom endpoints if needed (see [Configuration](./configure.md))
2. Install the [Frontend Plugin](../frontend/install.md)
3. Create templates using both plugins together
4. Test with various Spring Boot versions
5. Verify dependency compatibility handling
6. Set up CI/CD for generated projects

For detailed configuration options, see the [Configuration](./configure.md) guide.
