# backstage-plugin-kubernetes-ingestor

Welcome to the backstage-plugin-kubernetes-ingestor backend plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-ingestor)

## Description

The `backstage-plugin-kubernetes-ingestor` backend plugin for Backstage is a catalog entity provider that creates catalog entities directly from Kubernetes resources. It has the ability to ingest by default all standard Kubernetes workload types, allows supplying custom GVKs, and has the ability to auto-ingest all Crossplane claims automatically as components. There are numerous annotations which can be put on the Kubernetes workloads to influence the creation of the component in Backstage. It also supports creating Backstage templates and registers them in the catalog for every XRD in your cluster for the Claim resource type. Currently, this supports adding via a PR to a GitHub/GitLab/Bitbucket repo or providing a download link to the generated YAML without pushing to git. The plugin also generates API entities for all XRDs and defines the dependencies and relationships between all claims and the relevant APIs for easy discoverability within the portal.

## Installation

To install and configure the `backstage-plugin-kubernetes-ingestor` backend plugin in your Backstage instance, follow these steps:

### 1. Install the Plugin

Add the plugin to your Backstage project by running:

* Add the package
  ```bash
  yarn --cwd packages/backend add @terasky/backstage-plugin-kubernetes-ingestor
  yarn --cwd packages/backend add @terasky/backstage-plugin-scaffolder-backend-module-terasky-utils
  ```
  * Add to backend (packages/backend/src/index.ts)
  ```javascript
  backend.add(import('@terasky/backstage-plugin-kubernetes-ingestor'));
  backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
  backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));
  backend.add(import('@backstage/plugin-scaffolder-backend-module-bitbucket'));
  backend.add(import('@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils'));
  ```

## Configuration
* Configure RBAC based on the [following doc](./K8S_RBAC.md)
* available config options:
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
    nameModel: 'name-cluster' # name-cluster, name-namespace, name
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
    claims:
      # Whether to create components for all claim resources in your cluster
      ingestAllClaims: true
    xrds:
      # Settings related to the final steps of a software template
      publishPhase:
        # Base URLs of Git servers you want to allow publishing to
        allowedTargets: ['github.com', 'gitlab.com']
        # What to publish to. currently supports github, gitlab, bitbucket, and YAML (provides a link to download the file)
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
      # What to publish to. currently supports github, gitlab, bitbucket, and YAML (provides a link to download the file)
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
```

## Usage
Once installed and configured, the backstage-plugin-kubernetes-ingestor plugin will provide endpoints for managing Kubernetes resources and integrating them into the Backstage catalog. You can access these endpoints via the configured routes in your Backstage backend.

This plugins supports the following annotations on kuberenetes resources:
```yaml
General Annotations:
- terasky.backstage.io/add-to-catalog: Defaults to false. this is used when onlyIngestAnnotatedResources is set to true and or when ingestAllXRDs is set to false in the app-config.yaml
- terasky.backstage.io/exclude-from-catalog: Defaults to true. this is used when onlyIngestAnnotatedResources is set to false and or when ingestAllXRDs is set to true in the app-config.yaml
- terasky.backstage.io/system: Defaults to the kubernetes namespace of the resource
- terasky.backstage.io/backstage-namespace: Defaults to default
- terasky.backstage.io/owner: Defaults to kubernetes-auto-ingested
Namespace Annotations:
- terasky.backstage.io/system-type: Defaults to product
- terasky.backstage.io/domain: no default
Workload Resource Annotations:
- terasky.backstage.io/source-code-repo-url: no default
- terasky.backstage.io/source-branch: Defaults to main
- terasky.backstage.io/techdocs-path: no default
- terasky.backstage.io/kubernetes-label-selector: Only needed for non crossplane claims
- terasky.backstage.io/component-type: Defaults to service
- terasky.backstage.io/lifecycle: Defaults to production
- terasky.backstage.io/dependsOn: no default
- terasky.backstage.io/providesApis: no default
- terasky.backstage.io/consumesApis: no default
- terasky.backstage.io/component-annotations: no default - allows supplying nested annotation key value pairs to be added to components
```


## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.
