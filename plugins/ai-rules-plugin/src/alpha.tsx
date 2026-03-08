import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isAIRulesAvailable } from './components/AiRulesComponent';
import { aiRulesApiRef, AiRulesClient } from './api';

/** @alpha */
export const aiRulesPlugin = createFrontendPlugin({
  pluginId: 'ai-rules',
  extensions: [
    EntityContentBlueprint.make({
      name: 'aiRules',
      params: {
        path: '/ai-rules',
        filter: isAIRulesAvailable,
        title: 'AI Rules',
        loader: () => import('./components/AiRulesComponent/AiRulesComponent').then(m => <m.AIRulesComponent />),
      },
      disabled: true,
    }),
    EntityContentBlueprint.make({
      name: 'aiInstructions',
      params: {
        path: '/ai-instructions',
        filter: isAIRulesAvailable,
        title: 'AI Instructions',
        loader: () => import('./components/AiInstructionsComponent/AiInstructionsComponent').then(m => <m.AiInstructionsComponent />),
      },
      disabled: false,
    }),
    EntityContentBlueprint.make({
      name: 'mcpServers',
      params: {
        path: '/mcp-servers',
        filter: isAIRulesAvailable,
        title: 'MCP Servers',
        loader: () => import('./components/MCPServersComponent/MCPServersComponent').then(m => <m.MCPServersComponent />),
      },
      disabled: true,
    }),
    EntityContentBlueprint.make({
      name: 'ignoreFiles',
      params: {
        path: '/ignore-files',
        filter: isAIRulesAvailable,
        title: 'Ignore Files',
        loader: () => import('./components/IgnoreFilesComponent/IgnoreFilesComponent').then(m => <m.IgnoreFilesComponent />),
      },
      disabled: true,
    }),
    EntityContentBlueprint.make({
      name: 'agentConfigs',
      params: {
        path: '/agent-configs',
        filter: isAIRulesAvailable,
        title: 'Agent Configs',
        loader: () => import('./components/AgentConfigsComponent/AgentConfigsComponent').then(m => <m.AgentConfigsComponent />),
      },
      disabled: true,
    }),
    EntityContentBlueprint.make({
      name: 'agentSkills',
      params: {
        path: '/agent-skills',
        filter: isAIRulesAvailable,
        title: 'Agent Skills',
        loader: () => import('./components/AgentSkillsComponent/AgentSkillsComponent').then(m => <m.AgentSkillsComponent />),
      },
      disabled: true,
    }),
    ApiBlueprint.make({
      name: 'aiRulesApi',
      params: defineParams => defineParams({
        api: aiRulesApiRef,
        deps: {
          discoveryApi: discoveryApiRef,
          identityApi: identityApiRef,
        },
        factory: ({ discoveryApi, identityApi }) => new AiRulesClient({ discoveryApi, identityApi }),
      }),
      disabled: false,
    }),
  ],
});
export default aiRulesPlugin;
