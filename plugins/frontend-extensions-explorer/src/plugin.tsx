import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { rootRouteRef } from './routes';
import ExtensionIcon from '@material-ui/icons/Extension';
const frontendExtensionsExplorerPage = PageBlueprint.make({
  params: {
    title: 'Extensions Explorer',
    icon: <ExtensionIcon />,
    path: '/frontend-extensions-explorer',
    routeRef: rootRouteRef,
    loader: () =>
      import(
        './components/FrontendExtensionsExplorerPage/FrontendExtensionsExplorerPage'
      ).then(m => <m.FrontendExtensionsExplorerPage />),
  },
});


export const frontendExtensionsExplorerPlugin = createFrontendPlugin({
  pluginId: 'frontend-extensions-explorer',
  extensions: [frontendExtensionsExplorerPage],
  routes: {
    root: rootRouteRef,
  },
});

export default frontendExtensionsExplorerPlugin;
