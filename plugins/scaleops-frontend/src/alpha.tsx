import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';

const isScaleopsAvailable = (entity: Entity) => {
  return Boolean(entity.metadata.annotations?.['backstage.io/kubernetes-label-selector']);
};

/** @alpha */
export const scaleopsCard = EntityCardBlueprint.make({
  name: 'scaleops.overview',
  params: {
    filter: isScaleopsAvailable,
    loader: () => import('./components/ScaleopsCard').then(m => <m.ScaleopsCard />),
  },
  disabled: false,
});

/** @alpha */
export const scaleopsContent = EntityContentBlueprint.make({
  name: 'scaleops.dashboard',
  params: {
    path: '/scaleops',
    title: 'ScaleOps Dashboard',
    filter: isScaleopsAvailable,
    loader: () => import('./components/ScaleOpsDashboard').then(m => <m.ScaleOpsDashboard />),
  },
  disabled: false,
});

/** @alpha */
export const scaleopsPlugin = createFrontendPlugin({
  pluginId: 'scaleops',
  extensions: [scaleopsCard, scaleopsContent],
});

