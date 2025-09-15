import { createPlugin, createComponentExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import React from 'react';

export const aiRulesPlugin = createPlugin({
  id: 'ai-rules',
  routes: {
    root: rootRouteRef,
  },
});

export const AIRulesComponent = aiRulesPlugin.provide(
  createComponentExtension({
    name: 'AIRulesComponent',
    component: {
      lazy: () => import('./components/AiRulesComponent/AiRulesComponent').then(m => m.AIRulesComponent)
        .then(Component => (props: any) => React.createElement(Component, props)),
    },
  }),
);

export const MCPServersComponent = aiRulesPlugin.provide(
  createComponentExtension({
    name: 'MCPServersComponent',
    component: {
      lazy: () => import('./components/MCPServersComponent/MCPServersComponent').then(m => m.MCPServersComponent)
        .then(Component => (props: any) => React.createElement(Component, props)),
    },
  }),
);

export const AiInstructionsComponent = aiRulesPlugin.provide(
  createComponentExtension({
    name: 'AiInstructionsComponent',
    component: {
      lazy: () => import('./components/AiInstructionsComponent/AiInstructionsComponent').then(m => m.AiInstructionsComponent)
        .then(Component => (props: any) => React.createElement(Component, props)),
    },
  }),
);