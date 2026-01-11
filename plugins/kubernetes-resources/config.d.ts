export interface Config {
    /**
    * Frontend root URL
    * NOTE: Visibility applies to only this field
    * @visibility frontend
    */
    kubernetesResources?: {
      /**
      * Enable permission framework checks
      * NOTE: Visibility applies to only this field
      * @visibility frontend
      */
      enablePermissions?: boolean;
      /**
      * Annotation prefix for kubernetes resource annotations.
      * Must match the prefix configured in kubernetes-ingestor.
      * @default 'terasky.backstage.io'
      * @visibility frontend
      */
      annotationPrefix?: string;
    }
  }