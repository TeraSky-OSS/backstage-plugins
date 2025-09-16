import {
  createPlugin,
  createComponentExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const kroResourcesPlugin = createPlugin({
  id: 'kro-resources',
  routes: {
    root: rootRouteRef,
  },
});

// new components with v1 and v2 support
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
