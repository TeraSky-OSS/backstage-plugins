// React import not needed for JSX in React 17+
import {
  createFrontendPlugin,
  ApiBlueprint,
  PageBlueprint,
  NavItemBlueprint,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';
import CloudQueueIcon from '@material-ui/icons/CloudQueue';
import { spectroCloudApiRef, SpectroCloudApiClient } from './api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';
import { clusterDeploymentRouteRef, clusterViewerRouteRef } from './routes';

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
  params: defineParams =>
    defineParams({
      api: spectroCloudApiRef,
      deps: { 
        discoveryApi: discoveryApiRef, 
        fetchApi: fetchApiRef,
        spectroCloudAuthApi: spectroCloudAuthApiRef,
      },
      factory: ({ discoveryApi, fetchApi, spectroCloudAuthApi }) =>
        new SpectroCloudApiClient({ discoveryApi, fetchApi, spectroCloudAuthApi }),
    }),
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
export const spectroCloudKubernetesResourcesTab = EntityContentBlueprint.make({
  name: 'spectrocloud.kubernetes-resources',
  params: {
    filter: isSpectroCloudCluster,
    path: '/kubernetes-resources',
    title: 'Kubernetes Resources',
    loader: () => import('./components/KubernetesResources').then(m => <m.KubernetesResourcesPage />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterDeploymentPage = PageBlueprint.make({
  name: 'spectrocloud.cluster-deployment',
  params: {
    path: '/spectrocloud/deploy',
    routeRef: clusterDeploymentRouteRef,
    loader: () => import('./components/ClusterDeployment').then(m => <m.ClusterDeploymentPage />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterDeploymentNavItem = NavItemBlueprint.make({
  name: 'spectrocloud.deploy-cluster',
  params: {
    title: 'Deploy Cluster',
    routeRef: clusterDeploymentRouteRef,
    icon: CloudQueueIcon,
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterViewerPage = PageBlueprint.make({
  name: 'spectrocloud.cluster-viewer',
  params: {
    path: '/spectrocloud/clusters',
    routeRef: clusterViewerRouteRef,
    loader: () => import('./components/ClusterViewer').then(m => <m.ClusterViewerPage />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterViewerNavItem = NavItemBlueprint.make({
  name: 'spectrocloud.cluster-viewer',
  params: {
    title: 'View Clusters',
    routeRef: clusterViewerRouteRef,
    icon: CloudQueueIcon,
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
    spectroCloudKubernetesResourcesTab,
    spectroCloudClusterDeploymentPage,
    spectroCloudClusterDeploymentNavItem,
    spectroCloudClusterViewerPage,
    spectroCloudClusterViewerNavItem,
  ],
});

export default spectroCloudPlugin;

