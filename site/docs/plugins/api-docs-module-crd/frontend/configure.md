# Configuration

This guide explains how to configure API entities for CRD visualization and customize the module behavior.

## Creating CRD API Entities

### Basic API Entity

Create a YAML file in your catalog (e.g., `catalog-info.yaml`):

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-custom-resource
  title: My Custom Resource
  description: Custom resource for application deployment
spec:
  type: crd  # Required: must be 'crd'
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
        singular: myresource
        shortNames:
          - mr
      scope: Namespaced
      versions:
        - name: v1
          served: true
          storage: true
          schema:
            openAPIV3Schema:
              type: object
              required:
                - spec
              properties:
                spec:
                  type: object
                  required:
                    - replicas
                  properties:
                    replicas:
                      type: integer
                      description: Number of replicas to deploy
                      minimum: 1
                      maximum: 100
                    image:
                      type: string
                      description: Container image to use
                    env:
                      type: array
                      description: Environment variables
                      items:
                        type: object
                        required:
                          - name
                          - value
                        properties:
                          name:
                            type: string
                          value:
                            type: string
```

### Multi-Version CRD

For CRDs with multiple versions:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-multi-version-crd
  title: My Multi-Version CRD
spec:
  type: crd
  lifecycle: production
  owner: platform-team
  definition: |
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: databases.example.com
    spec:
      group: example.com
      names:
        kind: Database
        plural: databases
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
                  properties:
                    engine:
                      type: string
                      enum: [mysql, postgres]
                    version:
                      type: string
        - name: v2
          served: true
          storage: false
          schema:
            openAPIV3Schema:
              type: object
              properties:
                spec:
                  type: object
                  properties:
                    engine:
                      type: string
                      enum: [mysql, postgres, mongodb]
                    version:
                      type: string
                    replicas:
                      type: integer
                      default: 1
```

The widget will:
- Show a version selector dropdown
- Default to the storage version (or first served version)
- Display version badges (storage/served)
- Allow switching between versions

### Simplified CRD Format

The module also supports a simplified format (without the full Kubernetes CRD wrapper):

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: simple-crd
  title: Simple CRD Format
spec:
  type: crd
  owner: platform-team
  definition: |
    Kind: MyResource
    Group: example.com
    Version: v1
    Schema:
      Type: object
      Properties:
        spec:
          Type: object
          Properties:
            name:
              Type: string
              Description: Resource name
            replicas:
              Type: integer
              Description: Number of replicas
```

## Entity Annotations

### Standard Backstage Annotations

```yaml
metadata:
  name: my-crd
  annotations:
    backstage.io/techdocs-ref: dir:./docs  # Link to TechDocs
    backstage.io/source-location: url:https://github.com/org/repo  # Source code
```

### Linking to Related Entities

```yaml
spec:
  type: crd
  system: my-platform  # Link to system
  owner: platform-team  # Link to group/user
```

## Advanced Configuration

### Property Types

The module supports all OpenAPI v3 schema types:

#### Basic Types
```yaml
properties:
  stringField:
    type: string
  intField:
    type: integer
  boolField:
    type: boolean
  numberField:
    type: number
```

#### Objects
```yaml
properties:
  config:
    type: object
    properties:
      timeout:
        type: integer
      retries:
        type: integer
```

#### Arrays
```yaml
properties:
  tags:
    type: array
    items:
      type: string
  servers:
    type: array
    items:
      type: object
      properties:
        host:
          type: string
        port:
          type: integer
```

### Required Fields

Mark fields as required:

```yaml
spec:
  type: object
  required:  # Top-level required fields
    - name
    - replicas
  properties:
    name:
      type: string
    replicas:
      type: integer
    optional:
      type: string
```

Required fields will display a "required" chip in the UI.

### Field Descriptions

Add descriptions for better documentation:

```yaml
properties:
  replicas:
    type: integer
    description: |
      Number of pod replicas to create.
      Must be between 1 and 100.
      Defaults to 3 if not specified.
    minimum: 1
    maximum: 100
    default: 3
```

## Organizing CRDs in the Catalog

### Grouping by System

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: my-platform
  title: My Platform
spec:
  owner: platform-team
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: platform-crd-1
spec:
  type: crd
  system: my-platform  # Links to system
  owner: platform-team
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: platform-crd-2
spec:
  type: crd
  system: my-platform  # Links to same system
  owner: platform-team
```

### Using Tags

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-crd
  tags:
    - kubernetes
    - crd
    - database
    - production
spec:
  type: crd
  owner: platform-team
```

## Best Practices

### Documentation
- Always include `description` fields for properties
- Use the `title` field in metadata for display names
- Add comprehensive `description` in metadata
- Link to external docs with annotations

### Organization
- Group related CRDs under systems
- Use consistent naming conventions
- Add relevant tags for filtering
- Set appropriate lifecycle stages

### Versioning
- Always mark one version as storage
- Include migration guides in descriptions
- Document breaking changes between versions
- Use semantic versioning (v1, v2, etc.)

### Schema Design
- Mark required fields explicitly
- Provide default values where applicable
- Use enums for fixed value sets
- Add validation rules (min, max, pattern)

## Example: Complete CRD Entity

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: application-deployment-crd
  title: Application Deployment CRD
  description: |
    Custom resource for managing application deployments across clusters.
    Supports multi-region deployments, blue-green strategies, and automatic scaling.
  tags:
    - kubernetes
    - crd
    - deployment
    - platform
  annotations:
    backstage.io/techdocs-ref: dir:./docs
    backstage.io/source-location: url:https://github.com/org/platform-crds
spec:
  type: crd
  lifecycle: production
  owner: platform-team
  system: application-platform
  definition: |
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: applicationdeployments.platform.example.com
    spec:
      group: platform.example.com
      names:
        kind: ApplicationDeployment
        plural: applicationdeployments
        shortNames:
          - appd
      scope: Namespaced
      versions:
        - name: v1
          served: true
          storage: true
          schema:
            openAPIV3Schema:
              type: object
              required:
                - spec
              properties:
                spec:
                  type: object
                  required:
                    - image
                    - replicas
                  properties:
                    image:
                      type: string
                      description: Container image to deploy
                    replicas:
                      type: integer
                      description: Number of replicas
                      minimum: 1
                      maximum: 100
                      default: 3
                    regions:
                      type: array
                      description: Target deployment regions
                      items:
                        type: string
                        enum: [us-east-1, us-west-2, eu-west-1]
                    strategy:
                      type: object
                      description: Deployment strategy configuration
                      properties:
                        type:
                          type: string
                          enum: [rolling, bluegreen, canary]
                          default: rolling
                        canaryPercent:
                          type: integer
                          minimum: 0
                          maximum: 100
```

## Next Steps

- Explore [module features](./about.md)
- Review [installation guide](./install.md)
- Check the [overview](../overview.md) for more context
