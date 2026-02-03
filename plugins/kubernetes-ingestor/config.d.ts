/**
 * Configuration schema for the Kubernetes Ingestor catalog module.
 * 
 * This module extends the catalog plugin to ingest Kubernetes resources
 * as Backstage entities, including workloads, Crossplane resources, and KRO resources.
 */
export interface Config {
  kubernetesIngestor?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
    /**
     * Custom annotation prefix for metadata annotations
     * @default terasky.backstage.io
     * @visibility frontend
     */
    annotationPrefix?: string;
    /**
     * Default owner for auto-ingested entities
     * @default kubernetes-auto-ingested
     * @visibility frontend
     */
    defaultOwner?: string;
    /**
     * Ingest API entities as CRD type instead of OpenAPI type
     * When true, API entities will have type "crd" with the CRD YAML as definition
     * When false, API entities will have type "openapi" with generated OpenAPI spec
     * @default true
     * @visibility frontend
     */
    ingestAPIsAsCRDs?: boolean;
    /**
     * Allow ingestion from all clusters
     * @default false
     * @visibility frontend
     */
    allowAllClusters?: boolean;
    /**
     * List of allowed cluster names to ingest from
     * @visibility frontend
     */
    allowedClusterNames?: string[];
    /**
     * Cluster name mapping for entity annotations
     * Maps backend cluster names (used for ingestion) to frontend cluster names (used in kubernetes-cluster annotations)
     * Supports both prefix-based replacement and explicit mappings
     * @visibility frontend
     */
    clusterNameMapping?: {
      /**
       * Mapping mode: 'prefix-replacement' or 'explicit'
       * - prefix-replacement: Replace source prefix with target prefix (e.g., sa-cls-01 -> oidc-cls-01)
       * - explicit: Use explicit key-value mappings
       * @visibility frontend
       */
      mode?: 'prefix-replacement' | 'explicit';
      /**
       * Source prefix to replace (only used in prefix-replacement mode)
       * @visibility frontend
       */
      sourcePrefix?: string;
      /**
       * Target prefix to use as replacement (only used in prefix-replacement mode)
       * @visibility frontend
       */
      targetPrefix?: string;
      /**
       * Explicit cluster name mappings (only used in explicit mode)
       * Key: backend cluster name (SA auth), Value: frontend cluster name (OIDC auth)
       * @visibility frontend
       */
      mappings?: {
        [key: string]: string;
      };
    };
    /**
     * Enable Argo CD integration for discovering dependencies
     * @default true
     * @visibility frontend
     */
    argoIntegration?: boolean;
    /**
     * Entity naming and organization mappings
     */
    mappings?: {
      /**
       * Model for determining system namespace
       * Options: default, cluster, cluster-namespace, same
       * @default default
       * @visibility frontend
       */
      namespaceModel?: string;
      /**
       * Model for determining entity names
       * Options: name, name-kind, name-cluster, name-kind-cluster
       * @default name
       * @visibility frontend
       */
      nameModel?: string;
      /**
       * Model for determining entity titles
       * Options: name, name-cluster
       * @default name
       * @visibility frontend
       */
      titleModel?: string;
      /**
       * Model for determining system assignments
       * Options: namespace, cluster, cluster-namespace
       * @default namespace
       * @visibility frontend
       */
      systemModel?: string;
      /**
       * Model for determining system references
       * Options: default, same
       * @default default
       * @visibility frontend
       */
      referencesNamespaceModel?: string;
    };
    /**
     * Configuration for ingesting Kubernetes workload components
     */
    components?: {
      /**
       * Enable component ingestion
       * @default true
       * @visibility frontend
       */
      enabled?: boolean;
      /**
       * Ingest components as Resource entities instead of Component entities
       * @default false
       * @visibility frontend
       */
      ingestAsResources?: boolean;
      /**
       * Only ingest resources with specific annotations
       * @default false
       * @visibility frontend
       */
      onlyIngestAnnotatedResources?: boolean;
      /**
       * List of namespaces to exclude from ingestion
       * @visibility frontend
       */
      excludedNamespaces?: string[];
      /**
       * Custom workload types to ingest (in addition to defaults)
       * @visibility frontend
       */
      customWorkloadTypes?: string[];
      /**
       * Disable default workload types (Deployment, StatefulSet, etc.)
       * @default false
       * @visibility frontend
       */
      disableDefaultWorkloadTypes?: boolean;
      /**
       * Task runner configuration for component ingestion
       */
      taskRunner?: {
        /**
         * Refresh frequency in seconds
         * @default 600
         */
        frequency?: number;
        /**
         * Task timeout in seconds
         * @default 600
         */
        timeout?: number;
      };
    };
    /**
     * Configuration for Crossplane resource ingestion
     */
    crossplane?: {
      /**
       * Enable Crossplane resource ingestion
       * @default true
       * @visibility frontend
       */
      enabled?: boolean;
      /**
       * Configuration for Crossplane Claim ingestion
       */
      claims?: {
        /**
         * Ingest claims as Resource entities instead of Component entities
         * @default false
         * @visibility frontend
         */
        ingestAsResources?: boolean;
        /**
         * Ingest all claims even without annotations
         * @default false
         * @visibility frontend
         */
        ingestAllClaims?: boolean;
      };
      /**
       * Configuration for Crossplane XRD (CompositeResourceDefinition) ingestion
       */
      xrds?: {
        /**
         * Enable XRD ingestion
         * @default true
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Ingest XRDs only as API entities (not as scaffolder templates)
         * @default false
         * @visibility frontend
         */
        ingestOnlyAsAPI?: boolean;
        /**
         * Convert default values to placeholders in scaffolder templates
         * @default false
         * @visibility frontend
         */
        convertDefaultValuesToPlaceholders?: boolean;
        /**
         * Ingest all XRDs even without annotations
         * @default false
         * @visibility frontend
         */
        ingestAllXRDs?: boolean;
        /**
         * Configuration for the publish phase in scaffolder templates
         */
        publishPhase?: {
          /**
           * Target system for publishing (github, gitlab, catalog)
           * @visibility frontend
           */
          target?: string;
          /**
           * Allow users to select repository at template creation time
           * @default false
           * @visibility frontend
           */
          allowRepoSelection?: boolean;
          /**
           * Request user credentials for repository URL
           * @default false
           * @visibility frontend
           */
          requestUserCredentialsForRepoUrl?: boolean;
          /**
           * Allowed target hosts for repository URLs
           * @visibility frontend
           */
          allowedTargets?: string[];
          /**
           * Git repository configuration
           */
          git?: {
            /**
             * Default repository URL
             * @visibility frontend
             */
            repoUrl?: string;
            /**
             * Target branch for commits
             * @default main
             * @visibility frontend
             */
            targetBranch?: string;
          };
        };
        /**
         * Task runner configuration for XRD ingestion
         */
        taskRunner?: {
          /**
           * Refresh frequency in seconds
           * @default 600
           */
          frequency?: number;
          /**
           * Task timeout in seconds
           * @default 600
           */
          timeout?: number;
        };
      };
    };
    /**
     * Configuration for KRO (Kubernetes Resource Orchestrator) resource ingestion
     */
    kro?: {
      /**
       * Enable KRO resource ingestion
       * @default false
       * @visibility frontend
       */
      enabled?: boolean;
      /**
       * Configuration for KRO Instance ingestion
       */
      instances?: {
        /**
         * Ingest instances as Resource entities instead of Component entities
         * @default false
         * @visibility frontend
         */
        ingestAsResources?: boolean;
        /**
         * Ingest all instances even without annotations
         * @default false
         * @visibility frontend
         */
        ingestAllInstances?: boolean;
      };
      /**
       * Configuration for KRO RGD (ResourceGraphDefinition) ingestion
       */
      rgds?: {
        /**
         * Enable RGD ingestion
         * @default true
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Ingest RGDs only as API entities (not as scaffolder templates)
         * @default false
         * @visibility frontend
         */
        ingestOnlyAsAPI?: boolean;
        /**
         * Convert default values to placeholders in scaffolder templates
         * @default false
         * @visibility frontend
         */
        convertDefaultValuesToPlaceholders?: boolean;
        /**
         * Ingest all RGDs even without annotations
         * @default false
         * @visibility frontend
         */
        ingestAllRGDs?: boolean;
        /**
         * Configuration for the publish phase in scaffolder templates
         */
        publishPhase?: {
          /**
           * Target system for publishing (github, gitlab, catalog)
           * @visibility frontend
           */
          target?: string;
          /**
           * Allow users to select repository at template creation time
           * @default false
           * @visibility frontend
           */
          allowRepoSelection?: boolean;
          /**
           * Request user credentials for repository URL
           * @default false
           * @visibility frontend
           */
          requestUserCredentialsForRepoUrl?: boolean;
          /**
           * Allowed target hosts for repository URLs
           * @visibility frontend
           */
          allowedTargets?: string[];
          /**
           * Git repository configuration
           */
          git?: {
            /**
             * Default repository URL
             * @visibility frontend
             */
            repoUrl?: string;
            /**
             * Target branch for commits
             * @default main
             * @visibility frontend
             */
            targetBranch?: string;
          };
        };
        /**
         * Task runner configuration for RGD ingestion
         */
        taskRunner?: {
          /**
           * Refresh frequency in seconds
           * @default 600
           */
          frequency?: number;
          /**
           * Task timeout in seconds
           * @default 600
           */
          timeout?: number;
        };
      };
    };
    /**
     * Configuration for generic CRD template generation
     */
    genericCRDTemplates?: {
      /**
       * Ingest only as API entities (not as scaffolder templates)
       * @default false
       * @visibility frontend
       */
      ingestOnlyAsAPI?: boolean;
      /**
       * List of CRD group names to generate templates for
       * @visibility frontend
       */
      crds?: string[];
      /**
       * Label selector for filtering CRDs
       */
      crdLabelSelector?: {
        /**
         * Label key to match
         * @visibility frontend
         */
        key?: string;
        /**
         * Label value to match
         * @visibility frontend
         */
        value?: string;
      };
      /**
       * Configuration for the publish phase in scaffolder templates
       */
      publishPhase?: {
        /**
         * Target system for publishing (github, gitlab, catalog)
         * @visibility frontend
         */
        target?: string;
        /**
         * Allow users to select repository at template creation time
         * @default false
         * @visibility frontend
         */
        allowRepoSelection?: boolean;
        /**
         * Request user credentials for repository URL
         * @default false
         * @visibility frontend
         */
        requestUserCredentialsForRepoUrl?: boolean;
        /**
         * Allowed target hosts for repository URLs
         * @visibility frontend
         */
        allowedTargets?: string[];
        /**
         * Git repository configuration
         */
        git?: {
          /**
           * Default repository URL
           * @visibility frontend
           */
          repoUrl?: string;
          /**
           * Target branch for commits
           * @default main
           * @visibility frontend
           */
          targetBranch?: string;
        };
      };
    };
  };
}
