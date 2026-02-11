import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  commonSignInResolvers,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { spectroCloudAuthenticator } from './authenticator';
import { getSessionTokenByEmail } from './tokenCache';

/**
 * SpectroCloud OIDC authentication provider module for Backstage.
 *
 * This module registers the SpectroCloud provider with the auth backend,
 * using a custom authenticator that handles SpectroCloud's non-standard OAuth flow.
 *
 * It also registers an HTTP route to expose the HS256 session token to the
 * spectrocloud-backend plugin via cookies.
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
        httpRouter: coreServices.httpRouter,
        auth: coreServices.auth,
        logger: coreServices.logger,
      },
      async init({ providers, httpRouter, auth, logger }) {
        providers.registerProvider({
          providerId: 'spectrocloud',
          factory: createOAuthProviderFactory({
            authenticator: spectroCloudAuthenticator,
            signInResolverFactories: {
              ...commonSignInResolvers,
            },
          }),
        });

        // Add HTTP route to expose HS256 token as a cookie
        httpRouter.use(async (req, res, next) => {
          // Only intercept the auth callback success path
          if (req.path.includes('/api/auth/spectrocloud/') && req.path.includes('/handler/frame') && req.method === 'GET') {
            try {
              // Get user identity from the request (after auth completes)
              const credentials = await auth.getOwnServiceCredentials();
              const token = await auth.getPluginRequestToken({
                onBehalfOf: credentials,
                targetPluginId: 'spectrocloud',
              });
              
              // Decode to get email
              const decoded = JSON.parse(Buffer.from(token.token.split('.')[1], 'base64').toString());
              const userEmail = decoded.sub || decoded.email;
              
              if (userEmail) {
                const hs256Token = getSessionTokenByEmail(userEmail);
                if (hs256Token) {
                  // Set cookie with HS256 token
                  res.cookie('spectrocloud-api-token', hs256Token, {
                    httpOnly: false,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 3600000, // 1 hour
                    path: '/',
                  });
                  logger.info(`[SpectroCloud Auth Module] Set HS256 token cookie for user: ${userEmail}`);
                }
              }
            } catch (error) {
              logger.warn('[SpectroCloud Auth Module] Could not set token cookie', error instanceof Error ? error : new Error(String(error)));
            }
          }
          next();
        });
      },
    });
  },
});
