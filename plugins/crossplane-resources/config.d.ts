export interface Config {
    /**
    * Frontend root URL
    * NOTE: Visibility applies to only this field
    * @visibility frontend
    */
    crossplane?: {
      /**
      * Enable permission framework checks
      * NOTE: Visibility applies to only this field
      * @visibility frontend
      */
      enablePermissions: boolean;
    };
    /**
     * Kubernetes Ingestor configuration
     * @visibility frontend
     */
    kubernetesIngestor?: {
      /**
       * Custom annotation prefix used for Crossplane resource annotations.
       * Defaults to 'terasky.backstage.io' if not specified.
       * @visibility frontend
       */
      annotationPrefix?: string;
    };
  }