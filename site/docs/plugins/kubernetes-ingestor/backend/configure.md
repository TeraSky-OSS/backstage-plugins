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
    xrds:
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
    crdLabelSelector:
      key: terasky.backstage.io/generate-form
      value: "true"
    crds:
      - certificates.cert-manager.io
  # Whether to auto add the argo cd plugins annotation to the ingested components if the ingested resources have the ArgoCD tracking annotation added to them. defaults to false
  argoIntegration: true
```

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
    git:
      repoUrl: github.com?owner=org&repo=templates
      targetBranch: main
  
  # Processing settings
  convertDefaultValuesToPlaceholders: true
  ingestAllXRDs: true
```

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
