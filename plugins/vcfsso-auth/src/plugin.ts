import {
  createFrontendPlugin,
  ApiBlueprint,
  configApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
} from '@backstage/frontend-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';
import { vcfSsoAuthApiRef } from './api';

export const vcfSsoAuthApi = ApiBlueprint.make({
  name: 'vcfsso-auth',
  params: defineParams =>
    defineParams({
      api: vcfSsoAuthApiRef,
      deps: {
        configApi: configApiRef,
        discoveryApi: discoveryApiRef,
        oauthRequestApi: oauthRequestApiRef,
      },
      factory: ({ configApi, discoveryApi, oauthRequestApi }) => {
        return OAuth2.create({
          configApi,
          discoveryApi,
          oauthRequestApi,
          provider: {
            id: 'vcfsso',
            title: 'VCF SSO',
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
      },
    }),
});

export const vcfSsoAuthPlugin = createFrontendPlugin({
  pluginId: 'auth-vcfsso',
  extensions: [vcfSsoAuthApi],
});

export default vcfSsoAuthPlugin;
