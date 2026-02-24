// React import not needed for JSX in React 17+
import {
  createFrontendPlugin,
  ApiBlueprint,
  PageBlueprint,
  NavItemBlueprint,
  discoveryApiRef,
  fetchApiRef,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';
import { SiKubernetes } from "react-icons/si";
import { spectroCloudApiRef, SpectroCloudApiClient } from './api';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';
import { clusterDeploymentRouteRef, clusterViewerRouteRef, virtualClusterViewerRouteRef } from './routes';
import AddCircleIcon from '@material-ui/icons/AddCircle';

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

/**
 * Check if entity is a SpectroCloud cluster group
 */
const isSpectroCloudClusterGroup = (entity: Entity): boolean => {
  return entity.spec?.type === 'spectrocloud-cluster-group';
};

/**
 * Check if entity is a SpectroCloud virtual cluster
 */
const isSpectroCloudVirtualCluster = (entity: Entity): boolean => {
  return entity.spec?.type === 'spectrocloud-virtual-cluster';
};

/** @alpha */
export const spectroCloudApi: ExtensionDefinition = ApiBlueprint.make({
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
export const spectroCloudClusterCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'spectrocloud.cluster-overview',
  params: {
    filter: isSpectroCloudCluster,
    loader: () => import('./components/SpectroCloudClusterCard').then(m => <m.SpectroCloudClusterCard />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterProfileCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'spectrocloud.cluster-profile-overview',
  params: {
    filter: isSpectroCloudClusterProfile,
    loader: () => import('./components/SpectroCloudClusterProfileCard').then(m => <m.SpectroCloudClusterProfileCard />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterGroupCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'spectrocloud.cluster-group-overview',
  params: {
    filter: isSpectroCloudClusterGroup,
    loader: () => import('./components/SpectroCloudClusterGroupCard').then(m => <m.SpectroCloudClusterGroupCard />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudVirtualClusterCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'spectrocloud.virtual-cluster-overview',
  params: {
    filter: isSpectroCloudVirtualCluster,
    loader: () => import('./components/SpectroCloudVirtualClusterCard').then(m => <m.SpectroCloudVirtualClusterCard />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudKubernetesResourcesTab: ExtensionDefinition =
  EntityContentBlueprint.make({
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
export const spectroCloudClusterGroupSettingsTab: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'spectrocloud.cluster-group-settings',
  params: {
    filter: isSpectroCloudClusterGroup,
    path: '/cluster-group-settings',
    title: 'Settings',
    loader: () => import('./components/ClusterGroupSettings').then(m => <m.ClusterGroupSettingsTab />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterDeploymentPage: ExtensionDefinition =
  PageBlueprint.make({
  name: 'spectrocloud.cluster-deployment',
  params: {
    path: '/spectrocloud/deploy',
    routeRef: clusterDeploymentRouteRef,
    loader: () => import('./components/ClusterDeployment').then(m => <m.ClusterDeploymentPage />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterDeploymentNavItem: ExtensionDefinition =
  NavItemBlueprint.make({
  name: 'spectrocloud.deploy-cluster',
  params: {
    title: 'Deploy Cluster',
    routeRef: clusterDeploymentRouteRef,
    icon: AddCircleIcon,
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterViewerPage: ExtensionDefinition =
  PageBlueprint.make({
  name: 'spectrocloud.cluster-viewer',
  params: {
    path: '/spectrocloud/clusters',
    routeRef: clusterViewerRouteRef,
    loader: () => import('./components/ClusterViewer').then(m => <m.ClusterViewerPage />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudClusterViewerNavItem: ExtensionDefinition =
  NavItemBlueprint.make({
  name: 'spectrocloud.cluster-viewer',
  params: {
    title: 'View Clusters',
    routeRef: clusterViewerRouteRef,
    icon: SiKubernetes,
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudVirtualClusterViewerPage: ExtensionDefinition =
  PageBlueprint.make({
  name: 'spectrocloud.virtual-cluster-viewer',
  params: {
    path: '/spectrocloud/virtualclusters',
    routeRef: virtualClusterViewerRouteRef,
    loader: () => import('./components/VirtualClusterViewer').then(m => <m.VirtualClusterViewerPage />),
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudVirtualClusterViewerNavItem: ExtensionDefinition =
  NavItemBlueprint.make({
  name: 'spectrocloud.virtual-cluster-viewer',
  params: {
    title: 'View Virtual Clusters',
    routeRef: virtualClusterViewerRouteRef,
    icon: SiKubernetes,
  },
  disabled: false,
});

/** @alpha */
export const spectroCloudPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'spectrocloud',
  extensions: [
    spectroCloudApi,
    spectroCloudClusterCard,
    spectroCloudClusterProfileCard,
    spectroCloudClusterGroupCard,
    spectroCloudVirtualClusterCard,
    spectroCloudKubernetesResourcesTab,
    spectroCloudClusterGroupSettingsTab,
    spectroCloudClusterDeploymentPage,
    spectroCloudClusterDeploymentNavItem,
    spectroCloudClusterViewerPage,
    spectroCloudClusterViewerNavItem,
    spectroCloudVirtualClusterViewerPage,
    spectroCloudVirtualClusterViewerNavItem,
  ],
});

export default spectroCloudPlugin;

