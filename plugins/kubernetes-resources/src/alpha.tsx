import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isKubernetesResourcesAvailable } from './components/isKubernetesResourcesAvailable';

/** @alpha */
export const kubernetesResourcesGraphCard = EntityContentBlueprint.make({
  name: 'kubernetes-resources.graph',
  params: {
    path: '/kubernetes-resources-graph',
    title: 'Resource Graph',
    group: 'Kubernetes',
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
    title: 'Resource Table',
    group: 'Kubernetes',
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