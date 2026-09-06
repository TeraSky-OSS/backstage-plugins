import { createApp } from '@backstage/frontend-defaults';
import { navModule } from './modules/nav';
// import { rootRedirectModule } from './modules/rootRedirect'; // disabled in favor of the home page, see app-config.yaml `app.extensions` -> page:home
import { homeModule } from './modules/home';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { teraskyThemeLight, teraskyThemeDark } from './theme';

export default createApp({
  features: [
    createFrontendModule({
      pluginId: 'app',
      extensions: [teraskyThemeLight, teraskyThemeDark],
    }),
    homeModule,
    navModule,
  ],
});
