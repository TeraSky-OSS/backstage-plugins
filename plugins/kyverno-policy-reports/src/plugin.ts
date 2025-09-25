import {
  createPlugin,
  createComponentExtension,
  discoveryApiRef,
  fetchApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { kyvernoApiRef, KyvernoApiClient } from './api/KyvernoApi';

export const kyvernoPolicyReportsPlugin = createPlugin({
  id: 'kyverno-policy-reports',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: kyvernoApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new KyvernoApiClient(discoveryApi, fetchApi),
    }),
  ],
});

export const KyvernoPolicyReportsTable = kyvernoPolicyReportsPlugin.provide(
  createComponentExtension({
    name: 'KyvernoPolicyReportsTable',
    component: {
      lazy: () => import('./components/KyvernoPolicyReportsTable').then(m => m.default),
    },
  }),
);

export const KyvernoOverviewCard = kyvernoPolicyReportsPlugin.provide(
  createComponentExtension({
    name: 'KyvernoOverviewCard',
    component: {
      lazy: () => import('./components/KyvernoOverviewCard').then(m => m.default),
    },
  }),
);

export const KyvernoCrossplaneOverviewCard = kyvernoPolicyReportsPlugin.provide(
  createComponentExtension({
    name: 'KyvernoCrossplaneOverviewCard',
    component: {
      lazy: () => import('./components/KyvernoCrossplaneOverviewCard').then(m => m.default),
    },
  }),
);

export const KyvernoCrossplanePolicyReportsTable = kyvernoPolicyReportsPlugin.provide(
  createComponentExtension({
    name: 'KyvernoCrossplanePolicyReportsTable',
    component: {
      lazy: () => import('./components/KyvernoCrossplanePolicyReportsTable').then(m => m.default),
    },
  }),
);