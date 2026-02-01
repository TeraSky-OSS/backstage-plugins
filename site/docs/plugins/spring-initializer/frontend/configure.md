# Configuring the Spring Initializer Frontend Plugin

This guide covers all configuration options for the Spring Initializer frontend plugin.

## Basic Configuration

Add configuration to your `app-config.yaml`:

```yaml
springInitializer:
  # Custom Spring Initializer endpoint (optional)
  endpoint: 'https://start.spring.io'  # default
  
  # Proxy path for API calls (optional)
  proxyPath: '/spring-initializer'     # default
  
  # Field defaults and restrictions (optional)
  defaultGroupId: 'com.mycompany'      # Default group ID
  defaultGroupIdReadOnly: false         # Make field read-only
  
  defaultBootVersion: '3.5.10'         # Default Spring Boot version
  defaultBootVersionReadOnly: false     # Enforce this version
  
  defaultJavaVersion: '17'             # Default Java version
  defaultJavaVersionReadOnly: false     # Lock to specific version
  
  defaultPackaging: 'jar'              # Default packaging
  defaultPackagingReadOnly: false       # Enforce packaging type
  
  defaultType: 'maven-project'         # Default project type
  defaultTypeReadOnly: false            # Lock project type
  
  defaultLanguage: 'java'              # Default language
  defaultLanguageReadOnly: false        # Enforce language
  
  # Dependency restrictions (optional)
  requiredDependencies:                # Always included, cannot be removed
    - web
    - actuator
  
  disallowedDependencies:              # Never shown to users
    - devtools
    - lombok
```

## Proxy Configuration

Configure the proxy to avoid CORS issues:

```yaml
proxy:
  endpoints:
    '/spring-initializer':
      target: 'https://start.spring.io'
      changeOrigin: true
```

### Custom Endpoint with Proxy

For a self-hosted Spring Initializer:

```yaml
springInitializer:
  endpoint: 'https://spring-init.internal.company.com'
  proxyPath: '/spring-initializer'

proxy:
  endpoints:
    '/spring-initializer':
      target: 'https://spring-init.internal.company.com'
      changeOrigin: true
      # Optional: Add authentication headers
      headers:
        Authorization: 'Bearer ${SPRING_INIT_TOKEN}'
```

## Template Configuration

### Basic Usage

Minimal template configuration:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: spring-boot-app
  title: Spring Boot Application
spec:
  parameters:
    - title: Spring Boot Configuration
      properties:
        springConfig:
          title: Spring Configuration
          type: object
          ui:field: SpringInitializer
```

### With Default Values

You can't set default values directly on the field, but you can guide users:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: spring-boot-app
  title: Spring Boot Application
spec:
  parameters:
    - title: Spring Boot Configuration
      description: |
        Configure your Spring Boot project. 
        Recommended: Spring Boot 3.5.10, Java 17, Maven
      properties:
        springConfig:
          title: Spring Configuration
          type: object
          ui:field: SpringInitializer
```

### Complete Template Example

Full template with all steps:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: spring-boot-microservice
  title: Spring Boot Microservice
  description: Create a new Spring Boot microservice
  tags:
    - java
    - spring-boot
    - microservice
spec:
  owner: platform-team
  type: service
  
  parameters:
    - title: Service Information
      required:
        - serviceName
      properties:
        serviceName:
          title: Service Name
          type: string
          description: Name of your microservice
          
    - title: Spring Boot Configuration
      properties:
        springConfig:
          title: Spring Configuration
          type: object
          ui:field: SpringInitializer
          
    - title: Repository
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
              - gitlab.com
              
  steps:
    - id: generate-spring
      name: Generate Spring Boot Project
      action: terasky:spring-initializer
      input:
        type: ${{ parameters.springConfig.type }}
        language: ${{ parameters.springConfig.language }}
        bootVersion: ${{ parameters.springConfig.bootVersion }}
        groupId: com.company.${{ parameters.serviceName }}
        artifactId: ${{ parameters.serviceName }}
        name: ${{ parameters.serviceName }}
        description: ${{ parameters.springConfig.description }}
        packageName: ${{ parameters.springConfig.packageName }}
        packaging: ${{ parameters.springConfig.packaging }}
        javaVersion: ${{ parameters.springConfig.javaVersion }}
        dependencies: ${{ parameters.springConfig.dependencies }}
        
    - id: publish
      name: Publish to Git
      action: publish:github
      input:
        description: ${{ parameters.springConfig.description }}
        repoUrl: ${{ parameters.repoUrl }}
        defaultBranch: main
        
    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: '/catalog-info.yaml'
        
  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in Catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
```

## Admin Configuration Options

### Field Defaults and Restrictions

Control default values and field editability:

#### Default Values Only

Set defaults without restricting user choice:

```yaml
springInitializer:
  defaultGroupId: 'com.mycompany'        # Users can change this
  defaultGroupIdReadOnly: false           # Field is editable
  
  defaultBootVersion: '3.5.10'           # Recommended version
  defaultBootVersionReadOnly: false       # Users can select other versions
```

#### Read-Only (Enforced) Values

Lock fields to specific values:

```yaml
springInitializer:
  defaultGroupId: 'com.mycompany'        # Enforced value
  defaultGroupIdReadOnly: true            # Users cannot change this
  
  defaultBootVersion: '3.5.10'           # Only this version allowed
  defaultBootVersionReadOnly: true        # Field is disabled
  
  defaultJavaVersion: '17'               # Company standard
  defaultJavaVersionReadOnly: true        # Locked to Java 17
  
  defaultPackaging: 'jar'                # Only JAR packaging
  defaultPackagingReadOnly: true          # WAR not available
  
  defaultType: 'maven-project'           # Maven only
  defaultTypeReadOnly: true               # No Gradle option
  
  defaultLanguage: 'java'                # Java only
  defaultLanguageReadOnly: true           # No Kotlin/Groovy
```

### Dependency Management

Control which dependencies are available:

#### Required Dependencies

Always include specific dependencies (users cannot remove):

```yaml
springInitializer:
  requiredDependencies:
    - web                            # Always include Spring Web
    - actuator                       # Always include Actuator
    - security                       # Always include Security
```

These dependencies:
- Are automatically selected when the form loads
- Appear with blue "(Required)" label
- Cannot be unchecked by users
- Cannot be removed from selected dependencies
- Remain visible and checked at all times

#### Disallowed Dependencies

Show but disable specific dependencies from users:

```yaml
springInitializer:
  disallowedDependencies:
    - devtools                       # Disallow DevTools
    - lombok                         # Disallow Lombok
    - h2                            # Disallow H2 database
```

These dependencies:
- Are shown in dependency lists but disabled
- Display red "(Disallowed by policy)" label
- Cannot be checked by users
- Appear grayed out (60% opacity)
- Help users understand organizational policies

#### Combined Example

Enforce standards while allowing flexibility:

```yaml
springInitializer:
  defaultGroupId: 'com.mycompany'
  defaultGroupIdReadOnly: true       # Company namespace enforced
  
  defaultBootVersion: '3.5.10'
  defaultBootVersionReadOnly: false  # Allow version selection
  
  defaultJavaVersion: '17'
  defaultJavaVersionReadOnly: true   # Java 17 only (company standard)
  
  defaultPackaging: 'jar'
  defaultPackagingReadOnly: false    # Allow JAR/WAR choice
  
  requiredDependencies:
    - web                            # Every app needs Spring Web
    - actuator                       # Monitoring required
    - micrometer-registry-prometheus # Prometheus metrics required
  
  disallowedDependencies:
    - devtools                       # Not for production templates
    - h2                            # Use real databases
```

## Advanced Configuration

### Complete Example with All Options

```yaml
springInitializer:
  endpoint: 'https://start.spring.io'
  proxyPath: '/spring-initializer'
  
  defaultGroupId: 'com.acme.services'
  defaultGroupIdReadOnly: true
  defaultBootVersion: '3.5.10'
  defaultBootVersionReadOnly: false
  defaultJavaVersion: '17'
  defaultJavaVersionReadOnly: true
  defaultPackaging: 'jar'
  defaultPackagingReadOnly: true
  defaultType: 'maven-project'
  defaultTypeReadOnly: false
  defaultLanguage: 'java'
  defaultLanguageReadOnly: false
  
  requiredDependencies:
    - web
    - actuator
    - security
    - data-jpa
    - postgresql
  
  disallowedDependencies:
    - devtools
    - h2
    - lombok
```

### Multiple Environments

Different endpoints for different environments:

```yaml
# Development
springInitializer:
  endpoint: 'https://start-dev.spring.io'
  proxyPath: '/spring-initializer'

---
# Production
springInitializer:
  endpoint: 'https://start.spring.io'
  proxyPath: '/spring-initializer'
```

### Custom Headers

Add custom headers to proxy requests:

```yaml
proxy:
  endpoints:
    '/spring-initializer':
      target: 'https://start.spring.io'
      changeOrigin: true
      headers:
        X-Custom-Header: 'value'
        Authorization: 'Bearer ${API_TOKEN}'
```

## Field Output

The SpringInitializer field outputs an object with these properties:

```typescript
{
  type: string,              // Project type: maven-project, gradle-project, gradle-project-kotlin
  language: string,          // Language: java, kotlin, groovy
  bootVersion: string,       // Spring Boot version: e.g., "3.5.10"
  groupId: string,           // Maven group: e.g., "com.example"
  artifactId: string,        // Maven artifact: e.g., "demo"
  version: string,           // Project version: e.g., "0.0.1-SNAPSHOT"
  name: string,              // Project name
  description: string,       // Project description
  packageName: string,       // Base package: e.g., "com.example.demo"
  packaging: string,         // Packaging: jar, war
  javaVersion: string,       // Java version: 17, 21, 25
  dependencies: string       // Comma-separated IDs: "web,data-jpa,security"
}
```

## Use Cases

### Enterprise Standards Enforcement

Lock down critical fields to enforce company standards:

```yaml
springInitializer:
  defaultGroupId: 'com.enterprise'
  defaultGroupIdReadOnly: true
  defaultJavaVersion: '17'
  defaultJavaVersionReadOnly: true
  defaultType: 'maven-project'
  defaultTypeReadOnly: true
  
  requiredDependencies:
    - web
    - actuator
    - security
    - micrometer-registry-prometheus
  
  disallowedDependencies:
    - devtools
    - h2
```

### Development Template

Allow flexibility for development:

```yaml
springInitializer:
  defaultGroupId: 'com.example'
  defaultGroupIdReadOnly: false
  defaultBootVersion: '4.0.2'
  defaultBootVersionReadOnly: false
  
  requiredDependencies:
    - web
    - devtools
  
  disallowedDependencies: []
```

### Microservices Template

Standardize microservices:

```yaml
springInitializer:
  defaultPackaging: 'jar'
  defaultPackagingReadOnly: true
  
  requiredDependencies:
    - web
    - webflux
    - actuator
    - micrometer-registry-prometheus
    - cloud-eureka-client
    - cloud-config-client
  
  disallowedDependencies:
    - devtools
    - h2
```

## Best Practices

### Configuration
1. **Always configure the proxy** to avoid CORS issues
2. **Use secure token storage** for authentication with private Spring Initializer instances
3. **Test with different Spring Boot versions** to ensure compatibility
4. **Keep proxy configuration secure** with proper secret management

### Admin Controls
5. **Use read-only fields** to enforce company standards (groupId, javaVersion, etc.)
6. **Use required dependencies** for baseline functionality (actuator, security, etc.)
7. **Use disallowed dependencies** to prevent policy violations (devtools in production, embedded databases, etc.)
8. **Balance enforcement with flexibility** - lock critical fields, allow choice where appropriate

### User Experience
9. **Document why restrictions exist** - users see disabled dependencies, explain the reasoning in template descriptions
10. **Test configuration with real users** before enforcing restrictions
11. **Use meaningful defaults** even when fields are editable
12. **Leverage transparency** - the new UI shows all options with clear explanations

### Templates
13. **Document recommended configurations** in template descriptions
14. **Show users what's enforced** in template metadata
15. **Monitor Spring Initializer API** availability

## Configuration Behavior

### How Configurations Interact

1. **Defaults Override API**: Config defaults take precedence over Spring Initializer API defaults
2. **Read-Only Locks Value**: When `readOnly: true`, the field is disabled and users cannot change it
3. **Required Dependencies**: Always selected, cannot be unchecked, preserved during version changes
4. **Disallowed Dependencies**: Filtered out before version compatibility checks
5. **Version Compatibility**: Applied after required/disallowed filtering

### Configuration Priority

```
Admin Config (readOnly) 
  → Admin Config (default value)
    → Spring Initializer API (default value)
      → User Selection
```

### Dependency Filter Order

```
1. Disallowed dependencies removed
2. Version compatibility checked
3. Required dependencies enforced (always selected)
4. User can select from remaining compatible dependencies
```

## Example Configurations

### Production Microservices

```yaml
springInitializer:
  endpoint: 'https://start.spring.io'
  proxyPath: '/spring-initializer'
  
  defaultGroupId: 'com.company.services'
  defaultGroupIdReadOnly: true
  defaultBootVersion: '3.5.10'
  defaultBootVersionReadOnly: true
  defaultJavaVersion: '17'
  defaultJavaVersionReadOnly: true
  defaultPackaging: 'jar'
  defaultPackagingReadOnly: true
  defaultType: 'maven-project'
  defaultTypeReadOnly: false
  defaultLanguage: 'java'
  defaultLanguageReadOnly: false
  
  requiredDependencies:
    - web
    - actuator
    - security
    - data-jpa
    - postgresql
    - micrometer-registry-prometheus
    - cloud-eureka-client
  
  disallowedDependencies:
    - devtools
    - h2
    - hsqldb
    - derby
```

### Developer Sandbox

```yaml
springInitializer:
  defaultGroupId: 'com.example.dev'
  defaultGroupIdReadOnly: false
  defaultBootVersion: '4.0.2'
  defaultBootVersionReadOnly: false
  
  requiredDependencies:
    - web
    - devtools
  
  disallowedDependencies: []
```

### Data Processing Services

```yaml
springInitializer:
  defaultGroupId: 'com.company.data'
  defaultGroupIdReadOnly: true
  defaultJavaVersion: '21'
  defaultJavaVersionReadOnly: true
  
  requiredDependencies:
    - web
    - data-jpa
    - postgresql
    - batch
    - cloud-stream
  
  disallowedDependencies:
    - web-services
    - jersey
```

## Troubleshooting Configuration

### Verify Configuration Loading

```bash
# Check if config is being read
# Look in browser console for configuration values
# The form will show "(Read-only)" labels if config is applied
```

### Test Required Dependencies

1. Open a template with SpringInitializer field
2. Check if required dependencies are pre-selected
3. Try to uncheck them (should not be possible)
4. Look for blue "(Required)" label on checkboxes and chips
5. Verify they appear at full opacity

### Test Disallowed Dependencies

1. Open dependency categories
2. Disallowed dependencies should appear but be disabled
3. Look for red "(Disallowed by policy)" label
4. Verify they appear grayed out (60% opacity)
5. Try to check them (should not be possible)
6. Check count shows "X/Y available" where Y excludes disallowed

### Test Read-Only Fields

1. Look for "(Read-only)" in field labels
2. Try to click/edit the field (should be disabled)
3. Verify value matches configuration
4. Check field appears grayed out

### Test Version Compatibility

1. Select a Spring Boot version (e.g., 3.5.10)
2. Open dependency categories
3. Some dependencies should show orange "(Incompatible: requires X.X.X)" label
4. These should be disabled and grayed out
5. Change Spring Boot version and watch dependencies update
6. Previously incompatible deps may become available

### Check Proxy Configuration

```bash
# Test proxy endpoint
curl -H "Accept: application/vnd.initializr.v2.2+json" \
  http://localhost:7007/api/proxy/spring-initializer
```

### Verify Backend Configuration

Check backend logs for configuration issues:

```bash
# Look for Spring Initializer configuration messages
tail -f packages/backend/dist/bundle.js.log | grep -i spring
```

### Test Metadata Fetch

```bash
# Test direct API access
curl -H "Accept: application/vnd.initializr.v2.2+json" \
  https://start.spring.io
```

## Next Steps

- Review the [About](./about.md) page for feature details
- Check the [Installation](./install.md) guide
- Set up the [Backend Module](../backend/install.md)
- Create your first Spring Boot template
- Test dependency compatibility filtering
