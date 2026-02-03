# GitOps Manifest Updater Plugin

The GitOps Manifest Updater plugin provides a powerful form component for updating Kubernetes manifests in Git repositories. It dynamically generates forms based on OpenAPI schemas from Custom Resource Definitions (CRDs), making it easy to update manifest specifications while maintaining GitOps best practices.

## Features

- **Dynamic Form Generation**: Automatically create forms from CRD OpenAPI schemas
- **Multiple API Formats**: Supports both CRD-type and OpenAPI-type API entities (requires api-docs-module-crd for CRD-type)
- **Git Integration**: Seamless integration with GitHub and GitLab through Backstage's SCM integration
- **Automated PR Creation**: Automatically create pull requests with manifest changes
- **Flexible Configuration**: Support for both entity annotations and manual URL input
- **Structure Preservation**: Maintains file paths and directory structure
- **Scaffolder Integration**: Works as a field extension in Backstage's scaffolder

## Plugin Components

### Frontend Plugin
The plugin provides frontend components for:

- Dynamic form generation and validation
- Git repository integration
- Pull request creation and management
- Manifest file handling

[Learn more about the frontend plugin](./frontend/about.md)

## Documentation Structure
- [About](./frontend/about.md)
- [Installation](./frontend/install.md)
- [Configuration](./frontend/configure.md)

## Example Usage

The plugin can be used in various scenarios:

1. **Component Updates**
    - Update deployment configurations
    - Modify resource requests/limits
    - Change environment variables

2. **Infrastructure Management**
    - Update Crossplane resources
    - Modify cluster configurations
    - Adjust infrastructure settings

3. **Application Configuration**
    - Update application settings
    - Modify feature flags
    - Change runtime parameters

## Getting Started

To get started with the GitOps Manifest Updater plugin:

1. Install the frontend plugin
2. Configure scaffolder integration
3. Set up Git repository access
4. Start using dynamic manifest forms

For detailed installation and configuration instructions, refer to the frontend documentation linked above.
