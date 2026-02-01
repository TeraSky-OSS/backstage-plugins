# Configuring the Spring Initializer Backend Module

This guide covers all configuration options for the Spring Initializer backend module.

## Basic Configuration

Add configuration to your `app-config.yaml`:

```yaml
springInitializer:
  # Spring Initializer API endpoint (optional)
  endpoint: 'https://start.spring.io'  # default
```

## Custom Endpoint

For a self-hosted Spring Initializer instance:

```yaml
springInitializer:
  endpoint: 'https://spring-init.internal.company.com'
```

## Per-Action Override

You can override the endpoint in individual template actions:

```yaml
steps:
  - id: generate-spring
    name: Generate Spring Boot Project
    action: terasky:spring-initializer
    input:
      # Override global endpoint
      endpoint: 'https://spring-init-dev.company.com'
      
      # Other parameters
      type: maven-project
      language: java
      bootVersion: '3.5.10'
      groupId: com.example
      artifactId: demo
```

## Environment-Specific Configuration

Configure different endpoints for different environments:

```yaml
# app-config.yaml (development)
springInitializer:
  endpoint: 'https://start-dev.spring.io'
```

```yaml
# app-config.production.yaml
springInitializer:
  endpoint: 'https://start.spring.io'
```

## Action Parameters

### Required Parameters

None - all parameters are optional and use Spring Initializer defaults.

### Optional Parameters

Configure these in your template steps:

```yaml
steps:
  - id: generate-spring
    name: Generate Spring Boot Project
    action: terasky:spring-initializer
    input:
      # Project Configuration
      type: maven-project              # maven-project, gradle-project, gradle-project-kotlin
      language: java                   # java, kotlin, groovy
      bootVersion: '3.5.10'           # Any available Spring Boot version
      
      # Maven/Gradle Coordinates
      groupId: com.example            # Maven group ID
      artifactId: myapp               # Maven artifact ID
      version: '0.0.1-SNAPSHOT'       # Project version
      
      # Project Metadata
      name: 'My Application'          # Project name
      description: 'My Spring Boot application'
      packageName: com.example.myapp  # Base package
      
      # Build Configuration
      packaging: jar                   # jar or war
      javaVersion: '17'               # 17, 21, 25
      
      # Dependencies
      dependencies: 'web,data-jpa,postgresql,actuator'  # Comma-separated
      
      # Output Configuration
      outputPath: '.'                 # Relative to workspace
      
      # Endpoint Override
      endpoint: 'https://start.spring.io'  # Optional override
```

### Default Values

If parameters are not provided, the action uses these defaults:

```yaml
type: 'maven-project'
language: 'java'
bootVersion: '3.5.10'
groupId: 'com.example'
artifactId: 'demo'
version: '0.0.1-SNAPSHOT'
name: 'demo'
description: 'Demo project for Spring Boot'
packageName: 'com.example.demo'
packaging: 'jar'
javaVersion: '17'
```

## Template Examples

### Minimal Template

```yaml
steps:
  - id: generate-spring
    name: Generate Spring Boot Project
    action: terasky:spring-initializer
    input:
      dependencies: 'web'
```

### Complete Template

```yaml
steps:
  - id: fetch-base
    name: Fetch Base
    action: fetch:template
    input:
      url: ./skeleton
      values:
        name: ${{ parameters.name }}
        
  - id: generate-spring
    name: Generate Spring Boot Project
    action: terasky:spring-initializer
    input:
      type: ${{ parameters.projectType }}
      language: ${{ parameters.language }}
      bootVersion: ${{ parameters.bootVersion }}
      groupId: ${{ parameters.groupId }}
      artifactId: ${{ parameters.artifactId }}
      name: ${{ parameters.name }}
      description: ${{ parameters.description }}
      packageName: ${{ parameters.packageName }}
      packaging: ${{ parameters.packaging }}
      javaVersion: ${{ parameters.javaVersion }}
      dependencies: ${{ parameters.dependencies }}
      outputPath: './spring-app'
      
  - id: publish
    name: Publish to Repository
    action: publish:github
    input:
      description: ${{ parameters.description }}
      repoUrl: ${{ parameters.repoUrl }}
      defaultBranch: main
      sourcePath: './spring-app'
```

### With Frontend Plugin

Complete integration with frontend plugin:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: spring-boot-service
  title: Spring Boot Microservice
spec:
  owner: platform-team
  type: service
  
  parameters:
    - title: Spring Boot Configuration
      properties:
        springConfig:
          title: Spring Configuration
          type: object
          ui:field: SpringInitializer
          
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
```

## Advanced Configuration

### Authentication

If your Spring Initializer instance requires authentication:

```yaml
springInitializer:
  endpoint: 'https://spring-init.company.com'
  
# Configure authentication at the HTTP client level
# (This depends on your specific setup)
```

### Timeout Configuration

Configure HTTP timeouts if needed (requires custom implementation):

```typescript
// In a custom action wrapper
const response = await fetch(url, {
  timeout: 30000,  // 30 seconds
});
```

### Logging Configuration

Control log verbosity in your Backstage backend configuration:

```yaml
backend:
  # Increase log level for debugging
  log:
    level: debug
```

## Error Handling

### Handling API Errors

The action provides detailed error messages:

```
Error: Failed to fetch Spring project: 400 Bad Request

Spring Initializer error: Dependency 'spring-ai-anthropic' is not compatible with Spring Boot 4.1.0-SNAPSHOT
```

### Logging Details

The action logs:
- Full request URL
- All parameters being sent
- Error responses from API
- Extraction progress
- Output paths

Example logs:

```
info: Generating Spring Boot project with artifact: myapp
info: Fetching Spring project from: https://start.spring.io/starter.zip?type=maven-project&language=java&bootVersion=3.5.10&...
info: Parameters: {"type":"maven-project","language":"java","bootVersion":"3.5.10",...}
info: Spring project extracted to: /workspace/spring-app
```

## Best Practices

1. **Use Frontend Plugin**: Always pair with frontend plugin for dependency compatibility
2. **Validate Inputs**: Use frontend validation before calling action
3. **Set Reasonable Defaults**: Provide sensible defaults in templates
4. **Handle Errors Gracefully**: Check for action errors in templates
5. **Document Dependencies**: Document available dependency IDs
6. **Test Configurations**: Test with various Spring Boot versions
7. **Monitor API Health**: Monitor Spring Initializer API availability
8. **Use Specific Versions**: Pin Spring Boot versions when possible

## Troubleshooting Configuration

### Verify Endpoint

```bash
# Test endpoint accessibility
curl -I https://start.spring.io
```

### Check Configuration Loading

```bash
# Check backend logs for configuration
tail -f packages/backend/dist/bundle.js.log | grep -i spring
```

### Test Action Directly

```bash
# List available actions
curl http://localhost:7007/api/scaffolder/v2/actions | jq '.[] | select(.id == "terasky:spring-initializer")'
```

## Next Steps

- Review the [About](./about.md) page for technical details
- Check the [Installation](./install.md) guide
- Set up the [Frontend Plugin](../frontend/install.md)
- Create your first Spring Boot template
- Test error handling with incompatible dependencies
- Monitor action execution in production
