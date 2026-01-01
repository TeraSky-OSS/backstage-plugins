import { createApp } from '@backstage/frontend-defaults';
import { navModule } from './modules/nav';
import { rootRedirectModule } from './modules/rootRedirect';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { teraskyThemeLight, teraskyThemeDark } from './theme';
import { rbacPlugin, RbacPage } from '@backstage-community/plugin-rbac'
import { convertLegacyPlugin, convertLegacyPageExtension } from '@backstage/core-compat-api';


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
      extensions: [teraskyThemeLight, teraskyThemeDark],
    }),
    rootRedirectModule,
    navModule,
    convertedRbacPlugin,
  ],
});
