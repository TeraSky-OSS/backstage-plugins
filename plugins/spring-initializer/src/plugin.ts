import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { SpringInitializerForm } from './components/SpringInitializerForm/SpringInitializerForm';

export const springInitializerPlugin = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'SpringInitializer',
    component: SpringInitializerForm,
  })
);
