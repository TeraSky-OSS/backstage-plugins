import {
  createFrontendPlugin,
  PageBlueprint,
  NavItemBlueprint,
} from '@backstage/frontend-plugin-api';
import ExtensionIcon from '@material-ui/icons/Extension';
import { rootRouteRef } from './routes';

const frontendExtensionsExplorerPage = PageBlueprint.make({
  params: {
    path: '/frontend-extensions-explorer',
    routeRef: rootRouteRef,
    loader: () =>
      import(
        './components/FrontendExtensionsExplorerPage/FrontendExtensionsExplorerPage'
      ).then(m => <m.FrontendExtensionsExplorerPage />),
  },
});

const frontendExtensionsExplorerNavItem = NavItemBlueprint.make({
  params: {
    routeRef: rootRouteRef,
    title: 'Extensions Explorer',
    icon: ExtensionIcon,
  },
});

export const frontendExtensionsExplorerPlugin = createFrontendPlugin({
  pluginId: 'frontend-extensions-explorer',
  extensions: [frontendExtensionsExplorerPage, frontendExtensionsExplorerNavItem],
  routes: {
    root: rootRouteRef,
  },
});

export default frontendExtensionsExplorerPlugin;
