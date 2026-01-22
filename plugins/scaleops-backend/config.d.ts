export interface Config {
  scaleops?: {
    /**
     * ScaleOps base URL
     * @visibility backend
     */
    baseUrl: string;
    /**
     * Whether to include dashboard links in MCP action outputs
     * @visibility backend
     */
    linkToDashboard?: boolean;
    /**
     * ScaleOps authentication configuration
     * @visibility backend
     */
    authentication?: {
      /**
       * Whether authentication is enabled
       * @visibility backend
       */
      enabled?: boolean;
      /**
       * Authentication type (internal or ldap)
       * @visibility backend
       */
      type?: string;
      /**
       * Username for authentication
       * @visibility backend
       */
      user?: string;
      /**
       * Password for authentication
       * @visibility backend
       */
      password?: string;
    };
  };
}

