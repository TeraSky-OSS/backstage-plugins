/**
 * Configuration schema for the VCF Operations backend plugin.
 * 
 * This plugin provides API endpoints for managing VCF Operations metrics
 * and monitoring data.
 */
export interface Config {
  /**
   * VCF Operations configuration
   */
  vcfOperations?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
    /**
     * VCF Operations instances
     */
    instances: Array<{
      /**
       * Instance name for identification
       */
      name: string;
      /**
       * VCF Operations base URL
       */
      baseUrl: string;
      /**
       * VCF Operations major version (8 or 9)
       */
      majorVersion: number;
      /**
       * Related VCF Automation instance names
       */
      relatedVCFAInstances?: string[];
      /**
       * Authentication configuration
       */
      authentication: {
        /**
         * Username for API access
         */
        username: string;
        /**
         * Password for API access
         * @visibility secret
         */
        password: string;
      };
    }>;
  };
}
