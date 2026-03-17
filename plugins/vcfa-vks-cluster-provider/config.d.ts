/**
 * Configuration schema for the VCF Automation VKS Kubernetes cluster supplier module.
 *
 * This module extends the Kubernetes plugin to add VCF Automation VKS cluster discovery.
 * It authenticates with VCFA using the vCloud Director API (v9+ / all-apps style),
 * discovers all VKS (Tanzu Kubernetes) clusters via the supervisor resources API,
 * fetches their admin kubeconfigs, and sets up service account based access.
 */
export interface Config {
  /**
   * VCF Automation VKS cluster provider configuration
   */
  vcfaVks?: {
    /**
     * VCFA instances to discover VKS clusters from
     */
    instances?: Array<{
      /**
       * VCFA base URL (e.g. https://vcfa.example.com)
       * @visibility secret
       */
      baseUrl: string;
      /**
       * Optional display name for this instance (used in log messages)
       * @visibility frontend
       */
      name?: string;
      /**
       * Organization name — appended to the username as username@orgName for Basic Auth
       * @visibility secret
       */
      orgName: string;
      /**
       * Authentication credentials for the VCFA API
       */
      authentication: {
        /**
         * VCFA username
         * @visibility secret
         */
        username: string;
        /**
         * VCFA password
         * @visibility secret
         */
        password: string;
      };
      /**
       * Cluster provider configuration for Kubernetes access
       * @visibility frontend
       */
      clusterProvider?: {
        /**
         * Optional: Skip metrics lookup for discovered clusters (default: true)
         * @visibility frontend
         */
        skipMetricsLookup?: boolean;
        /**
         * Optional: Refresh interval in seconds (default: 600 = 10 minutes)
         * @visibility frontend
         */
        refreshIntervalSeconds?: number;
        /**
         * Optional: Timeout in seconds for service account setup per cluster (default: 15)
         * @visibility frontend
         */
        clusterTimeoutSeconds?: number;
        /**
         * Optional: RBAC configuration for service account creation in each cluster
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
           * Secret name for the SA token (default: backstage-sa-token)
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
           * Custom ClusterRole rules (overrides default get/list/watch on all resources)
           * Use 'core' for the Kubernetes core API group (pods, services, etc.)
           */
          clusterRoleRules?: Array<{
            /**
             * API groups — use 'core' for the Kubernetes core API group
             * Examples: ["core", "apps", "batch"], ["networking.k8s.io"]
             */
            apiGroups: string[];
            /**
             * Resources (e.g. ["pods", "deployments"])
             */
            resources: string[];
            /**
             * Verbs (e.g. ["get", "list", "watch"])
             */
            verbs: string[];
          }>;
        };
      };
    }>;
  };
}
