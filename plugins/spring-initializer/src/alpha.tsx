import {
  createFrontendPlugin,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';

/** @alpha */
export const springInitializerExtension: ExtensionDefinition =
  FormFieldBlueprint.make({
  name: 'SpringInitializer',
  params: {
    field: () =>
      import('./components/SpringInitializerField').then(m => m.springInitializerField),
  },
});

/** @alpha */
export const springInitializerPlugin: FrontendPlugin =
  createFrontendPlugin({
  pluginId: 'spring-initializer',
  extensions: [springInitializerExtension],
});

export default springInitializerPlugin;
