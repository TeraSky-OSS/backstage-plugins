import {
  createPlugin,
  createComponentExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';
import { rootRouteRef } from './routes';
import { spectroCloudApiRef, SpectroCloudApiClient } from './api';

export const spectroCloudPlugin = createPlugin({
  id: 'spectrocloud',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: spectroCloudApiRef,
      deps: { 
        discoveryApi: discoveryApiRef, 
        fetchApi: fetchApiRef,
        spectroCloudAuthApi: spectroCloudAuthApiRef,
      },
      factory: ({ discoveryApi, fetchApi, spectroCloudAuthApi }) =>
        new SpectroCloudApiClient({ discoveryApi, fetchApi, spectroCloudAuthApi }),
    }),
  ],
});

/**
 * Card component for SpectroCloud cluster entities
 * Shows cluster status, Kubernetes version, attached profiles, and kubeconfig download
 */
export const SpectroCloudClusterCard = spectroCloudPlugin.provide(
  createComponentExtension({
    name: 'SpectroCloudClusterCard',
    component: {
      lazy: () => import('./components/SpectroCloudClusterCard').then(m => m.SpectroCloudClusterCard),
    },
  }),
);

/**
 * Card component for SpectroCloud cluster profile entities
 * Shows profile versions, cluster counts per version, and profile metadata
 */
export const SpectroCloudClusterProfileCard = spectroCloudPlugin.provide(
  createComponentExtension({
    name: 'SpectroCloudClusterProfileCard',
    component: {
      lazy: () => import('./components/SpectroCloudClusterProfileCard').then(m => m.SpectroCloudClusterProfileCard),
    },
  }),
);

