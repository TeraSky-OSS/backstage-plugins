# Configuring the Kubernetes Ingestor Backend Plugin

This guide covers the configuration options available for the Kubernetes Ingestor backend plugin.

## Configuration File

The plugin is configured through your `app-config.yaml`. Here's a comprehensive example:

```yaml
kubernetesIngestor:
  # Mappings of kubernetes resource metadata to backstage entity metadata
  # The list bellow are the default values when the mappings are not set in the app-config.yaml
  # The recommended values are:
  # namespaceModel: 'cluster' # cluster, namespace, default
  # nameModel: 'name-cluster' # name-cluster, name-namespace, name
  # titleModel: 'name' # name, name-cluster, name-namespace
  # systemModel: 'cluster-namespace' # cluster, namespace, cluster-namespace, default
  # referencesNamespaceModel: 'default' # default, same
  mappings:
    namespaceModel: 'cluster' # cluster, namespace, default
    nameModel: 'name-cluster' # name-cluster, name-namespace, name-kind, name
    titleModel: 'name' # name, name-cluster, name-namespace
    systemModel: 'namespace' # cluster, namespace, cluster-namespace, default
    referencesNamespaceModel: 'default' # default, same
  # A list of cluster names to ingest resources from. If empty, resources from all clusters under kubernetes.clusterLocatorMethods.clusters will be ingested.
  # allowedClusterNames:
  #   - my-cluster-name
  components:
    # Whether to enable creation of backstage components for Kubernetes workloads
    enabled: true
    # Whether to ingest Kubernetes workloads as Resource entities instead of Component entities (default: false)
    ingestAsResources: false
    taskRunner:
      # How often to query the clusters for data
      frequency: 10
      # Max time to process the data per cycle
      timeout: 600
    # Namespaces to exclude the resources from
    excludedNamespaces:
      - kube-public
      - kube-system
    # Custom Resource Types to also generate components for
    customWorkloadTypes:
      - group: pkg.crossplane.io
        apiVersion: v1
        plural: providers
        # singular: provider # explicit singular form - needed when auto-detection fails
    # By default all standard kubernetes workload types are ingested. This allows you to disable this behavior
    disableDefaultWorkloadTypes: false
    # Allows ingestion to be opt-in or opt-out by either requiring or not a dedicated annotation to ingest a resource (terasky.backstage.io/add-to-catalog or terasky.backstage.io/exclude-from-catalog)
    onlyIngestAnnotatedResources: false
  crossplane:
    # Whether to completely disable crossplane related code for both XRDs and Claims. defaults to enabled if not provided for backwards compatibility
    enabled: true
    # This section is relevant for crossplane v1 claims as well as Crossplane v2 XRs.
    # In the future when v1 and claims are deprecated this field will change names but currently 
    # for backwards compatibility will stay as is
    claims:
      # Whether to create components for all claim resources (v1) and XRs (v2) in your cluster
      ingestAllClaims: true
      # Whether to ingest claims and XRs as Resource entities instead of Component entities (default: false)
      ingestAsResources: false
    xrds:
      # Whether to ingest XRDs as API entities only without generating templates (default: false)
      ingestOnlyAsAPI: false
      # Settings related to the final steps of a software template
      publishPhase:
        # Base URLs of Git servers you want to allow publishing to
        allowedTargets: ['github.com', 'gitlab.com']
        # What to publish to. currently supports github, gitlab, bitbucket, bitbucketCloud and YAML (provides a link to download the file)
        target: github
        git:
          # Follows the backstage standard format which is github.com?owner=<REPO OWNER>&repo=<REPO NAME>
          repoUrl:
          targetBranch: main
        # Whether the user should be able to select the repo they want to push the manifest to or not
        allowRepoSelection: true
        # Whether to request user OAuth credentials when selecting a repository URL (defaults to false)
        requestUserCredentialsForRepoUrl: false
      # Whether to enable the creation of software templates for all XRDs
      enabled: true
      taskRunner:
        # How often to query the clusters for data
        frequency: 10
        # Max time to process the data per cycle
        timeout: 600
      # Allows ingestion to be opt-in or opt-out by either requiring or not a dedicated annotation to ingest a xrd (terasky.backstage.io/add-to-catalog or terasky.backstage.io/exclude-from-catalog)
      ingestAllXRDs: true
      # Will convert default values from the XRD into placeholders in the UI instead of always adding them to the generated manifest.
      convertDefaultValuesToPlaceholders: true
  genericCRDTemplates:
    # Whether to ingest CRDs as API entities only without generating templates (default: false)
    ingestOnlyAsAPI: false
    # Settings related to the final steps of a software template
    publishPhase:
      # Base URLs of Git servers you want to allow publishing to
      allowedTargets: ['github.com', 'gitlab.com']
      # What to publish to. currently supports github, gitlab, bitbucket, bitbucketCloud and YAML (provides a link to download the file)
      target: github
      git:
        # Follows the backstage static format which is github.com?owner=<REPO OWNER>&repo=<REPO NAME>
        repoUrl:
        targetBranch: main
      # Whether the user should be able to select the repo they want to push the manifest to or not
      allowRepoSelection: true
      # Whether to request user OAuth credentials when selecting a repository URL (defaults to false)
      requestUserCredentialsForRepoUrl: false
    crdLabelSelector:
      key: terasky.backstage.io/generate-form
      value: "true"
    crds:
      - certificates.cert-manager.io
  kro:
    # Whether to completely disable KRO related code for both RGDs and instances. defaults to disabled if not provided
    enabled: false
    # Whether to ingest KRO instances as Resource entities instead of Component entities (default: false)
    instances:
      ingestAsResources: false
    rgds:
      # Whether to ingest RGDs as API entities only without generating templates (default: false)
      ingestOnlyAsAPI: false
      # Settings related to the final steps of a software template
      publishPhase:
        # Base URLs of Git servers you want to allow publishing to
        allowedTargets: ['github.com', 'gitlab.com']
        # What to publish to. currently supports github, gitlab, bitbucket, bitbucketCloud and YAML (provides a link to download the file)
        target: github
        git:
          # Follows the backstage standard format which is github.com?owner=<REPO OWNER>&repo=<REPO NAME>
          repoUrl:
          targetBranch: main
        # Whether the user should be able to select the repo they want to push the manifest to or not
        allowRepoSelection: true
        # Whether to request user OAuth credentials when selecting a repository URL (defaults to false)
        requestUserCredentialsForRepoUrl: false
      # Whether to enable the creation of software templates for all RGDs
      enabled: true
      taskRunner:
        # How often to query the clusters for data
        frequency: 10
        # Max time to process the data per cycle
        timeout: 600
  # Whether to auto add the argo cd plugins annotation to the ingested components if the ingested resources have the ArgoCD tracking annotation added to them. defaults to false
  argoIntegration: true
```

## Advanced Features

### Ingest Only as API

The plugin supports ingesting Custom Resource Definitions (CRDs) as API entities only, without generating the corresponding Backstage templates. This is useful when you want to document your APIs but don't need users to create instances through Backstage.

#### XRDs (Crossplane Composite Resource Definitions)

```yaml
kubernetesIngestor:
  crossplane:
    xrds:
      enabled: true
      ingestOnlyAsAPI: false  # Default: false
```

When `ingestOnlyAsAPI` is set to `true`:
- API entities will be created for each XRD
- Software templates will NOT be generated
- Users can view the API documentation but cannot create new claims through Backstage

#### KRO RGDs (ResourceGraphDefinitions)

```yaml
kubernetesIngestor:
  kro:
    enabled: true
    rgds:
      enabled: true
      ingestOnlyAsAPI: false  # Default: false
```

When `ingestOnlyAsAPI` is set to `true`:
- API entities will be created for each RGD
- Software templates will NOT be generated
- Users can view the API documentation but cannot create new instances through Backstage

#### Generic CRDs

```yaml
kubernetesIngestor:
  genericCRDTemplates:
    ingestOnlyAsAPI: false  # Default: false
    crds:
      - certificates.cert-manager.io
```

When `ingestOnlyAsAPI` is set to `true`:
- API entities will be created for each configured CRD
- Software templates will NOT be generated
- Users can view the API documentation but cannot create new resources through Backstage

**Use Cases for API-Only Ingestion:**
1. **Documentation Only**: You want to document your APIs in Backstage but don't want users to create instances through the platform
2. **External Creation**: Resources are created through other systems (CI/CD pipelines, GitOps, etc.) and you only want API visibility
3. **Read-Only View**: You want teams to browse available APIs without the ability to create new instances

### Ingest as Resources

The plugin supports ingesting Kubernetes objects as Backstage Resource entities instead of Component entities. In Backstage's data model, Resources represent infrastructure resources (databases, queues, storage) while Components represent software components (services, applications).

#### Components (Regular Kubernetes Resources)

```yaml
kubernetesIngestor:
  components:
    enabled: true
    ingestAsResources: false  # Default: false
```

When `ingestAsResources` is set to `true`:
- Regular Kubernetes workloads (Deployments, StatefulSets, etc.) will be ingested as Resource entities
- The entity kind will be `Resource` instead of `Component`
- Resource entities do not support `providesApis` and `consumesApis` relations (Component-specific)

#### Crossplane Claims and Composite Resources (XRs)

```yaml
kubernetesIngestor:
  crossplane:
    claims:
      ingestAsResources: false  # Default: false
```

When `ingestAsResources` is set to `true`:
- **Both** Crossplane claims and composite resources (XRs) will be ingested as Resource entities
- The entity kind will be `Resource` instead of `Component`
- Resource entities do not support `consumesApis` relations (Component-specific)
- All Crossplane-specific annotations will still be present
- This applies to both v1 claims/XRs and v2 claims/composites

**Note:** XRs use the same configuration as claims because they are tightly coupled - claims create XRs, so they should be treated consistently.

#### KRO Instances

```yaml
kubernetesIngestor:
  kro:
    instances:
      ingestAsResources: false  # Default: false
```

When `ingestAsResources` is set to `true`:
- KRO instances will be ingested as Resource entities
- The entity kind will be `Resource` instead of `Component`
- Resource entities do not support `consumesApis` relations (Component-specific)
- All KRO-specific annotations will still be present

**Use Cases for Resource Ingestion:**
1. **Infrastructure Resources**: When Kubernetes objects represent infrastructure resources (databases, message queues, storage) rather than applications
2. **Clear Separation**: To distinguish between applications (Components) and the infrastructure they depend on (Resources)
3. **Catalog Organization**: To organize your catalog with proper entity types that match Backstage's data model

### Combining Options

You can use both `ingestOnlyAsAPI` and `ingestAsResources` together. For example:

```yaml
kubernetesIngestor:
  crossplane:
    claims:
      ingestAsResources: true  # Existing claims are Resources
    xrds:
      enabled: true
      ingestOnlyAsAPI: true  # Only document APIs, no templates
```

This configuration:
- Documents the APIs without template generation
- Represents existing claim/XR instances as infrastructure resources
- Provides API documentation without the ability to create new instances through Backstage

## Mapping Models

### Namespace Model
Controls how Kubernetes namespaces map to Backstage:  
- `cluster`: Use cluster name  
- `namespace`: Use namespace name  
- `default`: Use default namespace  

### Name Model
Determines entity name generation:  
- `name-cluster`: Combine name and cluster  
- `name-namespace`: Combine name and namespace  
- `name-kind`: Combine name and resource kind  
- `name`: Use resource name only  

### Title Model
Controls entity title generation:  
- `name`: Use resource name  
- `name-cluster`: Combine name and cluster  
- `name-namespace`: Combine name and namespace  

### System Model
Defines system mapping:  
- `cluster`: Use cluster name  
- `namespace`: Use namespace name  
- `cluster-namespace`: Combine both  
- `default`: Use default system  

## Component Configuration

### Task Runner Settings
```yaml
taskRunner:
  # Run every 10 seconds
  frequency: 10
  
  # Allow up to 10 minutes per cycle
  timeout: 600
```

### Resource Type Configuration
```yaml
components:
  # Custom resource types
  customWorkloadTypes:
    - group: apps.example.com
      apiVersion: v1
      plural: applications
      singular: application
  
  # Exclude system namespaces
  excludedNamespaces:
    - kube-system
    - kube-public
```

## Crossplane Integration

### Claims Configuration
```yaml
crossplane:
  enabled: true
  claims:
    # Auto-ingest all claims
    ingestAllClaims: true
```

### XRD Configuration
```yaml
xrds:
  # Template generation settings
  publishPhase:
    target: github
    allowRepoSelection: true
    requestUserCredentialsForRepoUrl: false
    git:
      repoUrl: github.com?owner=org&repo=templates
      targetBranch: main
  
  # Processing settings
  convertDefaultValuesToPlaceholders: true
  ingestAllXRDs: true
```

#### Repository Selection Options

When `allowRepoSelection` is enabled, you can configure the repository selection user experience:

- **`requestUserCredentialsForRepoUrl`** (default: `false`): When set to `true`, enables an enhanced repository picker that allows users to select repositories and organizations from dropdown lists instead of manually typing the repository name. This adds the `requestUserCredentials` option to the RepoUrlPicker with `secretsKey: USER_OAUTH_TOKEN`, which enables the dropdown pickers for a better user experience.

This is useful when you want to:
- Provide a more user-friendly repository selection experience
- Allow users to browse and select from their accessible repositories
- Reduce errors from manual repository name entry
- Enable organization/owner selection from dropdown lists

## KRO Integration

### RGD Configuration
```yaml
kro:
  enabled: true
  rgds:
    # Template generation settings
    publishPhase:
      target: github
      allowRepoSelection: true
      requestUserCredentialsForRepoUrl: false
      git:
        repoUrl: github.com?owner=org&repo=templates
        targetBranch: main
    
    # Processing settings
    enabled: true
    taskRunner:
      frequency: 10
      timeout: 600
```

### Repository Selection Options

Similar to XRD configuration, when `allowRepoSelection` is enabled for KRO RGDs:

- **`requestUserCredentialsForRepoUrl`** (default: `false`): When set to `true`, enables an enhanced repository picker that allows users to select repositories and organizations from dropdown lists instead of manually typing the repository name.

This provides the same improved user experience as described in the XRD configuration section, ensuring consistent repository selection behavior across both Crossplane and KRO resource templates.

## Best Practices

1. **Resource Mapping**
    - Choose consistent mapping models
    - Use clear naming conventions
    - Consider namespace organization
    - Plan system boundaries

2. **Performance Tuning**
    - Adjust task runner frequency
    - Set appropriate timeouts
    - Configure excluded namespaces
    - Optimize resource selection

3. **Template Management**
    - Use version control
    - Maintain consistent structure
    - Document customizations
    - Test generated templates

For installation instructions, refer to the [Installation Guide](./install.md).
