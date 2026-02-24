import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';
import { isKubernetesAvailable } from '@backstage/plugin-kubernetes';
import { KyvernoApiClient, kyvernoApiRef } from './api/KyvernoApi';

const isNonCrossplaneButKyvernoAvailable = (entity: Entity) => {
  return Boolean(entity.spec?.type !== 'crossplane-claim' && entity.spec?.type !== 'crossplane-xr' && isKubernetesAvailable(entity))
};

const isCrossplaneAvailable = (entity: Entity) => {
  return Boolean(entity.spec?.type === 'crossplane-claim' || entity.spec?.type === 'crossplane-xr')
};

/** @alpha */
export const kyvernoOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'kyverno.overview',
  params: {
    filter: isNonCrossplaneButKyvernoAvailable,
    loader: () => import('./components/KyvernoOverviewCard').then(m => <m.default />),
  },
  disabled: false,
});

/** @alpha */
export const kyvernoCrossplaneOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'kyverno.crossplane-overview',
  params: {
    filter: isCrossplaneAvailable,
    loader: () => import('./components/KyvernoCrossplaneOverviewCard').then(m => <m.default />),
  },
  disabled: false,
});

/** @alpha */
export const kyvernoPolicyReportsContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'kyverno.reports',
  params: {
    path: '/kyverno-policy-reports',
    title: 'Kyverno Policy Reports',
    filter: isNonCrossplaneButKyvernoAvailable,
    loader: () => import('./components/KyvernoPolicyReportsTable').then(m => <m.default />),
  },
  disabled: false,
});

/** @alpha */
export const kyvernoCrossplanePolicyReportsContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'kyverno.crossplane-reports',
  params: {
    path: '/kyverno-crossplane-policy-reports',
    title: 'Kyverno Policy Reports',
    filter: isCrossplaneAvailable,
    loader: () => import('./components/KyvernoCrossplanePolicyReportsTable').then(m => <m.default />),
  },
  disabled: false,
});

/** @alpha */
export const kyvernoApi: ExtensionDefinition = ApiBlueprint.make({
  name: 'kyvernoApi',
  params: defineParams => defineParams({
    api: kyvernoApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
    },
    factory: ({ discoveryApi, fetchApi }) => new KyvernoApiClient(discoveryApi, fetchApi),
  }),
});

/** @alpha */
export const kyvernoPolicyReportsPlugin: FrontendPlugin =
  createFrontendPlugin({
  pluginId: 'kyverno-policy-reports',
  extensions: [
    kyvernoOverviewCard,
    kyvernoCrossplaneOverviewCard,
    kyvernoPolicyReportsContent,
    kyvernoCrossplanePolicyReportsContent,
    kyvernoApi,
  ],
});

export default kyvernoPolicyReportsPlugin;