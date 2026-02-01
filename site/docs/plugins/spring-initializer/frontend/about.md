# Spring Initializer Frontend Plugin

The frontend component of the Spring Initializer plugin provides a rich user interface for discovering and configuring Spring Boot projects within Backstage Software Templates.

## Components

### SpringInitializerForm

The main form component that provides:

- Dynamic metadata fetching from Spring Initializer API
- Project type selection (Maven, Gradle, Gradle Kotlin)
- Language selection (Java, Kotlin, Groovy)
- Spring Boot version selection with full version history
- Project metadata configuration (groupId, artifactId, name, description, etc.)
- Packaging type selection (JAR, WAR)
- Java version selection
- Dependency selection with categorization

### Smart Dependency Management

The component provides intelligent dependency filtering:

- **Version Range Parsing**: Parses ranges like `[3.5.0,4.1.0-M1)`, `4.0.0`, etc.
- **Compatibility Checking**: Only displays dependencies compatible with selected Spring Boot version
- **Auto-removal**: Automatically deselects incompatible dependencies when version changes
- **Category Filtering**: Hides categories with no compatible dependencies
- **Count Display**: Shows compatible/total dependency counts per category

## Features

### Admin Configuration Control

Administrators can control the form behavior through app-config.yaml:

#### Field Defaults and Read-Only Mode
- Set default values for any field
- Make fields read-only to enforce company standards
- Configurable fields: groupId, bootVersion, javaVersion, packaging, type, language

Example:
```yaml
springInitializer:
  defaultGroupId: 'com.mycompany'
  defaultGroupIdReadOnly: true
  defaultJavaVersion: '17'
  defaultJavaVersionReadOnly: true
```

#### Dependency Management
- **Required Dependencies**: Force include dependencies that cannot be removed
- **Disallowed Dependencies**: Hide dependencies from the UI
- Helps enforce security policies and company standards

Example:
```yaml
springInitializer:
  requiredDependencies:
    - web
    - actuator
    - security
  disallowedDependencies:
    - devtools
    - h2
```

### Dynamic Metadata Discovery
- Automatic fetching from Spring Initializer API
- Support for custom endpoints
- Proxy integration to avoid CORS issues
- Real-time metadata updates
- Error handling and retry logic

### Version-Aware Intelligence
The plugin understands Spring Boot version semantics:
- Correctly orders: `4.1.0` > `4.1.0-RC1` > `4.1.0-M1` > `4.1.0-SNAPSHOT`
- Parses version ranges:
  - `[3.5.0,4.0.0)` = >= 3.5.0 and < 4.0.0
  - `4.0.0` = >= 4.0.0
  - `[3.5.0,4.2.0-M1)` = >= 3.5.0 and < 4.2.0-M1
- Handles inclusive `[` and exclusive `)` range boundaries

### Project Configuration
- **Group ID**: Maven/Gradle group identifier
- **Artifact ID**: Project artifact name
- **Name**: Human-readable project name
- **Description**: Project description
- **Package Name**: Base Java package
- **Version**: Project version number
- **Packaging**: JAR or WAR packaging
- **Java Version**: JDK version selection

### Dependency Selection
- Categorized dependency lists (Web, Data, Security, etc.)
- Multi-select checkboxes with intelligent status indicators
- Dependency descriptions
- **Transparent Filtering**: All dependencies shown with visual explanations:
  - ✅ Available dependencies: Normal appearance, can be selected
  - 🔵 Required dependencies: Pre-selected with blue "(Required)" label
  - 🔴 Disallowed dependencies: Disabled with red "(Disallowed by policy)" label
  - 🟠 Incompatible dependencies: Disabled with orange label showing version requirement
- Selected dependencies summary with remove chips
- Category accordion with availability counts (e.g., "5/12 available")

## API Integration

The plugin integrates with Backstage APIs:

```typescript
// Uses discoveryApiRef to find proxy endpoint
const backendUrl = await discoveryApi.getBaseUrl('proxy');
const proxyPath = config.getOptionalString('springInitializer.proxyPath') || '/spring-initializer';

// Fetches metadata with proper headers
const response = await fetchApi.fetch(`${backendUrl}${proxyPath}`, {
  headers: {
    'Accept': 'application/vnd.initializr.v2.2+json',
  },
});
```

## Form Output

The form outputs a complete Spring Boot configuration object:

```typescript
{
  type: string,              // e.g., 'maven-project'
  language: string,          // e.g., 'java'
  bootVersion: string,       // e.g., '3.5.10'
  groupId: string,           // e.g., 'com.example'
  artifactId: string,        // e.g., 'demo'
  version: string,           // e.g., '0.0.1-SNAPSHOT'
  name: string,              // e.g., 'Demo Application'
  description: string,       // e.g., 'Demo project'
  packageName: string,       // e.g., 'com.example.demo'
  packaging: string,         // e.g., 'jar'
  javaVersion: string,       // e.g., '17'
  dependencies: string       // e.g., 'web,data-jpa,security'
}
```

## Integration

The plugin integrates with Backstage's Software Templates system through:

1. Custom field extension (`SpringInitializer`)
2. Form validation and state management
3. Configuration API for endpoint customization
4. Discovery API for proxy URL resolution
5. Fetch API for secure HTTP requests

For installation and configuration details, see the [Installation](./install.md) and [Configuration](./configure.md) guides.
