import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isKubernetesResourcesAvailable } from './components/isKubernetesResourcesAvailable';

/** @alpha */
export const kubernetesResourcesGraphCard = EntityCardBlueprint.make({
  name: 'kubernetes-resources.graph',
  params: {
    filter: isKubernetesResourcesAvailable,
    loader: () => import('./components/KubernetesResourceGraph').then(m => <m.default />),
  },
  disabled: false,
});

/** @alpha */
export const kubernetesResourcesContent = EntityContentBlueprint.make({
  name: 'kubernetes-resources.content',
  params: {
    path: '/kubernetes-resources',
    title: 'Kubernetes Resources',
    filter: isKubernetesResourcesAvailable,
    loader: () => import('./components/KubernetesResourcesPage').then(m => <m.default />),
  },
  disabled: false,
});

/** @alpha */
export const kubernetesResourcesPlugin = createFrontendPlugin({
  pluginId: 'kubernetes-resources',
  extensions: [kubernetesResourcesGraphCard, kubernetesResourcesContent],
});

export default kubernetesResourcesPlugin;