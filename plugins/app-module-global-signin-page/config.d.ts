export interface Config {
  /**
   * Configuration for the global sign-in page
   * @visibility frontend
   */
  signinPage?: {
    /**
     * Enable guest provider for sign-in
     * @visibility frontend
     */
    enableGuestProvider?: boolean;

    /**
     * Configuration for individual auth providers
     * @visibility frontend
     */
    providers?: {
      /**
       * GitHub authentication provider
       * @visibility frontend
       */
      github?: {
        /**
         * Enable GitHub provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for GitHub provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for GitHub provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * GitLab authentication provider
       * @visibility frontend
       */
      gitlab?: {
        /**
         * Enable GitLab provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for GitLab provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for GitLab provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * Microsoft authentication provider
       * @visibility frontend
       */
      microsoft?: {
        /**
         * Enable Microsoft provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for Microsoft provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for Microsoft provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * Google authentication provider
       * @visibility frontend
       */
      google?: {
        /**
         * Enable Google provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for Google provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for Google provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * Okta authentication provider
       * @visibility frontend
       */
      okta?: {
        /**
         * Enable Okta provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for Okta provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for Okta provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * OneLogin authentication provider
       * @visibility frontend
       */
      onelogin?: {
        /**
         * Enable OneLogin provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for OneLogin provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for OneLogin provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * OpenShift authentication provider
       * @visibility frontend
       */
      openshift?: {
        /**
         * Enable OpenShift provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for OpenShift provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for OpenShift provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * Atlassian authentication provider
       * @visibility frontend
       */
      atlassian?: {
        /**
         * Enable Atlassian provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for Atlassian provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for Atlassian provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * Bitbucket authentication provider
       * @visibility frontend
       */
      bitbucket?: {
        /**
         * Enable Bitbucket provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for Bitbucket provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for Bitbucket provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * Bitbucket Server authentication provider
       * @visibility frontend
       */
      bitbucketServer?: {
        /**
         * Enable Bitbucket Server provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for Bitbucket Server provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for Bitbucket Server provider
         * @visibility frontend
         */
        message?: string;
      };

      /**
       * VMware Cloud authentication provider
       * @visibility frontend
       */
      vmwareCloud?: {
        /**
         * Enable VMware Cloud provider
         * @visibility frontend
         */
        enabled?: boolean;
        /**
         * Custom title for VMware Cloud provider
         * @visibility frontend
         */
        title?: string;
        /**
         * Custom message for VMware Cloud provider
         * @visibility frontend
         */
        message?: string;
      };
    };
  };
}

