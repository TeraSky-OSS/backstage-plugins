export interface Config {
  auth?: {
    /**
     * Session configuration for auth providers
     */
    session?: {
      /**
       * Secret used for session encryption
       * @visibility secret
       */
      secret?: string;
    };
    providers?: {
      /**
       * SpectroCloud OIDC authentication provider configuration
       */
      spectrocloud?: {
        [key: string]: {
          /**
           * The SpectroCloud authorization URL
           * Example: https://console.spectrocloud.com/v1/auth/org/{orgName}/oidc/authorize
           * @visibility frontend
           */
          authorizationUrl: string;

          /**
           * OAuth client ID
           * @visibility secret
           */
          clientId: string;

          /**
           * OAuth client secret (required for OIDC token exchange)
           * @visibility secret
           */
          clientSecret?: string;


          /**
           * Optional: OAuth scopes to request
           * @visibility frontend
           */
          scope?: string;

          /**
           * Optional: OIDC prompt parameter
           * @visibility frontend
           */
          prompt?: string;

          /**
           * Sign-in resolver configuration
           */
          signIn?: {
            resolvers?: Array<{
              resolver: string;
            }>;
          };
        };
      };
    };
  };
}
