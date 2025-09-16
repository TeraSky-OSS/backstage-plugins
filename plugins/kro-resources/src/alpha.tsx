import {
  createFrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isKroAvailable } from './components/isKroAvailable';
/** @alpha */
export const kroResourcesPlugin = createFrontendPlugin({
  pluginId: 'kro-resources',
  extensions: [
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