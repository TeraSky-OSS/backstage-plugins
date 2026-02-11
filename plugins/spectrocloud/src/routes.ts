import { createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'spectrocloud',
});

export const clusterDeploymentRouteRef = createRouteRef({
  id: 'spectrocloud-cluster-deployment',
});
