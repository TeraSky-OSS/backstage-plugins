/**
 * Configuration schema for the Crossplane Resources backend plugin.
 * 
 * This plugin provides API endpoints for accessing and managing Crossplane
 * resources from Kubernetes clusters. It uses the Kubernetes plugin proxy to fetch
 * Crossplane managed resources, compositions, and their dependencies.
 */
export interface Config {
  /**
   * Crossplane configuration
   */
  crossplane?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
  };
}
