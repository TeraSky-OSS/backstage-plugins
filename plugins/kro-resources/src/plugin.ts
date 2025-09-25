import {
  createPlugin,
  createComponentExtension,
  discoveryApiRef,
  fetchApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { kroApiRef, KroApiClient } from './api/KroApi';

export const kroResourcesPlugin = createPlugin({
  id: 'kro-resources',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: kroApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new KroApiClient(discoveryApi, fetchApi),
    }),
  ],
});

export const KroResourceTable = kroResourcesPlugin.provide(
  createComponentExtension({
    name: 'KroResourceTable',
    component: {
      lazy: () => import('./components/KroResourceTable').then(m => m.default),
    },
  }),
);

export const KroResourceGraph = kroResourcesPlugin.provide(
  createComponentExtension({
    name: 'KroResourceGraph',
    component: {
      lazy: () => import('./components/KroResourceGraph').then(m => m.default),
    },
  }),
);

export const KroOverviewCard = kroResourcesPlugin.provide(
  createComponentExtension({
    name: 'KroOverviewCard',
    component: {
      lazy: () => import('./components/KroOverviewCard').then(m => m.default),
    },
  }),
);