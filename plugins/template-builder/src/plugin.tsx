import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

import { rootRouteRef } from './routes';

export const page = PageBlueprint.make({
  params: {
    path: '/template-builder',
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/TemplateBuilderPage').then(m =>
        <m.TemplateBuilderPage />,
      ),
  },
});

export const templateBuilderPlugin = createFrontendPlugin({
  pluginId: 'template-builder',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  }
});
