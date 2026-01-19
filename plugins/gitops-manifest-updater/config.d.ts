export interface Config {
  /**
   * Kubernetes Ingestor configuration
   * @visibility frontend
   */
  kubernetesIngestor?: {
    /**
     * Custom annotation prefix used for source file URL annotations.
     * Defaults to 'terasky.backstage.io' if not specified.
     * @visibility frontend
     */
    annotationPrefix?: string;
  };
}
