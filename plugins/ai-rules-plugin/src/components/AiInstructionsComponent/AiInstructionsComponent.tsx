import { useState } from 'react';
import { Box, Tab, TabList, TabPanel, Tabs } from '@backstage/ui';
import { AIRulesComponent } from '../AiRulesComponent';
import { MCPServersComponent } from '../MCPServersComponent';
import { IgnoreFilesComponent } from '../IgnoreFilesComponent';
import { AgentConfigsComponent } from '../AgentConfigsComponent';
import { AgentSkillsComponent } from '../AgentSkillsComponent';

export interface AiInstructionsComponentProps {
  title?: string;
}

export const AiInstructionsComponent = ({ title = 'AI Instructions' }: AiInstructionsComponentProps) => {
  const [selectedTab, setSelectedTab] = useState('rules');

  return (
    <Tabs selectedKey={selectedTab} onSelectionChange={key => setSelectedTab(String(key))}>
      <TabList>
        <Tab id="rules">Agent Rules</Tab>
        <Tab id="mcp">MCP Servers</Tab>
        <Tab id="ignore">Ignore Files</Tab>
        <Tab id="configs">Agent Configs</Tab>
        <Tab id="skills">Agent Skills</Tab>
      </TabList>
      <TabPanel id="rules">
        <Box mt="4">
          <AIRulesComponent title={title} />
        </Box>
      </TabPanel>
      <TabPanel id="mcp">
        <Box mt="4">
          <MCPServersComponent />
        </Box>
      </TabPanel>
      <TabPanel id="ignore">
        <Box mt="4">
          <IgnoreFilesComponent />
        </Box>
      </TabPanel>
      <TabPanel id="configs">
        <Box mt="4">
          <AgentConfigsComponent />
        </Box>
      </TabPanel>
      <TabPanel id="skills">
        <Box mt="4">
          <AgentSkillsComponent />
        </Box>
      </TabPanel>
    </Tabs>
  );
};
