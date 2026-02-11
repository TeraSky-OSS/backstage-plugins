import {
  createFrontendPlugin,
  ApiBlueprint,
  configApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
} from '@backstage/frontend-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';
import { spectroCloudAuthApiRef, SpectroCloudAuthApi } from './api';

/**
 * SpectroCloud authentication API extension using ApiBlueprint.
 *
 * This creates the OAuth2 client for SpectroCloud OIDC authentication
 * with custom API token retrieval via the refreshToken field.
 *
 * Since OAuth2 doesn't expose custom session fields, we store the HS256
 * API token in the refreshToken field and retrieve it from there.
 *
 * @alpha
 */
export const spectroCloudAuthApi = ApiBlueprint.make({
  name: 'spectrocloud-auth',
  params: defineParams =>
    defineParams({
      api: spectroCloudAuthApiRef,
      deps: {
        configApi: configApiRef,
        discoveryApi: discoveryApiRef,
        oauthRequestApi: oauthRequestApiRef,
      },
      factory: ({ configApi, discoveryApi, oauthRequestApi }) => {
        const oauth2Instance = OAuth2.create({
          configApi,
          discoveryApi,
          oauthRequestApi,
          provider: {
            id: 'spectrocloud',
            title: 'SpectroCloud',
            icon: () => null,
          },
          environment: configApi.getOptionalString('auth.environment'),
          defaultScopes: ['openid', 'profile', 'email'],
          popupOptions: {
            size: {
              fullscreen: true,
            },
          },
        });

        // Wrap the OAuth2 instance to add custom method
        const wrappedInstance = Object.assign(oauth2Instance, {
          async getSpectroCloudApiToken() {
            try {
              // Helper to decode JWT header
              const decodeHeader = (token: string) => {
                try {
                  const headerB64 = token.split('.')[0];
                  const base64 = headerB64.replace(/-/g, '+').replace(/_/g, '/');
                  return JSON.parse(atob(base64));
                } catch {
                  return null;
                }
              };

              // Helper to get cookie value
              const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) {
                  const cookieValue = parts.pop()?.split(';').shift();
                  return cookieValue ? decodeURIComponent(cookieValue) : undefined;
                }
                return undefined;
              };

              // 1. Check cookies first (most reliable - set by Spectro Cloud directly)
              const cookieToken = getCookie('Authorization') || getCookie('spectrocloud-api-token');
              if (cookieToken && cookieToken.startsWith('eyJ')) {
                const cookieHeader = decodeHeader(cookieToken);
                if (cookieHeader?.alg === 'HS256') {
                  return cookieToken;
                }
              }

              // 2. Try OAuth2 access token
              const apiToken = await oauth2Instance.getAccessToken(['openid', 'profile', 'email']);
              
              if (apiToken) {
                const header = decodeHeader(apiToken);
                
                if (header?.alg === 'HS256') {
                  return apiToken;
                }
              }

              // 3. Try OAuth2 ID token
              const idToken = await oauth2Instance.getIdToken();
              if (idToken) {
                const idHeader = decodeHeader(idToken);
                
                if (idHeader?.alg === 'HS256') {
                  return idToken;
                }
              }
              
              // Return whatever we have as fallback (will fail but at least shows what we got)
              return apiToken || idToken;
            } catch (error) {
              return undefined;
            }
          },
        }) as SpectroCloudAuthApi;

        return wrappedInstance;
      },
    }),
});

/**
 * SpectroCloud authentication frontend plugin.
 *
 * Provides the spectroCloudAuthApiRef for use in sign-in pages and
 * components that need to access SpectroCloud authentication.
 *
 * @alpha
 */
export const spectroCloudAuthPlugin = createFrontendPlugin({
  pluginId: 'auth-spectrocloud',
  extensions: [spectroCloudAuthApi],
});

export default spectroCloudAuthPlugin;
