import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
  discoveryApiRef,
  fetchApiRef,
  createRouteRef,
} from '@backstage/frontend-plugin-api';
import { EducatesClient, educatesApiRef } from './api/EducatesClient';

const rootRouteRef = createRouteRef();

/** @alpha */
export const educatesApi = ApiBlueprint.make({
  name: 'educatesApi',
  params: defineParams => defineParams({
    api: educatesApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
    },
    factory: ({ discoveryApi, fetchApi }) => new EducatesClient({ discoveryApi, fetchApi }),
  }),
  disabled: false,
});

/** @alpha */
export const educatesPage = PageBlueprint.make({
  params: {
    path: '/educates',
    routeRef: rootRouteRef,
    loader: () => import('./components/EducatesPage').then(m => <m.EducatesPage />),
  },
  disabled: false,
});


/** @alpha */
export const educatesPlugin = createFrontendPlugin({
  pluginId: 'educates',
  extensions: [educatesApi, educatesPage]
});

export default educatesPlugin;