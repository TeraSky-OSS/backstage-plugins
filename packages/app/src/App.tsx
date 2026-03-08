import { createApp } from '@backstage/frontend-defaults';
import { navModule } from './modules/nav';
import { rootRedirectModule } from './modules/rootRedirect';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { teraskyThemeLight, teraskyThemeDark } from './theme';

export default createApp({
  features: [
    createFrontendModule({
      pluginId: 'app',
      extensions: [teraskyThemeLight, teraskyThemeDark],
    }),
    rootRedirectModule,
    navModule,
  ],
});
