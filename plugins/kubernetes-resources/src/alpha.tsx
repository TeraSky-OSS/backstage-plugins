import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';

const isKubernetesAvailable = (entity: Entity) => {
  return Boolean(entity.metadata.annotations?.['terasky.backstage.io/kubernetes-resource-name']);
};

/** @alpha */
export const kubernetesResourcesGraphCard = EntityCardBlueprint.make({
  name: 'kubernetes-resources.graph',
  params: {
    filter: isKubernetesAvailable,
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
    filter: isKubernetesAvailable,
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