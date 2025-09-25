import {
  createPlugin,
  createComponentExtension,
  discoveryApiRef,
  fetchApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { CrossplaneApiClient, crossplaneApiRef } from './api/CrossplaneApi';

export const crossplaneResourcesPlugin = createPlugin({
  id: 'crossplane-resources',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: crossplaneApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new CrossplaneApiClient(discoveryApi, fetchApi),
    }),
  ],
});

// new components with v1 and v2 support
export const CrossplaneResourcesTableSelector = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneResourcesTableSelector',
    component: {
      lazy: () => import('./components/CrossplaneResourcesTableSelector').then(m => m.default),
    },
  }),
);

export const CrossplaneResourceGraphSelector = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneResourceGraphSelector',
    component: {
      lazy: () => import('./components/CrossplaneResourceGraphSelector').then(m => m.default),
    },
  }),
);

export const CrossplaneOverviewCardSelector = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneOverviewCardSelector',
    component: {
      lazy: () => import('./components/CrossplaneOverviewCardSelector').then(m => m.default),
    },
  }),
);

// Crossplane v1 specific components
export const CrossplaneV1OverviewCard = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV1OverviewCard',
    component: {
      lazy: () => import('./components/CrossplaneV1OverviewCard').then(m => m.default),
    },
  }),
);

export const CrossplaneV1ResourceGraph = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV1ResourceGraph',
    component: {
      lazy: () => import('./components/CrossplaneV1ResourceGraph').then(m => m.default),
    },
  }),
);

export const CrossplaneV1ResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV1ResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneV1ResourceTable').then(m => m.default),
    },
  }),
);

// Crossplane v2 specific components
export const CrossplaneV2OverviewCard = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2OverviewCard',
    component: {
      lazy: () => import('./components/CrossplaneV2OverviewCard').then(m => m.default),
    },
  }),
);

export const CrossplaneV2ResourceGraph = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2ResourceGraph',
    component: {
      lazy: () => import('./components/CrossplaneV2ResourceGraph').then(m => m.default),
    },
  }),
);

export const CrossplaneV2ResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2ResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneV2ResourceTable').then(m => m.default),
    },
  }),
);