import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isKroAvailable } from './components/isKroAvailable';
import { KroApiClient, kroApiRef } from './api/KroApi';

/** @alpha */
export const kroResourcesPlugin = createFrontendPlugin({
  pluginId: 'kro-resources',
  extensions: [
    // API
    ApiBlueprint.make({
      name: 'kroResourcesApi',
      params: defineParams => defineParams({
        api: kroApiRef,
        deps: {
          discoveryApi: discoveryApiRef,
          fetchApi: fetchApiRef,
        },
        factory: ({ discoveryApi, fetchApi }) => new KroApiClient(discoveryApi, fetchApi),
      }),
      disabled: false,
    }),
    // Main tabs
    EntityCardBlueprint.make({
      name: 'kro.overview',
      params: {
        filter: isKroAvailable,
        loader: () => import('./components/KroOverviewCard').then(m => <m.default />),
      },
      disabled: false,
    }),
    EntityContentBlueprint.make({
      name: 'kro.table',
      params: {
        filter: isKroAvailable,
        path: '/kro-resources-table',
        title: 'Resources Table',
        loader: () => import('./components/KroResourceTable').then(m => <m.default />),
      },
      disabled: false,
    }),
    EntityContentBlueprint.make({
      name: 'kro.graph',
      params: {
        filter: isKroAvailable,
        path: '/kro-resources-graph',
        title: 'Resources Graph',
        loader: () => import('./components/KroResourceGraph').then(m => <m.default />),
      },
      disabled: false,
    }),
  ],
});

export default kroResourcesPlugin;