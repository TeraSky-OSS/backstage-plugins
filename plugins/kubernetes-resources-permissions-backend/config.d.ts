/**
 * Configuration schema for the Kubernetes Resources Permissions backend plugin.
 * 
 * This plugin provides API endpoints for checking permissions on Kubernetes resources.
 * It integrates with the Backstage permissions framework to enforce access control.
 */
export interface Config {
  /**
   * Kubernetes Resources configuration
   */
  'kubernetes-resources'?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
  };
}
