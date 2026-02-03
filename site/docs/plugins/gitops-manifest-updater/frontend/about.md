# GitOps Manifest Updater Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-gitops-manifest-updater/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-gitops-manifest-updater)

## Overview

The GitOps Manifest Updater frontend plugin provides a dynamic form component that integrates with Backstage's scaffolder to enable easy updates to Kubernetes manifests in Git repositories. The plugin uses OpenAPI schemas from CRDs to generate intuitive forms for updating manifest specifications.

## Features

### Dynamic Form Generation
- Automatic form creation from CRD schemas
- Support for CRD-type API entities (with full CRD YAML)
- Support for OpenAPI-type API entities (with generated OpenAPI specs)
- Field validation based on OpenAPI v3 schemas
- Support for complex data structures
- Custom field renderers

### Git Integration
- GitHub repository support
- Automatic PR creation
- Branch management
- File path preservation

### Scaffolder Integration
- Custom field extension
- Template compatibility
- Context-aware defaults
- Entity data integration

### User Interface
- Intuitive form layout
- Real-time validation
- Error handling
- Progress feedback

## Components

### GitOpsManifestUpdaterExtension
The main component that provides:

- Form generation and handling
- Git repository integration
- PR creation workflow
- Schema validation

Example usage:
```typescript
<ScaffolderFieldExtensions>
  <GitOpsManifestUpdaterExtension />
</ScaffolderFieldExtensions>
```

### Form Generation
The plugin generates forms based on:

- CRD OpenAPI schemas
- Field definitions
- Validation rules
- Default values

### Repository Integration
Handles repository operations:

- File reading
- Change tracking
- PR creation
- Branch management

## Technical Details

### Integration Points
- Backstage Scaffolder
- GitHub API
- OpenAPI Schema Parser
- Form System

### Component Props

#### GitOpsManifestUpdaterExtension
- Integrates with scaffolder field extensions
- Handles form state management
- Processes manifest updates
- Creates pull requests

### Schema Handling
- OpenAPI schema parsing
- Form field mapping
- Validation rules
- Default value handling

## User Experience

### Manifest Updates
1. Select target repository
2. Choose manifest file
3. Update fields in form
4. Submit changes

### Pull Request Creation
1. Changes detected
2. Branch created
3. PR generated
4. Review and merge

### Form Interaction
1. Dynamic field rendering
2. Real-time validation
3. Error feedback
4. Submit confirmation

## Example Integrations

### Entity Page Integration
```typescript
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/scaffolder" title="Entity Scaffolder">
      <EntityScaffolderContent
        templateGroupFilters={[
          {
            title: 'Management Templates',
            filter: (entity, template) =>
              template.metadata?.labels?.target === 'component',
          },
        ]}
        buildInitialState={entity => ({
          entity: stringifyEntityRef(entity)
        })}
        ScaffolderFieldExtensions={
          <ScaffolderFieldExtensions>
            <GitOpsManifestUpdaterExtension />
          </ScaffolderFieldExtensions>
        }
      />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### Template Integration
```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: update-manifest
  title: Update Kubernetes Manifest
spec:
  parameters:
    - title: Update Manifest
      properties:
        manifestUpdate:
          title: Manifest Update
          type: string
          ui:field: GitOpsManifestUpdater
          ui:options:
            repositoryUrl: ${{ parameters.repoUrl }}
            branch: main
            path: manifests/
```

For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).
