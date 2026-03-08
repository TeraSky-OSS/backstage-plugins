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

export const IgnoreFilesComponent = aiRulesPlugin.provide(
  createComponentExtension({
    name: 'IgnoreFilesComponent',
    component: {
      lazy: () => import('./components/IgnoreFilesComponent/IgnoreFilesComponent').then(m => m.IgnoreFilesComponent)
        .then(Component => (props: any) => React.createElement(Component, props)),
    },
  }),
);

export const AgentConfigsComponent = aiRulesPlugin.provide(
  createComponentExtension({
    name: 'AgentConfigsComponent',
    component: {
      lazy: () => import('./components/AgentConfigsComponent/AgentConfigsComponent').then(m => m.AgentConfigsComponent)
        .then(Component => (props: any) => React.createElement(Component, props)),
    },
  }),
);

export const AgentSkillsComponent = aiRulesPlugin.provide(
  createComponentExtension({
    name: 'AgentSkillsComponent',
    component: {
      lazy: () => import('./components/AgentSkillsComponent/AgentSkillsComponent').then(m => m.AgentSkillsComponent)
        .then(Component => (props: any) => React.createElement(Component, props)),
    },
  }),
);
