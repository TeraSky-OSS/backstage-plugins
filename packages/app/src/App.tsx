import { createApp } from '@backstage/frontend-defaults';
import { navModule } from './modules/nav';
import { rootRedirectModule } from './modules/rootRedirect';
import { createFrontendModule, githubAuthApiRef, gitlabAuthApiRef, microsoftAuthApiRef, SignInPageBlueprint } from '@backstage/frontend-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { teraskyThemeLight, teraskyThemeDark } from './theme';
import { rbacPlugin, RbacPage } from '@backstage-community/plugin-rbac'
import { convertLegacyPlugin, convertLegacyPageExtension } from '@backstage/core-compat-api';
const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props =>
      (
        <SignInPage
          {...props}
          providers={[
            'guest',
            {
              id: 'github-auth-provider',
              title: 'GitHub',
              message: 'Sign in using GitHub',
              apiRef: githubAuthApiRef,
            },
            {
              id: 'microsoft-auth-provider',
              title: 'Microsoft',
              message: 'Sign in using EntraID',
              apiRef: microsoftAuthApiRef,
            },
            {
              id: 'gitlab-auth-provider',
              title: 'GitLab',
              message: 'Sign in using GitLab',
              apiRef: gitlabAuthApiRef,
            },
          ]}
        />
      ),
  },
});


const convertedRbacAdminPage = convertLegacyPageExtension(RbacPage, {
  name: 'rbac',
  path: '/rbac',
});
//const convertedRbacAPI = 
const convertedRbacPlugin = convertLegacyPlugin(rbacPlugin, {
  extensions: [convertedRbacAdminPage],
});

export default createApp({
  features: [
    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPage, teraskyThemeLight, teraskyThemeDark],
    }),
    rootRedirectModule,
    navModule,
    convertedRbacPlugin,
  ],
});
