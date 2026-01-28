import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  commonSignInResolvers,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { spectroCloudAuthenticator } from './authenticator';

/**
 * SpectroCloud OIDC authentication provider module for Backstage.
 *
 * This module registers the SpectroCloud provider with the auth backend,
 * using a custom authenticator that handles SpectroCloud's non-standard OAuth flow.
 *
 * @public
 */
export const authModuleSpectroCloudProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'spectrocloud-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
      },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'spectrocloud',
          factory: createOAuthProviderFactory({
            authenticator: spectroCloudAuthenticator,
            signInResolverFactories: {
              ...commonSignInResolvers,
            },
          }),
        });
      },
    });
  },
});
