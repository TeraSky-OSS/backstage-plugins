# Spring Initializer Backend Module

The backend component of the Spring Initializer plugin provides a scaffolder action that integrates with the Spring Initializer API to generate Spring Boot projects.

## Scaffolder Action

### `terasky:spring-initializer`

This action generates a Spring Boot project by calling the Spring Initializer API, downloading the generated ZIP file, and extracting it to the workspace.

## Features

### Project Generation
- Calls Spring Initializer API with project configuration
- Downloads generated project as ZIP file
- Automatically extracts ZIP contents
- Configurable output paths
- Support for custom Spring Initializer endpoints

### Smart Parameter Handling
- Filters out empty/undefined parameters
- Uses sensible defaults for missing values
- Validates parameter combinations
- Properly encodes special characters in URLs

### Error Handling
- Detailed error messages from Spring Initializer API
- Logs full request URL for debugging
- Logs all parameters being sent
- Parses and displays Spring Initializer error responses
- Provides context for troubleshooting

### Configuration Support
- Custom endpoint URLs
- Per-action endpoint override
- Global configuration defaults
- Environment-specific settings

## Action Schema

### Input Parameters

All parameters are optional and will use Spring Initializer defaults if not provided:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `type` | string | Project type | `maven-project`, `gradle-project`, `gradle-project-kotlin` |
| `language` | string | Programming language | `java`, `kotlin`, `groovy` |
| `bootVersion` | string | Spring Boot version | `3.5.10`, `4.0.2` |
| `groupId` | string | Maven/Gradle group ID | `com.example` |
| `artifactId` | string | Maven/Gradle artifact ID | `demo` |
| `version` | string | Project version | `0.0.1-SNAPSHOT` |
| `name` | string | Project name | `Demo Application` |
| `description` | string | Project description | `Demo project for Spring Boot` |
| `packageName` | string | Base package name | `com.example.demo` |
| `packaging` | string | Packaging type | `jar`, `war` |
| `javaVersion` | string | Java version | `17`, `21`, `25` |
| `dependencies` | string | Comma-separated dependency IDs | `web,data-jpa,security` |
| `outputPath` | string | Output path relative to workspace | `.` (default) |
| `endpoint` | string | Custom Spring Initializer URL | `https://start.spring.io` |

### Output Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectPath` | string | Path where project was extracted relative to workspace |

## Technical Details

### Request Building

The action builds a URL with query parameters:

```typescript
const params = new URLSearchParams();
params.append('type', input.type || 'maven-project');
params.append('language', input.language || 'java');
// ... more parameters

const url = `${endpoint}/starter.zip?${params.toString()}`;
```

### Dependency Handling

Dependencies are sent as a comma-separated list:

```typescript
const dependencies = 'web,data-jpa,security,actuator';
params.append('dependencies', dependencies);
```

### ZIP Extraction

Uses `adm-zip` to extract project files:

```typescript
const buffer = await response.buffer();
const zip = new AdmZip(buffer);
zip.extractAllTo(outputPath, true);
```

### Error Response Parsing

Parses Spring Initializer error responses:

```json
{
  "timestamp": "2026-02-01T18:26:22.638+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Dependency 'spring-ai-anthropic' is not compatible with Spring Boot 4.1.0-SNAPSHOT",
  "path": "/starter.zip"
}
```

## Integration

The action integrates with:

1. **Spring Initializer API**: Fetches project ZIP files
2. **Backstage Config**: Reads endpoint configuration
3. **File System**: Writes extracted files to workspace
4. **Scaffolder Context**: Provides logging and workspace access

## Usage Example

```yaml
steps:
  - id: generate-spring
    name: Generate Spring Boot Project
    action: terasky:spring-initializer
    input:
      type: maven-project
      language: java
      bootVersion: '3.5.10'
      groupId: com.example
      artifactId: myapp
      name: My Application
      description: My Spring Boot application
      packageName: com.example.myapp
      packaging: jar
      javaVersion: '17'
      dependencies: web,data-jpa,postgresql,actuator
      outputPath: .
```

## Logging

The action provides detailed logging:

```
info: Generating Spring Boot project with artifact: myapp
info: Fetching Spring project from: https://start.spring.io/starter.zip?type=maven-project&language=java&...
info: Parameters: {"type":"maven-project","language":"java",...}
info: Spring project extracted to: /workspace
```

## Dependencies

- `@backstage/plugin-scaffolder-node`: Scaffolder action framework
- `@backstage/backend-plugin-api`: Backend plugin utilities
- `node-fetch`: HTTP client for API calls
- `adm-zip`: ZIP file extraction
- `fs-extra`: Enhanced file system operations

For installation and configuration details, see the [Installation](./install.md) and [Configuration](./configure.md) guides.
