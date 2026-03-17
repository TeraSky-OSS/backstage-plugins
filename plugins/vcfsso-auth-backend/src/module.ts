import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  commonSignInResolvers,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import {
  oidcAuthenticator,
  type OidcAuthResult,
} from '@backstage/plugin-auth-backend-module-oidc-provider';
import type { OAuthAuthenticatorResult } from '@backstage/plugin-auth-node';

export const authModuleVcfSsoProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'vcfsso-provider',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'vcfsso',
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
            signInResolverFactories: { ...commonSignInResolvers },
            profileTransform: async (
              result: OAuthAuthenticatorResult<OidcAuthResult>,
            ) => {
              const userinfo = result.fullProfile.userinfo;

              // VCF SSO uses the non-standard `acct` claim for the email address
              // and `user_name` for the short username. The standard `email` claim
              // is not populated.
              const acct =
                typeof userinfo['acct'] === 'string'
                  ? userinfo['acct']
                  : undefined;
              const userName =
                typeof userinfo['user_name'] === 'string'
                  ? userinfo['user_name']
                  : undefined;

              const email = acct ?? userinfo.email;
              const displayName = userinfo.name ?? acct ?? userName;

              return {
                profile: {
                  email,
                  picture: userinfo.picture,
                  displayName,
                },
              };
            },
          }),
        });
      },
    });
  },
});
