import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';

/** @alpha */
export const springInitializerExtension = FormFieldBlueprint.make({
  name: 'SpringInitializer',
  params: {
    field: () =>
      import('./components/SpringInitializerField').then(m => m.springInitializerField),
  },
});

/** @alpha */
export const springInitializerPlugin = createFrontendPlugin({
  pluginId: 'spring-initializer',
  extensions: [springInitializerExtension],
});

export default springInitializerPlugin;
