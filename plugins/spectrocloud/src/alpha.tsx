import {
  createFrontendPlugin,
  ApiBlueprint,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';
import { spectroCloudApiRef, SpectroCloudApiClient } from './api';

/**
 * Check if entity is a SpectroCloud cluster
 */
const isSpectroCloudCluster = (entity: Entity): boolean => {
  return entity.spec?.type === 'spectrocloud-cluster';
};

/**
 * Check if entity is a SpectroCloud cluster profile
 */
const isSpectroCloudClusterProfile = (entity: Entity): boolean => {
  return entity.spec?.type === 'spectrocloud-cluster-profile';
};

/** @alpha */
export const spectroCloudApi = ApiBlueprint.make({
  name: 'spectroCloudApi',
  params: defineParams => defineParams({
    api: spectroCloudApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
    },
    factory: ({ discoveryApi, fetchApi }) => new SpectroCloudApiClient({ discoveryApi, fetchApi }),
  }),
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterCard = EntityCardBlueprint.make({
  name: 'spectrocloud.cluster-overview',
  params: {
    filter: isSpectroCloudCluster,
    loader: () => import('./components/SpectroCloudClusterCard').then(m => <m.SpectroCloudClusterCard />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterProfileCard = EntityCardBlueprint.make({
  name: 'spectrocloud.cluster-profile-overview',
  params: {
    filter: isSpectroCloudClusterProfile,
    loader: () => import('./components/SpectroCloudClusterProfileCard').then(m => <m.SpectroCloudClusterProfileCard />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudPlugin = createFrontendPlugin({
  pluginId: 'spectrocloud',
  extensions: [
    spectroCloudApi,
    spectroCloudClusterCard,
    spectroCloudClusterProfileCard,
  ],
});

export default spectroCloudPlugin;

