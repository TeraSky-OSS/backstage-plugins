export interface Config {
  auth?: {
    providers?: {
      /**
       * VCF SSO OIDC authentication provider configuration.
       * @visibility frontend
       */
      vcfsso?: {
        [authEnv: string]: {
          /**
           * The OAuth2 client ID registered in VCF SSO.
           */
          clientId: string;
          /**
           * The OAuth2 client secret registered in VCF SSO.
           * @visibility secret
           */
          clientSecret: string;
          /**
           * The OIDC issuer/metadata URL for VCF SSO.
           * Typically the issuer root URL; openid-client appends
           * /.well-known/openid-configuration automatically.
           * Example: https://vcf-host.example.com/acs/t/CUSTOMER/
           */
          metadataUrl: string;
          /**
           * Optional override for the OAuth2 callback URL.
           */
          callbackUrl?: string;
          /**
           * Additional scopes to request beyond openid, profile, email.
           */
          additionalScopes?: string | string[];
          /**
           * The prompt parameter to pass to the authorization endpoint.
           */
          prompt?: string;
          signIn?: {
            resolvers: Array<
              | {
                  resolver: 'emailLocalPartMatchingUserEntityName';
                  allowedDomains?: string[];
                  dangerouslyAllowSignInWithoutUserInCatalog?: boolean;
                }
              | {
                  resolver: 'emailMatchingUserEntityProfileEmail';
                  dangerouslyAllowSignInWithoutUserInCatalog?: boolean;
                }
              | {
                  resolver: 'preferredUsernameMatchingUserEntityName';
                  dangerouslyAllowSignInWithoutUserInCatalog?: boolean;
                }
            >;
          };
        };
      };
    };
  };
}
