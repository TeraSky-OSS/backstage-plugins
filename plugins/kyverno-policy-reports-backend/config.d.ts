/**
 * Configuration schema for the Kyverno Policy Reports backend plugin.
 * 
 * This plugin provides API endpoints for accessing Kyverno policy reports
 * from Kubernetes clusters. It uses the Kubernetes plugin proxy to fetch
 * policy reports from clusters.
 * 
 * Note: This plugin reads the annotation prefix from kubernetesIngestor.annotationPrefix
 */
export interface Config {
  /**
   * Kyverno configuration
   */
  kyverno?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
    /**
     * Enable permission checks for policy report access
     * @visibility frontend
     */
    enablePermissions?: boolean;
  };
}
