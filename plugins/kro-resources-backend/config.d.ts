/**
 * Configuration schema for the KRO Resources backend plugin.
 * 
 * This plugin provides API endpoints for accessing and managing KRO (Kubernetes Resource Orchestrator)
 * resources from Kubernetes clusters. It uses the Kubernetes plugin proxy to fetch
 * KRO resources and their dependencies.
 */
export interface Config {
  /**
   * KRO configuration
   */
  kro?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
  };
}
