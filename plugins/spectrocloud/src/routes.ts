import { createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'spectrocloud',
});

export const clusterDeploymentRouteRef = createRouteRef({
  id: 'spectrocloud-cluster-deployment',
});

export const clusterViewerRouteRef = createRouteRef({
  id: 'spectrocloud-cluster-viewer',
});

export const virtualClusterViewerRouteRef = createRouteRef({
  id: 'spectrocloud-virtual-cluster-viewer',
});
