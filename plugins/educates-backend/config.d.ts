export interface Config {
  educates?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
    /**
     * List of training portals
     */
    trainingPortals: Array<{
      /**
       * Name of the training portal
       */
      name: string;
      /**
       * URL of the training portal
       */
      url: string;
      /**
       * Authentication configuration
       */
      auth: {
        /**
         * Robot account username for API access
         */
        robotUsername: string;
        /**
         * Robot account password for API access
         * @visibility secret
         */
        robotPassword: string;
        /**
         * OAuth client ID for API access
         */
        clientId: string;
        /**
         * OAuth client secret for API access
         * @visibility secret
         */
        clientSecret: string;
      };
    }>;
  };
} 