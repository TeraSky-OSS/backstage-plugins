# Spring Initializer Plugin

The Spring Initializer plugin for Backstage provides a powerful interface for creating Spring Boot applications through Software Templates. It enables teams to discover, configure, and generate Spring Boot projects directly within the Backstage scaffolder, making Spring Boot application creation a seamless part of the service creation process.

## Plugin Components

### Frontend Plugin
The frontend plugin provides a user interface for:

- Discovering available Spring Boot versions and configurations
- Configuring Spring Boot project metadata (groupId, artifactId, etc.)
- Selecting dependencies with smart compatibility filtering
- Version-aware dependency management
- Dynamic form generation based on Spring Initializer API
- Real-time validation of Spring Boot version and dependency compatibility

[Learn more about the frontend plugin](./frontend/about.md)

### Backend Module  
The backend module provides a scaffolder action for:

- Generating Spring Boot projects via Spring Initializer API
- Downloading and extracting project ZIP files
- Error handling with detailed Spring Initializer feedback
- Support for custom Spring Initializer endpoints
- Configurable output paths

[Learn more about the backend module](./backend/about.md)

## Key Features

### Admin Configuration Control
Administrators can enforce company standards through configuration:

1. **Field Defaults**: Set default values for any configurable field
2. **Read-Only Fields**: Lock fields to specific values (groupId, bootVersion, javaVersion, packaging, type, language)
3. **Required Dependencies**: Force include specific dependencies that cannot be removed
4. **Disallowed Dependencies**: Hide specific dependencies from users
5. **Flexible Enforcement**: Mix defaults with user choice for optimal balance

### Dynamic Configuration Discovery
The plugin fetches metadata from the Spring Initializer API (start.spring.io by default) to provide:

1. **Available Spring Boot Versions**: Automatically discover all available versions including SNAPSHOT, Milestone (M), and Release Candidate (RC) versions
2. **Supported Languages**: Java, Kotlin, and Groovy
3. **Project Types**: Maven, Gradle, and Gradle Kotlin
4. **Java Versions**: All supported JDK versions
5. **Dependencies**: Comprehensive list of Spring Boot dependencies with metadata

### Smart Dependency Filtering
- **Version Range Parsing**: Automatically parses dependency version ranges like `[3.5.0,4.1.0-M1)`
- **Compatibility Checking**: Only shows dependencies compatible with the selected Spring Boot version
- **Auto-removal**: Automatically removes incompatible dependencies when changing versions
- **Category Filtering**: Hides entire dependency categories when no compatible dependencies exist
- **Compatibility Indicators**: Shows count of compatible vs. total dependencies per category

### Version Intelligence  
The plugin understands Spring Boot version semantics:
- Correctly orders versions considering suffixes (SNAPSHOT < M < RC < Final)
- Handles inclusive and exclusive version ranges
- Supports complex version range notation
- Prevents selection of incompatible dependency combinations

### Admin Configuration Control
- **Enforce Company Standards**: Lock fields to specific values
- **Set Smart Defaults**: Pre-configure common values
- **Require Dependencies**: Force include security, monitoring, or baseline dependencies
- **Restrict Choices**: Hide dependencies that violate company policies
- **Flexible Enforcement**: Mix locked and flexible fields for optimal UX

### Custom Endpoint Support
- Configure custom Spring Initializer endpoints for private instances
- Full proxy support to avoid CORS issues
- Configurable API paths

## Getting Started

To get started with the Spring Initializer plugin:

1. Follow the [Frontend Installation Guide](./frontend/install.md)
2. Follow the [Backend Installation Guide](./backend/install.md)
3. Configure the plugins using the [Frontend Configuration Guide](./frontend/configure.md) and [Backend Configuration Guide](./backend/configure.md)
4. Start creating Spring Boot applications through your templates

## Documentation Structure

Frontend Plugin  
- [About](./frontend/about.md) - Learn about the plugin's components and features  
- [Installation](./frontend/install.md) - Step-by-step installation guide  
- [Configuration](./frontend/configure.md) - Detailed configuration options

Backend Module  
- [About](./backend/about.md) - Learn about the scaffolder action  
- [Installation](./backend/install.md) - Step-by-step installation guide  
- [Configuration](./backend/configure.md) - Detailed configuration options
