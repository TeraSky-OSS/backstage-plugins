import {
  createFrontendPlugin,
  PageBlueprint,
  NavItemBlueprint,
  ApiBlueprint,
  discoveryApiRef,
  fetchApiRef,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import BuildIcon from '@material-ui/icons/Build';
import { rootRouteRef, editTemplateRouteRef } from './routes';
import { templateBuilderApiRef, DefaultTemplateBuilderApi } from './api';
import './index.css'; // Global styles for Monaco widgets - MUST load first!

export const templateBuilderApi: ExtensionDefinition = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: templateBuilderApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        catalogApi: catalogApiRef,
      },
      factory: ({ discoveryApi, fetchApi, catalogApi }) =>
        new DefaultTemplateBuilderApi({ discoveryApi, fetchApi, catalogApi }),
    }),
});

export const templateBuilderPage: ExtensionDefinition = PageBlueprint.make({
  name: 'template-builder-page',
  params: {
    path: '/template-builder',
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/TemplateBuilderPage').then(m => (
        <m.TemplateBuilderPage />
      )),
  },
});

export const templateBuilderEditPage: ExtensionDefinition =
  PageBlueprint.make({
  name: 'template-builder-edit-page',
  params: {
    path: '/template-builder/edit/:namespace/:kind/:name',
    routeRef: editTemplateRouteRef,
    loader: () =>
      import('./components/TemplateBuilderPage').then(m => (
        <m.TemplateBuilderPage />
      )),
  },
});

export const templateBuilderNavItem: ExtensionDefinition =
  NavItemBlueprint.make({
  name: 'template-builder-nav',
  params: {
    title: 'Template Builder',
    routeRef: rootRouteRef,
    icon: BuildIcon,
  },
});

export const templateEditorEntityCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'template-editor',
  params: {
    filter: 'kind:template',
    loader: () =>
      import('./components/TemplateEditorCard').then(m => <m.TemplateEditorCard />),
  },
});

export const templateBuilderPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'template-builder',
  extensions: [
    templateBuilderApi,
    templateBuilderPage,
    templateBuilderEditPage,
    templateBuilderNavItem,
    templateEditorEntityCard,
  ],
  routes: {
    root: rootRouteRef,
    editTemplate: editTemplateRouteRef,
  },
});

export default templateBuilderPlugin;
