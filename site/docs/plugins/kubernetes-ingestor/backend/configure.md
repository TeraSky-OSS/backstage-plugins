# Configuring the Kubernetes Ingestor Backend Plugin

This guide covers the configuration options available for the Kubernetes Ingestor backend plugin.

## Configuration File

The plugin is configured through your `app-config.yaml`. Here's a comprehensive example:

```yaml
kubernetesIngestor:
  # Optional field to set the default owner of the ingested resources.
  defaultOwner: kubernetes-auto-ingested
  # Whether to ingest API entities as CRD type instead of OpenAPI type (default: true)
  # When true, API entities will have type "crd" with the full CRD YAML as definition
  # When false, API entities will have type "openapi" with generated OpenAPI spec
  # Note: CRD-type APIs require the api-docs-module-crd plugin for proper rendering
  ingestAPIsAsCRDs: true
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
  # Default owner for ingested entities when no owner annotation is set
  defaultOwner: 'kubernetes-auto-ingested'
  # A list of cluster names to ingest resources from. If empty, resources from all clusters under kubernetes.clusterLocatorMethods.clusters will be ingested.
  # Note: Clusters using OIDC authentication are automatically excluded as they require client-side authentication.
  # allowedClusterNames:
  #   - my-cluster-name
  # Cluster name mapping for entity annotations (optional)
  # Maps backend cluster names (SA auth) to frontend cluster names (OIDC auth)
  # clusterNameMapping:
  #   mode: 'prefix-replacement'  # or 'explicit'
  #   sourcePrefix: 'sa-'
  #   targetPrefix: 'oidc-'
  #   # For explicit mode:
  #   # mappings:
  #   #   'sa-cls-01': 'oidc-cls-01'
  #   #   'sa-cls-02': 'oidc-cls-02'
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

## Cluster Authentication Requirements

The Kubernetes Ingestor plugin runs on the backend and communicates directly with Kubernetes clusters. This means it requires authentication methods that work for server-to-server communication.

### Supported Authentication Providers

The following authentication providers are supported:

- `serviceAccount` - Uses a Kubernetes service account token
- `google` - Uses Google Cloud service account credentials
- `aws` - Uses AWS IAM credentials
- `azure` - Uses Azure service principal credentials
- `localKubectlProxy` - Uses a local kubectl proxy

### Excluded Authentication Providers

The following authentication providers are **automatically excluded** because they require client-side (browser-based) authentication:

- `oidc` - OpenID Connect requires user interaction for authentication

Clusters configured with these auth providers will be silently skipped during ingestion. If you need to ingest resources from an OIDC-authenticated cluster, consider:

1. Adding a service account with appropriate RBAC permissions to the cluster
2. Configuring a separate cluster entry with `authProvider: serviceAccount` pointing to the same cluster

### Cluster Name Mapping

When working with multiple authentication methods for the same cluster, you may need to register the cluster twice: once with service account authentication for backend ingestion, and once with OIDC authentication for frontend user interactions. The cluster name mapping feature allows the ingestor to use one cluster name for data collection while annotating entities with a different cluster name for frontend interactions.

#### Use Case

You need different authentication methods for different contexts:
- **Backend/Ingestion**: Service Account (SA) authentication to scrape and ingest Kubernetes resources
- **Frontend**: OIDC authentication for user interactions through the Backstage UI

By using cluster name mapping, the ingestor will connect to clusters using SA authentication but annotate entities with the OIDC cluster name, ensuring users interact with the correct cluster configuration.

#### Configuration

The plugin supports two mapping modes: **prefix replacement** and **explicit mappings**.

##### Prefix Replacement Mode

Use this mode when your clusters follow a naming convention with prefixes:

```yaml
kubernetesIngestor:
  clusterNameMapping:
    mode: 'prefix-replacement'
    sourcePrefix: 'sa-'
    targetPrefix: 'oidc-'
```

**Examples:**
- Backend cluster: `sa-cls-01` → Frontend cluster: `oidc-cls-01`
- Backend cluster: `sa-cls-02` → Frontend cluster: `oidc-cls-02`
- Backend cluster: `sa-prod-us-east` → Frontend cluster: `oidc-prod-us-east`

##### Explicit Mapping Mode

Use this mode when you need specific, one-to-one mappings between cluster names:

```yaml
kubernetesIngestor:
  clusterNameMapping:
    mode: 'explicit'
    mappings:
      'sa-cls-01': 'oidc-cls-01'
      'sa-cls-02': 'oidc-cls-02'
      'backend-prod': 'frontend-prod'
      'svc-acct-dev': 'user-auth-dev'
```

**Behavior:**
- Mapped clusters use the specified frontend cluster name
- Unmapped clusters use their original names (backward compatible)

#### Complete Example

Here's a complete example showing both the Kubernetes plugin configuration and the Ingestor mapping:

```yaml
kubernetes:
  serviceLocatorMethod:
    type: 'multiTenant'
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        # Service Account clusters for backend ingestion
        - name: sa-cls-01
          url: https://cluster-01.example.com
          authProvider: 'serviceAccount'
          serviceAccountToken: ${K8S_SA_TOKEN_CLS_01}
        
        - name: sa-cls-02
          url: https://cluster-02.example.com
          authProvider: 'serviceAccount'
          serviceAccountToken: ${K8S_SA_TOKEN_CLS_02}
        
        # OIDC clusters for frontend interactions
        - name: oidc-cls-01
          url: https://cluster-01.example.com
          authProvider: 'oidc'
          oidcTokenProvider: default
        
        - name: oidc-cls-02
          url: https://cluster-02.example.com
          authProvider: 'oidc'
          oidcTokenProvider: default

kubernetesIngestor:
  enabled: true
  
  # Configure cluster name mapping
  clusterNameMapping:
    mode: 'prefix-replacement'
    sourcePrefix: 'sa-'
    targetPrefix: 'oidc-'
  
  # Optionally restrict ingestion to specific clusters
  allowedClusterNames:
    - 'sa-cls-01'
    - 'sa-cls-02'
```

#### How It Works

1. The ingestor connects to clusters using Service Account authentication (e.g., `sa-cls-01`)
2. It scrapes resources and creates Backstage entities
3. When setting the `backstage.io/kubernetes-cluster` annotation on entities, it applies the configured mapping
4. The annotation value becomes the mapped cluster name (e.g., `oidc-cls-01`)
5. When users interact with these entities in the Backstage UI, the Kubernetes plugin uses the OIDC cluster configuration

#### Cluster Name Normalization

For entity naming, organization, tagging, and template generation purposes, the plugin automatically strips the configured prefixes to ensure consistent naming regardless of which authentication method was used. This means:

- **Entity names** (when using `name-cluster` model): `myapp-cls-01` (not `myapp-sa-cls-01` or `myapp-oidc-cls-01`)
- **Entity titles** (when using `name-cluster` model): `myapp-cls-01` (not `myapp-sa-cls-01` or `myapp-oidc-cls-01`)
- **Namespaces** (when using `cluster` model): `cls-01` (not `sa-cls-01` or `oidc-cls-01`)
- **Systems** (when using `cluster` or `cluster-namespace` models): `cls-01` or `cls-01-default` (not `sa-cls-01-default`)
- **Tags**: `cluster:cls-01` (not `cluster:sa-cls-01` or `cluster:oidc-cls-01`)
- **Template cluster options** (in scaffolder templates): Users see and select `cls-01` in dropdowns (not `sa-cls-01` or `oidc-cls-01`)

**Example:**

With configuration:
```yaml
clusterNameMapping:
  mode: 'prefix-replacement'
  sourcePrefix: 'sa-'
  targetPrefix: 'oidc-'
```

And clusters: `sa-cls-01`, `sa-cls-02`, `oidc-cls-01`, `oidc-cls-02`

- Entity from `sa-cls-01` gets tag `cluster:cls-01` (prefix stripped)
- Entity from `oidc-cls-01` would also get tag `cluster:cls-01` (prefix stripped)
- But the `backstage.io/kubernetes-cluster` annotation will be `oidc-cls-01` (prefix mapped)

This ensures that:
1. Entities from the same physical cluster have consistent names/tags regardless of auth method
2. Users searching for "cls-01" will find all related entities
3. The Kubernetes plugin still uses the correct OIDC cluster for user interactions

#### Affected Entities

The cluster name mapping applies to the following entity types:
- Kubernetes workload components (Deployments, StatefulSets, etc.)
- Crossplane Claims (XRCs)
- Crossplane Composite Resources (XRs)
- KRO Instances

**Note:** The mapping only affects the `backstage.io/kubernetes-cluster` annotation value. Cluster tags (e.g., `cluster:sa-cls-01`) remain unchanged for filtering and searching purposes.

## Advanced Features

### API Entity Types: CRD vs OpenAPI

The plugin supports two formats for API entities generated from Custom Resource Definitions (CRDs), Crossplane XRDs, and KRO RGDs:

#### CRD-Type API Entities (Default)

```yaml
kubernetesIngestor:
  ingestAPIsAsCRDs: true  # Default: true
```

When `ingestAPIsAsCRDs` is set to `true` (or not set):
- API entities will have `spec.type: "crd"`
- The `spec.definition` field contains the full CRD YAML including the OpenAPI v3 schema
- Provides a more complete representation of the Kubernetes resource including metadata, status definitions, and printer columns
- **Requires the `@terasky/backstage-plugin-api-docs-module-crd` frontend plugin** to properly render CRD-type APIs in the Backstage UI

**Example CRD-Type API Entity:**
```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: clusterapp-example.clustered.crossplane.io--v1
spec:
  type: crd
  lifecycle: production
  owner: kubernetes-auto-ingested
  system: kubernetes-auto-ingested
  definition: |
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: clusterapps.example.clustered.crossplane.io
    spec:
      group: example.clustered.crossplane.io
      names:
        kind: ClusterApp
        plural: clusterapps
      versions:
        - name: v1
          schema:
            openAPIV3Schema:
              # Full OpenAPI schema here
```

#### OpenAPI-Type API Entities (Legacy)

```yaml
kubernetesIngestor:
  ingestAPIsAsCRDs: false
```

When `ingestAPIsAsCRDs` is set to `false`:
- API entities will have `spec.type: "openapi"`
- The `spec.definition` field contains a generated OpenAPI v3 specification
- Provides a simplified view focused on the API operations
- Works with Backstage's built-in API documentation viewer

**Example OpenAPI-Type API Entity:**
```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: clusterapp-example.clustered.crossplane.io--v1
spec:
  type: openapi
  lifecycle: production
  owner: kubernetes-auto-ingested
  system: kubernetes-auto-ingested
  definition: |
    openapi: 3.0.0
    info:
      title: clusterapps.example.clustered.crossplane.io
      version: v1
    components:
      schemas:
        Resource:
          type: object
          properties:
            # OpenAPI schema here
```

#### Choosing the Right Format

**Use CRD-Type (Default) when:**
- You want complete CRD documentation including metadata and status fields
- You need access to printer columns and subresource definitions
- You want consistency with how CRDs are represented in Kubernetes
- You have the api-docs-module-crd frontend plugin installed

**Use OpenAPI-Type when:**
- You prefer the simplified OpenAPI view
- You don't have the api-docs-module-crd plugin installed
- You want to use Backstage's built-in API documentation viewer
- You're migrating from an older version and want to maintain compatibility

#### Plugin Dependencies

When using CRD-type API entities (`ingestAPIsAsCRDs: true`), you must install the api-docs-module-crd frontend plugin:

```bash
yarn workspace app add @terasky/backstage-plugin-api-docs-module-crd
```

See the [api-docs-module-crd plugin documentation](../../api-docs-module-crd/overview.md) for installation and configuration instructions.

**Note:** The gitops-manifest-updater plugin automatically supports both CRD-type and OpenAPI-type API entities, so no additional configuration is needed for that plugin.

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

### API Auto-Registration from Workloads

The plugin supports automatic registration of API entities from OpenAPI/Swagger definitions exposed by your workloads. This feature allows you to annotate Kubernetes resources (Deployments, Crossplane claims, KRO instances, etc.) to automatically fetch their API definitions and create corresponding API entities in the Backstage catalog.

When an API entity is auto-registered:
- The API entity is created with the same name as the component
- The API entity title is set to `{Component Title} API` (e.g., "Petstore API")
- The API entity is assigned to the same system as the component
- The component's `providesApis` field is automatically updated to reference the API
- The API definition is stored in YAML format
- The `servers` field in the OpenAPI spec is automatically processed (see below)

#### Option 1: External URL Reference ($text directive)

Use this annotation when you want Backstage to fetch the API definition at runtime rather than embedding it in the catalog. This uses Backstage's `$text` substitution directive, which means the content is fetched when the entity is processed rather than during ingestion:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: petstore
  annotations:
    terasky.backstage.io/title: "Petstore"
    terasky.backstage.io/provides-api-from-def: "http://petstore.example.com/api/v3/openapi.json"
spec:
  # ... deployment spec
```

This creates an API entity with the following definition structure:

```yaml
spec:
  definition:
    $text: http://petstore.example.com/api/v3/openapi.json
```

**When to use this option:**
- When the API spec is frequently updated and you want the latest version
- When you don't want to store large API specs in the catalog database
- When the API endpoint is always accessible from the Backstage backend

**Note:** The URL must be accessible by the Backstage backend at runtime when the entity is processed.

#### Option 2: Fetch and Embed

Use this annotation when you want the plugin to fetch the API definition during ingestion and embed it directly in the catalog:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: petstore
  annotations:
    terasky.backstage.io/title: "Petstore"
    terasky.backstage.io/provides-api-from-url: "http://petstore.example.com/swagger/openapi.json"
spec:
  # ... deployment spec
```

The URL can point to:
- OpenAPI 3.x specifications (JSON or YAML)
- Swagger 2.x specifications (JSON or YAML)
- URLs from Git providers (GitHub, GitLab, Bitbucket, Azure DevOps) with automatic authentication

**Git Provider URLs**: When pointing to files hosted on Git providers, the plugin automatically uses Backstage's `UrlReaderService` for integrated authentication, caching, and rate limiting. This means your configured Git integrations will be used to authenticate requests. For example:

```yaml
# GitHub raw content URL (uses configured GitHub integration)
terasky.backstage.io/provides-api-from-url: "https://raw.githubusercontent.com/org/repo/main/openapi.json"

# GitLab raw file URL (uses configured GitLab integration)
terasky.backstage.io/provides-api-from-url: "https://gitlab.com/org/repo/-/raw/main/openapi.yaml"
```

**Internal Service URLs**: For non-Git URLs (e.g., internal service Swagger endpoints), the plugin uses direct HTTP requests, which is appropriate for endpoints that don't require Backstage integration authentication.

The plugin will automatically:
1. Fetch the API definition from the URL
2. Convert JSON to YAML if necessary
3. Create an API entity named after the component
4. Link the API to the component via `providesApis`

#### Option 3: Kubernetes Resource Reference

Use this annotation when the API endpoint information needs to be extracted from another Kubernetes resource (e.g., a Service's LoadBalancer IP):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: petstore
  annotations:
    terasky.backstage.io/title: "Petstore"
    terasky.backstage.io/provides-api-from-resource-ref: |
      {
        "kind": "Service",
        "name": "petstore-svc",
        "apiVersion": "v1",
        "path": "/swagger/openapi.json",
        "target-protocol": "http",
        "target-port": "80",
        "target-field": ".status.loadBalancer.ingress[0].ip"
      }
spec:
  # ... deployment spec
```

**Resource Reference Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `kind` | Yes | The Kubernetes resource kind (e.g., "Service", "Ingress") |
| `name` | Yes | The name of the Kubernetes resource |
| `apiVersion` | Yes | The API version (e.g., "v1", "networking.k8s.io/v1") |
| `namespace` | No | The namespace (defaults to the annotated resource's namespace) |
| `path` | Yes | The path to append to the endpoint URL (e.g., "/swagger/openapi.json") |
| `target-protocol` | Yes | The protocol to use: "http" or "https" |
| `target-port` | Yes | The port number to use |
| `target-field` | Yes | JSONPath-like expression to extract the endpoint from the resource |

**Supported `target-field` Examples:**

```yaml
# Get LoadBalancer IP from a Service
"target-field": ".status.loadBalancer.ingress[0].ip"

# Get LoadBalancer hostname from a Service
"target-field": ".status.loadBalancer.ingress[0].hostname"

# Get cluster IP from a Service
"target-field": ".spec.clusterIP"

# Get external IP from a Service (first one)
"target-field": ".spec.externalIPs[0]"

# Get FQDN from Ingress
"target-field": ".spec.rules[0].host"
```

The plugin will:
1. Fetch the referenced Kubernetes resource
2. Extract the endpoint using the `target-field` expression
3. Construct the full URL: `{target-protocol}://{extracted-endpoint}:{target-port}{path}`
4. Fetch the API definition from the constructed URL
5. Create an API entity and link it to the component

#### Server URL Processing

The plugin automatically processes the `servers` field in OpenAPI specifications to ensure usable server URLs:

**Relative URLs**: If the `servers[0].url` field contains a relative path (e.g., `/api/v1`), it is automatically converted to a full URL based on where the API specification was fetched from.

```yaml
# Original spec fetched from http://api.example.com:8080/swagger.json
servers:
  - url: /api/v1

# After processing
servers:
  - url: http://api.example.com:8080/api/v1
```

**Different Server URLs**: If the `servers[0].url` field contains a full URL that differs from the fetch location, the plugin preserves the original URL and adds a second server entry based on the fetch location:

```yaml
# Original spec fetched from http://internal.example.com:8080/swagger.json
servers:
  - url: https://external.example.com/api

# After processing - both URLs are preserved
servers:
  - url: https://external.example.com/api
  - url: http://internal.example.com:8080/api
    description: Server based on API fetch location
```

**Empty or Missing Servers**: If the `servers` field is empty or missing, the plugin adds a server entry based on the fetch URL.

This automatic processing ensures that API documentation in Backstage always includes usable server URLs for testing and exploration.

#### Error Handling

If the plugin fails to fetch the API definition (network error, invalid URL, resource not found, etc.):
- A warning is logged with details about the failure
- The component is still created without the API reference
- The plugin continues processing other resources

This ensures that a failing API endpoint doesn't prevent the rest of your catalog from being ingested.

#### Use Cases

1. **Microservices with Swagger UI**: Annotate deployments to auto-register their OpenAPI specs
2. **External APIs**: Reference APIs exposed via LoadBalancer services
3. **Internal Services**: Use ClusterIP or service DNS for internal API documentation
4. **Crossplane-provisioned APIs**: Auto-register APIs from infrastructure provisioned by Crossplane
5. **KRO Application Stacks**: Document APIs from multi-resource applications managed by KRO

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

## Ownership

### Default Owner
If a resource does not define an owner annotation, the ingestor uses `kubernetesIngestor.defaultOwner`.

Default: `kubernetes-auto-ingested`

```yaml
kubernetesIngestor:
  defaultOwner: platform-engineering-team
```

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
