import {
  createFrontendPlugin,
  PageBlueprint,
  PluginHeaderActionBlueprint,
  ApiBlueprint,
  discoveryApiRef,
  fetchApiRef,
  createRouteRef,
} from '@backstage/frontend-plugin-api';
import { RiGraduationCapLine } from '@remixicon/react';
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
    title: 'Educates Workshops',
    icon: <RiGraduationCapLine />,
    path: '/educates',
    routeRef: rootRouteRef,
    loader: () => import('./components/EducatesPage').then(m => <m.EducatesPage />),
  },
  disabled: false,
});

/** @alpha */
export const educatesHeaderActions = PluginHeaderActionBlueprint.make({
  params: {
    loader: () => import('./components/EducatesHeaderActions').then(m => <m.EducatesHeaderActions />),
  },
  disabled: false,
});

/** @alpha */
export const educatesPlugin = createFrontendPlugin({
  pluginId: 'educates',
  extensions: [educatesApi, educatesPage, educatesHeaderActions]
});

export default educatesPlugin;