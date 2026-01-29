/**
 * Configuration schema for the SpectroCloud backend plugin.
 * 
 * This plugin provides HTTP API endpoints and MCP actions for SpectroCloud.
 * 
 * All configuration is under the 'spectrocloud' top-level key as an object
 * with global settings and an 'environments' array for multiple instances.
 */
export interface Config {
  /**
   * SpectroCloud configuration
   */
  spectrocloud?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
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
       * Optional: Instance name used as prefix for entity names to avoid conflicts
       * If not provided, entity names are used as-is
       * Example: name "prod" with project "my-project" becomes "prod-my-project"
       * @visibility frontend
       */
      name?: string;
      /**
       * Catalog provider configuration for this SpectroCloud instance
       * @visibility frontend
       */
      catalogProvider?: {
        /**
         * Optional: Enable catalog provider (default: true)
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Optional: Refresh interval in seconds (default: 600 = 10 minutes)
         * @visibility frontend
         */
        refreshIntervalSeconds?: number;
        /**
         * Optional: Default owner for ingested entities (default: spectrocloud-auto-ingested)
         * @visibility frontend
         */
        defaultOwner?: string;
        /**
         * Optional: Owner namespace prefix (default: group)
         * Can be 'group' or 'user'
         * @visibility frontend
         */
        ownerNamespace?: string;
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
         * Optional: Exclude tenant-scoped resources (default: false)
         * @visibility frontend
         */
        excludeTenantScopedResources?: boolean;
        /**
         * Optional: Resource ingestion configuration
         * @visibility frontend
         */
        resources?: {
          /**
           * Optional: Ingest projects as System entities (default: true)
           * @visibility frontend
           */
          projects?: boolean;
          /**
           * Optional: Ingest cluster profiles as Resource entities (default: true)
           * @visibility frontend
           */
          clusterProfiles?: boolean;
          /**
           * Optional: Ingest clusters as Resource entities (default: true)
           * @visibility frontend
           */
          clusters?: boolean;
        };
      };
    }>;
  };
}
