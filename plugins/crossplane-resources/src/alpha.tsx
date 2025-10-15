import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isCrossplaneAvailable } from './components/isCrossplaneAvailable';
import { CrossplaneApiClient, crossplaneApiRef } from './api/CrossplaneApi';
/** @alpha */
export const crossplaneResourcesPlugin = createFrontendPlugin({
  pluginId: 'crossplane-resources',
  extensions: [
    // Main tabs
    EntityCardBlueprint.make({
      name: 'crossplane.overview',
      params: {
        filter: isCrossplaneAvailable,
        loader: () => import('./components/CrossplaneOverviewCardSelector').then(m => <m.default />),
      },
      disabled: false,
    }),
    EntityContentBlueprint.make({
      name: 'crossplane.table',
      params: {
        filter: isCrossplaneAvailable,
        path: '/crossplane-resources-table',
        title: 'Resources Table',
        loader: () => import('./components/CrossplaneResourcesTableSelector').then(m => <m.default />),
      },
      disabled: false,
    }),
    EntityContentBlueprint.make({
      name: 'crossplane.graph',
      params: {
        filter: isCrossplaneAvailable,
        path: '/crossplane-resources-graph',
        title: 'Resources Graph',
        loader: () => import('./components/CrossplaneResourceGraphSelector').then(m => <m.default />),
      },
      disabled: false,
    }),
    ApiBlueprint.make({
      name: 'crossplaneApi',
      params: defineParams => defineParams({
        api: crossplaneApiRef,
        deps: {
          discoveryApi: discoveryApiRef,
          fetchApi: fetchApiRef,
        },
        factory: ({ discoveryApi, fetchApi }) => new CrossplaneApiClient(discoveryApi, fetchApi),
      }),
    }),
  ],
});

export default crossplaneResourcesPlugin;