# API Docs Module - CRD Frontend

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-api-docs-module-crd/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-api-docs-module-crd)

## Overview

The API Docs Module for CRDs is a frontend module that extends the Backstage API Docs plugin to provide comprehensive visualization and exploration of Kubernetes Custom Resource Definitions. It renders CRD schemas in an interactive interface inspired by doc.crds.dev, making it easy for developers to understand and use custom Kubernetes resources.

## Features

### Interactive Schema Visualization
- Expandable/collapsible property tree
- Type and description display for each property
- Required field indicators
- Nested object and array support
- Anchor links for sharing specific properties

### Multi-Version Support
- Version selector for CRDs with multiple versions
- Automatic detection of storage and served versions
- Per-version schema rendering
- Version badges (storage/served)

### Example YAML Generation
- One-click YAML manifest generation
- Proper structure for all property types
- Empty arrays for simple types
- Nested object formatting
- Direct clipboard copy

### User Experience
- Dark mode support
- Expand/collapse all controls
- Copy example YAML button
- Link sharing for specific properties
- Responsive design

## Components

### CrdDefinitionWidget
The main component that renders CRD definitions. It automatically:
- Parses CRD YAML from API entity definitions
- Detects Kubernetes `apiextensions.k8s.io/v1` format
- Renders version selector for multi-version CRDs
- Provides interactive property exploration
- Generates example YAML manifests

### How It Works
The module extends the API Docs plugin by:
1. Registering a new widget type: `crd`
2. Overriding the `apiDocsConfigRef` to include the CRD widget
3. Maintaining compatibility with existing API widget types (OpenAPI, AsyncAPI, etc.)

## Technical Details

### Integration Points
- `@backstage/plugin-api-docs` (extends)
- Backstage catalog API
- React and Material-UI components

### Supported CRD Formats

#### Kubernetes Format
```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
spec:
  group: example.com
  names:
    kind: MyResource
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                field: string
```

#### Simplified Format
```yaml
Kind: MyResource
Group: example.com
Version: v1
Schema:
  Type: object
  Properties:
    spec:
      Type: object
      Properties:
        field:
          Type: string
```

### Property Types
Supports all standard OpenAPI v3 schema types:
- `string`, `integer`, `boolean`, `number`
- `object` (nested properties)
- `array` (with item schemas)
- Complex nested structures

## Use Cases

### CRD Documentation
1. Document platform CRDs in developer portal
2. Provide searchable CRD catalog
3. Version CRD schemas alongside code
4. Share links to specific properties

### Developer Onboarding
1. Explore available CRDs
2. Understand required fields
3. Generate starter YAML
4. Learn CRD structure

### API Governance
1. Centralize CRD documentation
2. Track schema evolution
3. Enforce documentation standards
4. Monitor breaking changes

## Prerequisites

**Required:**
- `@backstage/plugin-api-docs` must be installed
- API entities with `spec.type: crd`
- CRD YAML in `spec.definition`

**Recommended:**
- Backstage new frontend system
- Catalog with API entity support

## Example API Entity

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-crd
  title: My Custom Resource
  description: A custom Kubernetes resource for my platform
spec:
  type: crd
  lifecycle: production
  owner: platform-team
  definition: |
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: myresources.example.com
    spec:
      group: example.com
      names:
        kind: MyResource
        plural: myresources
      scope: Namespaced
      versions:
        - name: v1
          served: true
          storage: true
          schema:
            openAPIV3Schema:
              type: object
              properties:
                spec:
                  type: object
                  required:
                    - name
                  properties:
                    name:
                      type: string
                      description: Resource name
                    replicas:
                      type: integer
                      description: Number of replicas
```

For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).
