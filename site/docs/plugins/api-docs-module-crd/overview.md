# API Docs Module - CRD

The API Docs Module for Custom Resource Definitions (CRDs) extends the Backstage API Docs plugin with comprehensive support for visualizing and exploring Kubernetes CRDs. It provides an interactive, doc.crds.dev-style interface for browsing CRD schemas, supporting multiple versions, and generating example YAML manifests.

## Features

- **Interactive CRD Visualization**: Browse CRD schemas with an intuitive, expandable/collapsible interface
- **Multi-Version Support**: Switch between different CRD versions and view version-specific schemas
- **Example YAML Generation**: Automatically generate valid Custom Resource YAML templates from CRD schemas
- **Kubernetes Format Support**: Parses both simplified and standard Kubernetes CRD formats
- **Property Exploration**: View detailed information about each CRD property including type, description, and required status
- **Dark Mode Support**: Fully styled for both light and dark themes
- **Direct Link Sharing**: Copy links to specific CRD properties for easy reference

## Plugin Components

### Frontend Module
The frontend module extends the `@backstage/plugin-api-docs` plugin to add CRD visualization support. It registers a new API widget type `crd` that renders CRD definitions in an interactive interface.

[Learn more about the frontend module](./frontend/about.md)

## How It Works

The plugin integrates with Backstage's API catalog by:

1. Detecting API entities with `spec.type: crd`
2. Parsing the CRD YAML from `spec.definition`
3. Rendering an interactive schema browser
4. Supporting version selection for multi-version CRDs
5. Generating example YAML manifests on demand

## Use Cases

### Platform Engineering
- Document platform-provided CRDs in the developer portal
- Provide self-service CRD discovery for developers
- Generate example manifests for onboarding
- Share direct links to specific CRD properties

### Developer Experience
- Explore available CRDs and their schemas
- Understand required vs optional fields
- Copy example YAML to get started quickly
- Compare differences between CRD versions

### API Governance
- Centralize CRD documentation
- Version CRD schemas alongside other APIs
- Track CRD evolution over time
- Maintain consistency across clusters

## Documentation Structure

### Frontend Module
- [About](./frontend/about.md)
- [Installation](./frontend/install.md)
- [Configuration](./frontend/configure.md)

## Getting Started

To get started with the API Docs Module for CRDs:

1. **Install the frontend module**
   - Extends the `@backstage/plugin-api-docs` plugin
   - No backend component required
2. **Create API entities for your CRDs**
   - Set `spec.type: crd`
   - Include CRD YAML in `spec.definition`
3. **Browse CRD documentation**
   - Navigate to API entities in catalog
   - Explore schemas interactively
   - Generate example YAML manifests

For detailed installation and configuration instructions, refer to the frontend documentation linked above.
