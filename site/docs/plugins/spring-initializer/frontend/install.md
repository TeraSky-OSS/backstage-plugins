# Installing the Spring Initializer Frontend Plugin

This guide will help you install and set up the Spring Initializer frontend plugin in your Backstage instance.

## Prerequisites

- Backstage application
- Node.js and npm/yarn
- Access to Spring Initializer API (start.spring.io or self-hosted)
- Backend module installed (see [Backend Installation](../backend/install.md))

## Installation Steps

1. Install the plugin package:

```bash
# Using yarn
yarn --cwd packages/app add @terasky/backstage-plugin-spring-initializer
```

2. The plugin uses the new Frontend System and auto-discovers field extensions, so no additional registration is needed in your `App.tsx`.

3. Configure the proxy in your `app-config.yaml` to avoid CORS issues:

```yaml
proxy:
  endpoints:
    '/spring-initializer':
      target: 'https://start.spring.io'
      changeOrigin: true
```

4. (Optional) Configure a custom Spring Initializer endpoint:

```yaml
springInitializer:
  endpoint: 'https://start.spring.io'  # default
  proxyPath: '/spring-initializer'      # default proxy path
```

5. Add the field extension to your software template:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: spring-boot-template
  title: Spring Boot Application
  description: Create a new Spring Boot application
spec:
  type: service
  parameters:
    - title: Spring Boot Configuration
      properties:
        springConfig:
          title: Spring Configuration
          type: object
          ui:field: SpringInitializer
    - title: Repository Location
      required:
        - repoUrl
      properties:
        repoUrl:
          title: Repository Location
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts:
              - github.com
  steps:
    - id: generate-spring
      name: Generate Spring Boot Project
      action: terasky:spring-initializer
      input:
        type: ${{ parameters.springConfig.type }}
        language: ${{ parameters.springConfig.language }}
        bootVersion: ${{ parameters.springConfig.bootVersion }}
        groupId: ${{ parameters.springConfig.groupId }}
        artifactId: ${{ parameters.springConfig.artifactId }}
        name: ${{ parameters.springConfig.name }}
        description: ${{ parameters.springConfig.description }}
        packageName: ${{ parameters.springConfig.packageName }}
        packaging: ${{ parameters.springConfig.packaging }}
        javaVersion: ${{ parameters.springConfig.javaVersion }}
        dependencies: ${{ parameters.springConfig.dependencies }}
    - id: publish
      name: Publish to Repository  
      action: publish:github
      input:
        description: ${{ parameters.springConfig.description }}
        repoUrl: ${{ parameters.repoUrl }}
        defaultBranch: main
```

## Verification

To verify the installation:

1. Navigate to your software templates
2. Create a new component using a template with the SpringInitializer field
3. Verify that you can:
   - See the Spring Boot configuration form load
   - Select different Spring Boot versions
   - See dependencies change based on version selection
   - Configure project metadata
   - Select and deselect dependencies
   - See dependency counts update
   - Submit the form successfully

## Troubleshooting

Common issues and solutions:

1. **Form Not Loading / CORS Errors**
   - Verify proxy configuration in app-config.yaml
   - Check that `/spring-initializer` endpoint is accessible
   - Ensure `changeOrigin: true` is set in proxy config
   - Check browser console for specific error messages

2. **Dependencies Not Showing**
   - Verify Spring Initializer API is accessible
   - Check that metadata is being fetched successfully
   - Look for error panels in the form
   - Verify Spring Boot version is selected

3. **Incompatible Dependencies Selected**
   - This should not happen - check browser console for errors
   - Verify version comparison logic is working
   - Check that dependency versionRange is being parsed

4. **Backend Action Fails**
   - Verify backend module is installed
   - Check backend logs for detailed error messages
   - Ensure selected dependencies are compatible
   - Verify Spring Initializer API is accessible from backend

## Next Steps

After installation:

1. Configure your proxy settings:
   - Set up secure proxy configuration
   - Configure custom endpoints if needed

2. Create templates:
   - Design templates using the SpringInitializer field
   - Test with different Spring Boot versions
   - Verify dependency selection works

3. Customize:
   - Override default Spring Initializer endpoint
   - Configure proxy paths
   - Set up custom proxy headers if needed

For detailed configuration options, see the [Configuration](./configure.md) guide.
