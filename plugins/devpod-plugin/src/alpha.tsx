import {
  createFrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { isDevpodAvailable } from './components/DevpodComponent/DevpodComponent';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';

/** @alpha */
export const devpodPlugin = createFrontendPlugin({
  pluginId: 'devpod',
  extensions: [
    EntityCardBlueprint.make({
      name: 'devpod',
      params: {
        filter: isDevpodAvailable,
        loader: () => import('./components/DevpodComponent/DevpodComponent').then(m => <m.DevpodComponent />),
      },
      disabled: false
    }),
  ],
});

export default devpodPlugin;