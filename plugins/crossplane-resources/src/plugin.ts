import {
  createPlugin,
  createComponentExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const crossplaneResourcesPlugin = createPlugin({
  id: 'crossplane-resources',
  routes: {
    root: rootRouteRef,
  },
});

export const CrossplaneCompositeResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneCompositeResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneCompositeResourcesTable').then(m => m.default),
    },
  }),
);

export const CrossplaneManagedResources = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneManagedResources',
    component: {
      lazy: () => import('./components/CrossplaneManagedResources').then(m => m.default),
    },
  }),
);

export const CrossplaneClaimResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneClaimResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneClaimResourcesTable').then(m => m.default),
    },
  }),
);

export const CrossplaneAllResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneAllResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneAllResourcesTable').then(m => m.default),
    },
  }),
);

export const CrossplaneV2ResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2ResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneV2ResourcesTable').then(m => m.default),
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
export const CrossplaneResourcesTableSelector = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneResourcesTableSelector',
    component: {
      lazy: () => import('./components/CrossplaneResourcesTableSelector').then(m => m.default),
    },
  }),
);

export const CrossplaneV2OverviewCard = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2OverviewCard',
    component: {
      lazy: () => import('./components/CrossplaneV2OverviewCard').then(m => m.default),
    },
  }),
);

export const CrossplaneV2ManagedResources = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2ManagedResources',
    component: {
      lazy: () => import('./components/CrossplaneV2ManagedResources').then(m => m.default),
    },
  }),
);

export const CrossplaneV2CompositeResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2CompositeResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneV2CompositeResourcesTable').then(m => m.default),
    },
  }),
);

export const CrossplaneV2UsedResourcesTable = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2UsedResourcesTable',
    component: {
      lazy: () => import('./components/CrossplaneV2UsedResourcesTable').then(m => m.default),
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
export const CrossplaneV2ResourceGraph = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneV2ResourceGraph',
    component: {
      lazy: () => import('./components/CrossplaneV2ResourceGraph').then(m => m.default),
    },
  }),
);
export const CrossplaneResourceGraph = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneResourceGraph',
    component: {
      lazy: () => import('./components/CrossplaneResourceGraph').then(m => m.default),
    },
  }),
);
export const CrossplaneOverviewCard = crossplaneResourcesPlugin.provide(
  createComponentExtension({
    name: 'CrossplaneOverviewCard',
    component: {
      lazy: () => import('./components/CrossplaneOverviewCard').then(m => m.default),
    },
  }),
);
