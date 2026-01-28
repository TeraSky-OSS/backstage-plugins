import {
  createFrontendPlugin,
  ApiBlueprint,
  configApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
} from '@backstage/frontend-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';
import { spectroCloudAuthApiRef } from './api';

/**
 * SpectroCloud authentication API extension using ApiBlueprint.
 *
 * This creates the OAuth2 client for SpectroCloud OIDC authentication.
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
      factory: ({ configApi, discoveryApi, oauthRequestApi }) =>
        OAuth2.create({
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
        }),
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
