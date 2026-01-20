export interface Config {
  kubernetes?: {
    /**
     * Cluster locator methods
     */
    clusterLocatorMethods?: Array<
      | {
          /**
           * @visibility frontend
           */
          type: 'config';
          /**
           * List of clusters to configure manually
           * @visibility frontend
           */
          clusters: Array<{
            /**
             * @visibility frontend
             */
            name: string;
            /**
             * @visibility frontend
             */
            url: string;
            /**
             * @visibility frontend
             */
            authProvider: string;
            /**
             * @visibility secret
             */
            serviceAccountToken?: string;
            /**
             * @visibility frontend
             */
            oidcTokenProvider?: string;
            /**
             * @visibility frontend
             */
            skipTLSVerify?: boolean;
            /**
             * @visibility frontend
             */
            skipMetricsLookup?: boolean;
            /**
             * @visibility secret
             */
            caData?: string;
            /**
             * @visibility secret
             */
            caFile?: string;
          }>;
        }
      | {
          /**
           * @visibility frontend
           */
          type: 'catalog';
        }
      | {
          /**
           * @visibility frontend
           */
          type: 'localKubectlProxy';
        }
      | {
          /**
           * @visibility frontend
           */
          type: 'gke';
          /**
           * GCP Project ID
           * @visibility frontend
           */
          projectId: string;
          /**
           * GCP region (defaults to '-' for all regions)
           * @visibility frontend
           */
          region?: string;
          /**
           * Auth provider (google or googleServiceAccount)
           * @visibility frontend
           */
          authProvider?: string;
          /**
           * Skip TLS verification
           * @visibility frontend
           */
          skipTLSVerify?: boolean;
          /**
           * Skip metrics lookup
           * @visibility frontend
           */
          skipMetricsLookup?: boolean;
          /**
           * Expose GKE dashboard
           * @visibility frontend
           */
          exposeDashboard?: boolean;
          /**
           * Refresh interval (ISO 8601 duration)
           * @visibility frontend
           */
          refreshInterval?: string;
          /**
           * Match clusters by resource labels
           * @visibility frontend
           */
          matchingResourceLabels?: Array<{
            key: string;
            value: string;
          }>;
        }
      | {
          /**
           * @visibility frontend
           */
          type: 'spectrocloud';
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
           * @visibility frontend
           */
          clusterTimeoutSeconds?: number;
          /**
           * Optional: RBAC configuration
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
        }
    >;
  };
}

