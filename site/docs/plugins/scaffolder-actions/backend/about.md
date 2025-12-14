# Scaffolder Backend Module TeraSky Utils Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils)

## Overview

The Scaffolder Backend Module TeraSky Utils backend plugin extends Backstage's scaffolder with powerful actions for managing Kubernetes resources and Backstage entities. It provides specialized actions for generating Crossplane claims and cleaning up catalog entities.

## Features

### Claim Template Action
- Parameter to YAML conversion
- Structured file organization
- Crossplane integration
- Resource management

### Catalog Info Cleaner
- Entity manifest cleanup
- Runtime data removal
- Git preparation
- YAML formatting

## Components

### terasky:claim-template
The action that provides:  
- Parameter processing  
- YAML generation  
- File system handling  
- Resource organization  

Example usage:
```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: crossplane-claim
spec:
  steps:
    - id: generate-claim
      name: Generate Crossplane Claim
      action: terasky:claim-template
      input:
        cluster: production
        namespace: web-apps
        kind: PostgreSQLInstance
        parameters:
          size: small
          version: "13"
```

### terasky:catalog-info-cleaner
The action that handles:  
- Entity processing  
- Data cleanup  
- File generation  
- Format standardization  

Example usage:
```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: catalog-cleanup
spec:
  steps:
    - id: clean-entity
      name: Clean Entity Manifest
      action: terasky:catalog-info-cleaner
      input:
        entity:
          apiVersion: backstage.io/v1alpha1
          kind: Component
          metadata:
            name: example-service
```

## Technical Details

### Action Processing
The plugin processes actions through:  
1. Input validation  
2. Data transformation  
3. File generation  
4. Output organization  

### File System Handling
Manages file operations for:  
- Manifest creation  
- Directory structure  
- File naming  
- Path organization  

### Integration Points
- Backstage Scaffolder  
- Kubernetes API  
- Entity Catalog  
- File System  

## Use Cases

### Crossplane Claim Generation
1. Collect parameters  
2. Generate manifest  
3. Organize files  
4. Prepare deployment  

### Entity Cleanup
1. Process entity
2. Remove runtime data
3. Format manifest
4. Save to file

## Action Schemas

### Output Encoding

The `terasky:claim-template` action outputs both raw YAML and base64-encoded YAML:
- **`manifest`**: The raw YAML string suitable for file operations
- **`manifestEncoded`**: Base64-encoded YAML for use in data URLs (e.g., download links)

The base64 encoding ensures reliable file downloads across all browsers, as it's the W3C standard for data URIs and provides better compatibility than URL encoding.

### Generic CRD Action Schema
```typescript
schema: {
  input: {
    ownerParam: z => z.any(),
    parameters: z => z.record(z.any()),
    nameParam: z => z.string(),
    namespaceParam: z => z.string().optional(),
    excludeParams: z => z.array(z.string()),
    apiVersion: z => z.string(),
    kind: z => z.string(),
    removeEmptyParams: z => z.boolean().optional(),
    clusters: z => z.array(z.string()).min(1),
  },
  output: {
    manifest: z => z.string(),
    filePaths: z => z.array(z.string()),
  },
}
```
  
### Crossplane Claim Action Schema
```typescript
schema: {
  input: {
    parameters: z => z.record(z.any()).describe('Pass through of input parameters'),
    nameParam: z => z.string().describe('Template parameter to map to the name of the claim').default('xrName'),
    namespaceParam: z => z.string().describe('Template parameter to map to the namespace of the claim').default('xrNamespace'),
    excludeParams: z => z.array(z.string()).describe('Template parameters to exclude from the claim').default(['xrName', 'xrNamespace', 'clusters', 'targetBranch', 'repoUrl', '_editData']),
    apiVersion: z => z.string().describe('API Version of the claim'),
    kind: z => z.string().describe('Kind of the claim'),
    clusters: z => z.array(z.string()).min(1).describe('The target clusters to apply the resource to'),
    removeEmptyParams: z => z.boolean().describe('If set to false, empty parameters will be rendered in manifest. by default they are removed').default(true),
    ownerParam: z => z.string().describe('Template parameter to map to the owner of the claim'),
  },
  output: {
    manifest: z => z.string().describe('The templated Kubernetes resource manifest'),
    manifestEncoded: z => z.string().describe('The templated Kubernetes resource manifest, base64-encoded for use in data URLs'),
    filePaths: z => z.array(z.string()).describe('The file paths of the written manifests'),
  },
}
```
### Entity Cleanup Action Schema
```typescript
schema: {
  input: {
    entity: z => z.record(z.any()).describe('Pass through of entity object'),
  },
  output: {
    manifest: z => z.string().describe('The templated Kubernetes resource manifest'),
    filePath: z => z.string().describe('The file path of the written manifests'),
  },
}
```

For installation and configuration details, refer to the [Installation Guide](./install.md).