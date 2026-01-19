# Configuring the Kubernetes Resources Frontend Plugin

This guide covers the configuration options available for the Kubernetes Resources frontend plugin.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. The configuration in `app-config.yaml` is still respected:

```yaml
kubernetesResources:
  # Whether to enable permission checks
  enablePermissions: true
  # If using a non default annotation prefix in the kubernetes ingestor set this to the value from the kubernetes ingestor as well
  annotationPrefix: terasky.backstage.io
  # Maximum concurrent requests to Kubernetes API
  concurrency: 10
```

The plugin will be automatically integrated into the appropriate entity pages without requiring manual route configuration.

## Configuration File

The plugin is configured through your `app-config.yaml`. Here's a comprehensive example:

```yaml
kubernetesResources:
  # Whether to enable permission checks
  enablePermissions: true
  # If using a non default annotation prefix in the kubernetes ingestor set this to the value from the kubernetes ingestor as well
  annotationPrefix: terasky.backstage.io
  # Maximum concurrent requests to Kubernetes API
  concurrency: 10
```

## Permission Configuration

If you're using the permission framework, configure it in your backend:

```typescript
import { kubernetesResourcesPermissions } from '@terasky/backstage-plugin-kubernetes-resources-common';

export default async function createRouter(
  env: PluginEnvironment,
): Promise<Router> {
  return createRouter({
    config: env.config,
    logger: env.logger,
    discovery: env.discovery,
    policy: {
      permission: {
        name: kubernetesResourcesPermissions.resourcesList,
        attributes: {},
      },
      result: AuthorizeResult.ALLOW,
    },
  });
}
```

## Component Configuration

### KubernetesResourcesPage Props

```typescript
interface KubernetesResourcesPageProps {
  // Optional: Default cluster selection
  defaultCluster?: string;
  
  // Optional: Default namespace
  defaultNamespace?: string;
  
  // Optional: Resource types to show
  resourceTypes?: string[];
  
  // Optional: Refresh interval in seconds
  refreshInterval?: number;
}
```

### KubernetesResourceGraph Props

```typescript
interface KubernetesResourceGraphProps {
  // Optional: Graph layout direction
  direction?: 'TB' | 'LR';
  
  // Optional: Node spacing
  nodeSpacing?: number;
  
  // Optional: Edge routing
  edgeRouting?: 'bezier' | 'straight';
  
  // Optional: Auto-refresh interval
  refreshInterval?: number;
}
```

## Integration Examples

### Basic Page Integration

```typescript
import { KubernetesResourcesPage } from '@terasky/backstage-plugin-kubernetes-resources-frontend';

const resourcesPage = (
  <KubernetesResourcesPage
    defaultCluster="production"
    defaultNamespace="default"
    refreshInterval={30}
  />
);
```

### Advanced Graph Integration

```typescript
import { KubernetesResourceGraph } from '@terasky/backstage-plugin-kubernetes-resources-frontend';

const graphPage = (
  <KubernetesResourceGraph
    direction="LR"
    nodeSpacing={100}
    edgeRouting="bezier"
    refreshInterval={60}
  />
);
```

## Proxy Configuration

Configure proxy settings for each cluster:

```yaml
proxy:
  '/kubernetes-resources/production':
    target: 'http://k8s-tracker.prod.example.com'
    changeOrigin: true
    headers:
      Authorization: 'Bearer ${K8S_TOKEN}'
      
  '/kubernetes-resources/staging':
    target: 'http://k8s-tracker.staging.example.com'
    changeOrigin: true
    headers:
      Authorization: 'Bearer ${K8S_STAGING_TOKEN}'
```

## Entity Annotations

Configure entity annotations for resource mapping:

```yaml
annotations:
  # Required annotations
  terasky.backstage.io/kubernetes-resource-name: 'nginx-deployment'
  terasky.backstage.io/kubernetes-resource-kind: 'Deployment'
  terasky.backstage.io/kubernetes-resource-api-version: 'apps/v1'
  backstage.io/managed-by-origin-location: 'production'
  
  # Optional annotations
  terasky.backstage.io/kubernetes-resource-namespace: 'web-apps'
```

## Best Practices

1. **Proxy Configuration**
    - Use environment variables for tokens
    - Configure timeouts appropriately
    - Enable error handling
    - Set proper headers

2. **Permission Management**
    - Define clear role boundaries
    - Restrict secret access
    - Control YAML visibility
    - Manage event access

3. **Resource Organization**
    - Use consistent naming
    - Group related resources
    - Set appropriate refresh intervals
    - Configure proper layouts

For installation instructions, refer to the [Installation Guide](./install.md). 