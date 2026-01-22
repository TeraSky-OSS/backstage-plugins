# Configuring the SpectroCloud Kubernetes Cluster Supplier Plugin

This guide covers the configuration options available for the SpectroCloud Kubernetes Cluster Supplier plugin.

## Configuration File

The plugin is configured through your `app-config.yaml` under the **`spectrocloud`** section (separate from `kubernetes.clusterLocatorMethods`). 

The configuration supports **multiple SpectroCloud instances**, each with its own cluster provider settings. Generic SpectroCloud connection fields (`url`, `tenant`, `apiToken`) are at the top level of each instance, while cluster provider-specific settings are nested under `clusterProvider`.

## Basic Configuration

### Minimal Configuration

The minimum required configuration:

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
```

### Recommended Configuration

A more complete configuration with filtering:

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      excludeProjects: [sandbox, development]
      excludeTenantScopedClusters: false
      skipMetricsLookup: true
```

## Configuration Options

### Required Options

#### `url`
- **Type**: `string`
- **Required**: Yes
- **Example**: `https://api.spectrocloud.com`
- **Description**: Base URL for the SpectroCloud Palette API
- **Notes**: For self-hosted SpectroCloud, use your custom API URL

#### `tenant`
- **Type**: `string`
- **Required**: Yes
- **Example**: `my-organization`
- **Description**: SpectroCloud tenant name
- **Notes**: Must match your SpectroCloud tenant

#### `apiToken`
- **Type**: `string` (secret)
- **Required**: Yes
- **Example**: `${SPECTROCLOUD_API_TOKEN}`
- **Description**: SpectroCloud API token for authentication
- **Best Practice**: Always use environment variable substitution
- **Permissions**: Token needs cluster read access

#### `name`
- **Type**: `string`
- **Required**: No
- **Default**: `undefined` (no prefix)
- **Example**: `prod`, `staging-eu`, `us-west`
- **Description**: Instance name used as prefix for cluster names to prevent conflicts
- **Behavior**:
    - If set: Cluster names are prefixed with `{name}-`
    - If not set: Cluster names are used as-is
- **Use Case**: Essential when using multiple SpectroCloud instances that may have clusters with the same name

**Example:**
```yaml
spectrocloud:
  - name: prod
    url: https://api.spectrocloud.com
    tenant: production
    apiToken: ${SPECTRO_PROD_TOKEN}
    # Cluster "my-cluster" becomes "prod-my-cluster"
  
  - name: staging
    url: https://api-eu.spectrocloud.com
    tenant: staging
    apiToken: ${SPECTRO_STAGING_TOKEN}
    # Cluster "my-cluster" becomes "staging-my-cluster"
```

### Optional Filtering Options

#### `includeProjects`
- **Type**: `string[]`
- **Required**: No
- **Default**: `[]` (all projects)
- **Example**: `['production', 'staging']`
- **Description**: Whitelist of project names to include
- **Behavior**:
    - If empty or not set: All projects are included
    - If set with values: Only clusters in these projects are discovered
- **Note**: `includeProjects` takes precedence over `excludeProjects`

```yaml
# Only production and staging clusters
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      includeProjects: ['production', 'staging']
```

#### `excludeProjects`
- **Type**: `string[]`
- **Required**: No
- **Default**: `[]` (no exclusions)
- **Example**: `['sandbox', 'development']`
- **Description**: Blacklist of project names to exclude
- **Behavior**:
    - Filters out clusters in specified projects
    - Applied after `includeProjects` filter
    - Has no effect if `includeProjects` is set

```yaml
# All clusters except sandbox and dev
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      excludeProjects: ['sandbox', 'development']
```

#### `excludeTenantScopedClusters`
- **Type**: `boolean`
- **Required**: No
- **Default**: `false`
- **Description**: Whether to exclude tenant-scoped clusters
- **When to use**:
    - Set to `true` if you only want project-scoped clusters
    - Useful for multi-tenant deployments
    - Helps filter out shared infrastructure clusters

```yaml
# Only project-scoped clusters
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      excludeTenantScopedClusters: true
```

### Optional Performance Options

#### `skipMetricsLookup`
- **Type**: `boolean`
- **Required**: No
- **Default**: `true`
- **Description**: Whether to skip metrics lookup for these clusters
- **Impact**:
    - `true`: Faster cluster queries, no metrics in UI
    - `false`: Metrics available but slower queries
- **Recommendation**: Set to `true` for large cluster counts

```yaml
# Skip metrics for performance
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      skipMetricsLookup: true
```

## Complete Configuration Examples

### Example 1: Production Only

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: acme-corp
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      includeProjects: ['production']
      skipMetricsLookup: true
```

### Example 2: Exclude Development Environments

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: acme-corp
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      excludeProjects: ['sandbox', 'development', 'testing']
      excludeTenantScopedClusters: true
      skipMetricsLookup: true
```

### Example 3: Multiple Environments

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: acme-corp
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      includeProjects: ['production', 'staging', 'qa']
      skipMetricsLookup: false  # Enable metrics for these critical clusters
```

### Example 4: Self-Hosted SpectroCloud

```yaml
spectrocloud:
  - url: https://spectrocloud.internal.company.com
    tenant: internal
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      skipMetricsLookup: true
```

### Example 5: Multiple SpectroCloud Instances

Connect to multiple SpectroCloud instances (e.g., different regions or environments):

```yaml
spectrocloud:
  # Production SpectroCloud instance (US)
  - url: https://api.spectrocloud.com
    tenant: production-tenant
    apiToken: ${SPECTROCLOUD_PROD_API_TOKEN}
    name: prod-us  # Clusters will be prefixed with "prod-us-"
    clusterProvider:
      includeProjects: ['production']
      skipMetricsLookup: false
      refreshIntervalSeconds: 600
  
  # Staging SpectroCloud instance (EU region)
  - url: https://api-eu.spectrocloud.com
    tenant: staging-tenant
    apiToken: ${SPECTROCLOUD_STAGING_API_TOKEN}
    name: staging-eu  # Clusters will be prefixed with "staging-eu-"
    clusterProvider:
      includeProjects: ['staging', 'qa']
      skipMetricsLookup: true
      refreshIntervalSeconds: 300
```

**Result:** If both instances have a cluster named `my-cluster`, they will appear in Backstage as:
- `prod-us-my-cluster` (from production instance)
- `staging-eu-my-cluster` (from staging instance)

This prevents naming conflicts and makes it clear which instance each cluster belongs to.

## Multi-Source Configuration

Combine SpectroCloud with other cluster sources:

### Example: SpectroCloud + Static Clusters

```yaml
kubernetes:
  clusterLocatorMethods:
    # Static production cluster
    - type: 'config'
      clusters:
        - name: prod-primary
          url: https://prod.example.com
          authProvider: serviceAccount
          serviceAccountToken: ${PROD_TOKEN}
          skipTLSVerify: false
          skipMetricsLookup: false

# All other clusters from SpectroCloud
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      excludeProjects: ['development']
```

### Example: SpectroCloud + GKE + Catalog

```yaml
kubernetes:
  clusterLocatorMethods:
    # GKE clusters
    - type: 'gke'
      projectId: my-gcp-project
      region: us-central1
      authProvider: google
    
    # Catalog-based clusters
    - type: 'catalog'

# SpectroCloud clusters
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      includeProjects: ['production', 'staging']
```

### Example: OIDC Clusters + SpectroCloud

```yaml
kubernetes:
  clusterLocatorMethods:
    # Static cluster with OIDC auth
    - type: 'config'
      clusters:
        - name: aks-cluster
          url: https://aks.example.com
          authProvider: oidc
          oidcTokenProvider: microsoft
          skipTLSVerify: false

# SpectroCloud clusters (service account auth)
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
```

## Configuration Schema

The plugin provides TypeScript definitions for configuration validation:

```typescript
export interface Config {
  spectrocloud?: Array<{
    url: string;
    tenant: string;
    apiToken: string;
    name?: string;
    clusterProvider?: {
      includeProjects?: string[];
      excludeProjects?: string[];
      skipMetricsLookup?: boolean;
      excludeTenantScopedClusters?: boolean;
      refreshIntervalSeconds?: number;
      clusterTimeoutSeconds?: number;
      rbac?: {
        namespace?: string;
        serviceAccountName?: string;
        secretName?: string;
        clusterRoleName?: string;
        clusterRoleBindingName?: string;
        clusterRoleRules?: Array<{
          apiGroups: string[];
          resources: string[];
          verbs: string[];
        }>;
      };
    };
  }>;
}
```


## Configuration Best Practices

### Security

1. **Never hardcode API tokens**
   ```yaml
   # BAD
   apiToken: "AASDASDASDASD="
   
   # GOOD
   apiToken: ${SPECTROCLOUD_API_TOKEN}
   ```

2. **Use least-privilege tokens**
   - Create dedicated tokens for Backstage
   - Grant only cluster read permissions
   - Rotate tokens regularly

3. **Separate tokens per environment**
   ```yaml
   # app-config.production.yaml
   apiToken: ${SPECTROCLOUD_PROD_TOKEN}
   
   # app-config.development.yaml
   apiToken: ${SPECTROCLOUD_DEV_TOKEN}
   ```

### Performance

1. **Use project filtering strategically**
   ```yaml
   # Include only what you need
   includeProjects: ['production', 'staging']
   ```

2. **Consider tenant-scoped cluster exclusion**
   ```yaml
   # Reduce cluster count
   excludeTenantScopedClusters: true
   ```

### Organization

1. **Use clear project names**
   - Align project names with environments
   - Use consistent naming conventions
   - Document project purposes

2. **Separate concerns** (use different config files)
   ```yaml
   # app-config.production.yaml
   spectrocloud:
     tenant: prod
     includeProjects: ['production']
   
   # app-config.development.yaml
   spectrocloud:
     tenant: nonprod
     excludeProjects: ['sandbox']
   ```

3. **Document your configuration**
   ```yaml
   # Production SpectroCloud clusters
   # Managed by Platform team
   # Contact: platform@example.com
   spectrocloud:
     - url: https://api.spectrocloud.com
       tenant: my-tenant
       apiToken: ${SPECTROCLOUD_API_TOKEN}
       clusterProvider:
         includeProjects: ['production']
   ```

## Advanced Configuration

### Performance Tuning

#### Refresh Interval

Control how often the plugin queries SpectroCloud for cluster updates:

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      refreshIntervalSeconds: 300  # 5 minutes (default: 600)
```

**Options**:
- **Default**: `600` (10 minutes)
- **Minimum**: `60` (1 minute) - not recommended
- **Recommended**: `300-900` (5-15 minutes)
- **Large environments**: `900-1800` (15-30 minutes)

#### Cluster Timeout

Configure timeout for RBAC setup per cluster:

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      clusterTimeoutSeconds: 30  # 30 seconds (default: 15)
```

**Options**:
- **Default**: `15` seconds
- **Minimum**: `10` seconds
- **Recommended**: `15-30` seconds
- **Slow networks**: `30-60` seconds

### RBAC Customization

Override default Kubernetes resource names and permissions:

#### Basic RBAC Configuration

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      rbac:
        namespace: custom-namespace           # default: backstage-system
        serviceAccountName: custom-sa         # default: backstage-sa
        secretName: custom-sa-token           # default: backstage-sa-token
        clusterRoleName: custom-reader        # default: backstage-read-only
        clusterRoleBindingName: custom-binding # default: backstage-read-only-binding
```

#### Custom ClusterRole Rules

Define custom RBAC permissions instead of default read-only access:

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      rbac:
        clusterRoleRules:
          # Read pods and services (core API group)
          - apiGroups: ['core']
            resources: ['pods', 'services']
            verbs: ['get', 'list', 'watch']
          
          # Read deployments and replicasets
          - apiGroups: ['apps']
            resources: ['deployments', 'replicasets', 'statefulsets']
            verbs: ['get', 'list', 'watch']
          
          # Read ingresses
          - apiGroups: ['networking.k8s.io']
            resources: ['ingresses']
            verbs: ['get', 'list', 'watch']
```

**Default Rules** (if not specified):
```yaml
- apiGroups: ['*']
  resources: ['*']
  verbs: ['get', 'list', 'watch']
```

**Note**: Use `'core'` for the Kubernetes core API group (pods, services, configmaps, secrets, etc.). The plugin automatically converts `'core'` to an empty string as required by Kubernetes RBAC.

#### RBAC Examples

**Example 1: Restricted to Core Resources**

```yaml
rbac:
  clusterRoleRules:
    - apiGroups: ['core']
      resources: ['pods', 'services', 'configmaps', 'secrets']
      verbs: ['get', 'list', 'watch']
    - apiGroups: ['apps']
      resources: ['deployments', 'statefulsets', 'daemonsets']
      verbs: ['get', 'list', 'watch']
```

**Example 2: Include Custom Resources**

```yaml
rbac:
  clusterRoleRules:
    # Standard resources
    - apiGroups: ['*']
      resources: ['*']
      verbs: ['get', 'list', 'watch']
    
    # Specific Crossplane permissions
    - apiGroups: ['apiextensions.crossplane.io']
      resources: ['compositeresourcedefinitions', 'compositionrevisions']
      verbs: ['get', 'list', 'watch']
```

**Example 3: Namespace-Scoped Access**

```yaml
rbac:
  clusterRoleRules:
    # Only pods and services (core API group)
    - apiGroups: ['core']
      resources: ['pods', 'services']
      verbs: ['get', 'list', 'watch']
    
    # Only specific namespaces
    - apiGroups: ['core']
      resources: ['namespaces']
      resourceNames: ['production', 'staging']
      verbs: ['get']
```

**Example 4: Minimal Read-Only**

```yaml
rbac:
  clusterRoleRules:
    # Only pods (core API group)
    - apiGroups: ['core']
      resources: ['pods']
      verbs: ['get', 'list']
    
    # Only deployments
    - apiGroups: ['apps']
      resources: ['deployments']
      verbs: ['get', 'list']
```

### Complete Advanced Configuration Example

```yaml
spectrocloud:
  - url: https://api.spectrocloud.com
    tenant: my-tenant
    apiToken: ${SPECTROCLOUD_API_TOKEN}
    clusterProvider:
      # Project filtering
      includeProjects: ['production', 'staging']
      excludeTenantScopedClusters: true
      
      # Performance tuning
      refreshIntervalSeconds: 300        # 5 minutes
      clusterTimeoutSeconds: 30          # 30 seconds
      skipMetricsLookup: true
      
      # RBAC customization
      rbac:
        namespace: my-backstage
        serviceAccountName: my-sa
        secretName: my-sa-token
        clusterRoleName: my-reader-role
        clusterRoleBindingName: my-reader-binding
        clusterRoleRules:
          # Core resources (use 'core' for core API group)
          - apiGroups: ['core']
            resources: ['pods', 'services', 'configmaps']
            verbs: ['get', 'list', 'watch']
          
          # Workloads
          - apiGroups: ['apps']
            resources: ['deployments', 'statefulsets', 'daemonsets', 'replicasets']
            verbs: ['get', 'list', 'watch']
      
          # Ingress
          - apiGroups: ['networking.k8s.io']
            resources: ['ingresses', 'networkpolicies']
            verbs: ['get', 'list', 'watch']
          
          # Custom resources
          - apiGroups: ['*.crossplane.io']
            resources: ['*']
            verbs: ['get', 'list', 'watch']
```

### RBAC Best Practices

1. **Start with defaults**
   - Use default rules initially
   - Monitor what resources are accessed
   - Narrow down permissions based on actual usage

2. **Principle of least privilege**
   - Only grant access to resources Backstage needs
   - Use specific apiGroups and resources
   - Avoid wildcards in production

3. **Namespace isolation**
   - Use a dedicated namespace (default: `backstage-system`)
   - Don't use `default` or `kube-system`
   - Name clearly for easy identification

4. **Regular audits**
   - Review permissions periodically
   - Check cluster audit logs
   - Update rules as needs change

5. **Consistency across clusters**
   - Use same RBAC configuration for all SpectroCloud clusters
   - Document any cluster-specific exceptions
   - Maintain configuration in version control

### Performance Recommendations

#### For Small Deployments (< 10 clusters)
```yaml
refreshIntervalSeconds: 300      # 5 minutes
clusterTimeoutSeconds: 15        # 15 seconds
skipMetricsLookup: false         # Enable metrics
```

#### For Medium Deployments (10-50 clusters)
```yaml
refreshIntervalSeconds: 600      # 10 minutes (default)
clusterTimeoutSeconds: 20        # 20 seconds
skipMetricsLookup: true          # Disable metrics
```

#### For Large Deployments (50+ clusters)
```yaml
refreshIntervalSeconds: 900      # 15 minutes
clusterTimeoutSeconds: 30        # 30 seconds
skipMetricsLookup: true          # Disable metrics
excludeTenantScopedClusters: true # Reduce cluster count
```

For more information about the plugin architecture, see the [About page](./about.md).

