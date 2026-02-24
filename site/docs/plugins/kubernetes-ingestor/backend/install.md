# Installing the Kubernetes Ingestor Backend Plugin

This guide will help you install and set up the Kubernetes Ingestor backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend instance
2. Access to Kubernetes clusters
3. Proper RBAC configuration
4. Git repository access (for template publishing)

## Installation Steps

### 1. Add the Packages

Install the required packages using yarn:

```bash
# Install the main plugin
yarn --cwd packages/backend add @terasky/backstage-plugin-kubernetes-ingestor

# Install the utilities package for template generation
yarn --cwd packages/backend add @terasky/backstage-plugin-scaffolder-backend-module-terasky-utils
```

### 2. Add to Backend

Modify your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Add the Kubernetes Ingestor plugin
backend.add(import('@terasky/backstage-plugin-kubernetes-ingestor'));

// Add required scaffolder modules for template generation
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-bitbucket'));
backend.add(import('@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils'));

backend.start();
```

### 3. Configure RBAC

Set up the required RBAC permissions in your Kubernetes clusters:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: backstage-kubernetes-ingestor
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: backstage-kubernetes-ingestor
subjects:
  - kind: ServiceAccount
    name: backstage-kubernetes-ingestor
    namespace: backstage
roleRef:
  kind: ClusterRole
  name: backstage-kubernetes-ingestor
  apiGroup: rbac.authorization.k8s.io
```

### 4. Configure Plugin

Add configuration to your `app-config.yaml`:

```yaml
kubernetesIngestor:
  # Resource mapping configuration
  mappings:
    namespaceModel: 'cluster'
    nameModel: 'name-cluster'
    titleModel: 'name'
    systemModel: 'namespace'
    referencesNamespaceModel: 'default'

  # Component ingestion settings
  components:
    enabled: true
    ingestAsResources: false  # Set to true to create as Resource entities
    taskRunner:
      frequency: 10
      timeout: 600
    excludedNamespaces:
      - kube-public
      - kube-system
    customWorkloadTypes:
      - group: pkg.crossplane.io
        apiVersion: v1
        plural: providers
        defaultType: service  # Optional: fallback component type when annotation is missing 

  # Crossplane integration
  crossplane:
    enabled: true
    claims:
      ingestAllClaims: true
      ingestAsResources: false  # Set to true for claims and XRs as Resources
    xrds:
      enabled: true
      ingestOnlyAsAPI: false  # Set to true to skip template generation
      publishPhase:
        allowedTargets: ['github.com', 'gitlab.com']
        target: github
        git:
          repoUrl: github.com?owner=org&repo=templates
          targetBranch: main
        allowRepoSelection: true
      taskRunner:
        frequency: 10
        timeout: 600
  
  # KRO integration (optional)
  kro:
    enabled: false
    instances:
      ingestAsResources: false  # Set to true for instances as Resources
    rgds:
      enabled: true
      ingestOnlyAsAPI: false  # Set to true to skip template generation
  
  # Generic CRD templates (optional)
  genericCRDTemplates:
    ingestOnlyAsAPI: false  # Set to true to skip template generation
  
  argoIntegration: true
```

### 5. Configure Git Integration

Set up environment variables for Git access:

```bash
export GITHUB_TOKEN=your-token
export GITLAB_TOKEN=your-token
export BITBUCKET_TOKEN=your-token
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. Resources are being ingested
4. Templates are being generated
5. APIs are being created

## Troubleshooting

Common issues and solutions:

1. **Resource Discovery Issues**
    - Check RBAC configuration
    - Verify cluster access
    - Review excluded namespaces
    - Check task runner logs

2. **Template Generation Problems**
    - Verify Git credentials
    - Check repository access
    - Review XRD configuration
    - Check scaffolder modules

3. **API Creation Issues**
    - Verify Crossplane setup
    - Check XRD access
    - Review relationship mapping
    - Check API entity format

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).
