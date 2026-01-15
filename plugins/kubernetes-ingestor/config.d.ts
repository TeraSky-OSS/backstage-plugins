export interface Config {
  kubernetesIngestor?: {
    /**
     * Custom annotation prefix used by kubernetes-ingestor.
     * @visibility frontend
     */
    annotationPrefix?: string;
  };
}
