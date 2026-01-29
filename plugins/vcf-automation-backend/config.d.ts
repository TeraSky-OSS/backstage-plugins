/**
 * Configuration schema for the VCF Automation backend plugin.
 * 
 * This plugin provides API endpoints for managing VCF Automation resources.
 */
export interface Config {
  /**
   * VCF Automation configuration
   */
  vcfAutomation?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
    /**
     * VCF Automation base URL (legacy single instance)
     */
    baseUrl?: string;
    /**
     * Instance name (legacy single instance)
     */
    name?: string;
    /**
     * VCF Automation major version (8 or 9)
     */
    majorVersion?: number;
    /**
     * Organization name
     */
    orgName?: string;
    /**
     * Organization type (vm-apps or all-apps)
     */
    organizationType?: 'vm-apps' | 'all-apps';
    /**
     * Authentication configuration (legacy single instance)
     */
    authentication?: {
      /**
       * Username for API access
       */
      username: string;
      /**
       * Password for API access
       * @visibility secret
       */
      password: string;
      /**
       * Domain for authentication
       */
      domain: string;
    };
    /**
     * Multiple VCF Automation instances configuration
     */
    instances?: Array<{
      /**
       * VCF Automation base URL
       */
      baseUrl: string;
      /**
       * Instance name for identification
       */
      name?: string;
      /**
       * VCF Automation major version (8 or 9)
       */
      majorVersion?: number;
      /**
       * Organization name
       */
      orgName?: string;
      /**
       * Organization type (vm-apps or all-apps)
       */
      organizationType?: 'vm-apps' | 'all-apps';
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
        /**
         * Domain for authentication
         */
        domain?: string;
      };
    }>;
  };
}
