/**
 * Configuration schema for the SpectroCloud Kubernetes cluster supplier module.
 * 
 * This module extends the Kubernetes plugin to add SpectroCloud Palette cluster discovery.
 * It works alongside existing cluster locator types (config, catalog, gke, localKubectlProxy)
 * which are provided by @backstage/plugin-kubernetes-backend.
 * 
 * NOTE: SpectroCloud configuration is separate from kubernetes.clusterLocatorMethods
 * to avoid conflicts with the default Kubernetes plugin processing.
 * 
 * The configuration supports multiple SpectroCloud instances via the environments array.
 */
export interface Config {
  /**
   * SpectroCloud configuration
   */
  spectrocloud?: {
    /**
     * Optional: Annotation prefix for SpectroCloud metadata (default: terasky.backstage.io)
     * @visibility frontend
     */
    annotationPrefix?: string;
    /**
     * Optional: Enable permission checks (default: false)
     * @visibility frontend
     */
    enablePermissions?: boolean;
    /**
     * SpectroCloud environments - supports multiple instances
     */
    environments?: Array<{
      /**
       * SpectroCloud Palette API URL
       * @visibility secret
       */
      url: string;
      /**
       * SpectroCloud tenant name
       * @visibility secret
       */
      tenant: string;
      /**
       * SpectroCloud API token
       * @visibility secret
       */
      apiToken: string;
      /**
       * Optional: Instance name used as prefix for cluster names to avoid conflicts
       * If not provided, cluster names are used as-is
       * Example: name "prod" with cluster "my-cluster" becomes "prod-my-cluster"
       * @visibility frontend
       */
      name?: string;
      /**
       * Cluster provider configuration for this SpectroCloud instance
       * @visibility frontend
       */
      clusterProvider?: {
        /**
         * Optional: Authentication type for Kubernetes clusters (default: serviceAccount)
         * - serviceAccount: Create service accounts in clusters for authentication
         * - oidc: Use OIDC authentication (no resources created in clusters)
         * @visibility frontend
         */
        authType?: 'serviceAccount' | 'oidc';
        /**
         * Optional: OIDC auth provider name when authType is 'oidc' (default: spectrocloud)
         * This should match the oidcTokenProvider configured in the Kubernetes plugin
         * @visibility frontend
         */
        oidcAuthProviderName?: string;
        /**
         * Optional: List of projects to include (if empty, all projects are included)
         * @visibility frontend
         */
        includeProjects?: string[];
        /**
         * Optional: List of projects to exclude
         * @visibility frontend
         */
        excludeProjects?: string[];
        /**
         * Optional: Skip metrics lookup for these clusters (default: true)
         * @visibility frontend
         */
        skipMetricsLookup?: boolean;
        /**
         * Optional: Exclude tenant-scoped clusters (default: false)
         * @visibility frontend
         */
        excludeTenantScopedClusters?: boolean;
        /**
         * Optional: Refresh interval in seconds (default: 600 = 10 minutes)
         * @visibility frontend
         */
        refreshIntervalSeconds?: number;
        /**
         * Optional: Timeout in seconds for RBAC setup per cluster (default: 15)
         * Only applies when authType is 'serviceAccount'
         * @visibility frontend
         */
        clusterTimeoutSeconds?: number;
        /**
         * Optional: RBAC configuration
         * Only applies when authType is 'serviceAccount'
         * @visibility frontend
         */
        rbac?: {
          /**
           * Namespace to create for Backstage resources (default: backstage-system)
           */
          namespace?: string;
          /**
           * ServiceAccount name (default: backstage-sa)
           */
          serviceAccountName?: string;
          /**
           * Secret name for SA token (default: backstage-sa-token)
           */
          secretName?: string;
          /**
           * ClusterRole name (default: backstage-read-only)
           */
          clusterRoleName?: string;
          /**
           * ClusterRoleBinding name (default: backstage-read-only-binding)
           */
          clusterRoleBindingName?: string;
          /**
           * Custom ClusterRole rules (overrides default read-only rules)
           * If not provided, defaults to get/list/watch on all resources
           */
          clusterRoleRules?: Array<{
            /**
             * API groups - use 'core' for the Kubernetes core API group (pods, services, etc.)
             * Examples: ["core", "apps", "batch"], ["networking.k8s.io"]
             */
            apiGroups: string[];
            /**
             * Resources (e.g., ["pods", "deployments"])
             */
            resources: string[];
            /**
             * Verbs (e.g., ["get", "list", "watch"])
             */
            verbs: string[];
          }>;
        };
      };
    }>;
  };
}
