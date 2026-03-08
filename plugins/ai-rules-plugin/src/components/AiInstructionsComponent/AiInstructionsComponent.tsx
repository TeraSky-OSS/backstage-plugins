import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Tabs, Tab, Box } from '@material-ui/core';
import { AIRulesComponent } from '../AiRulesComponent';
import { MCPServersComponent } from '../MCPServersComponent';
import { IgnoreFilesComponent } from '../IgnoreFilesComponent';
import { AgentConfigsComponent } from '../AgentConfigsComponent';
import { AgentSkillsComponent } from '../AgentSkillsComponent';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-instructions-tabpanel-${index}`}
      aria-labelledby={`ai-instructions-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `ai-instructions-tab-${index}`,
    'aria-controls': `ai-instructions-tabpanel-${index}`,
  };
}

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  },
  tabPanel: {
    padding: 0,
    marginTop: theme.spacing(2),
  },
}));

export interface AiInstructionsComponentProps {
  title?: string;
}

export const AiInstructionsComponent = ({ title = 'AI Instructions' }: AiInstructionsComponentProps) => {
  const styles = useStyles();
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className={styles.root}>
      <Tabs
        value={value}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Agent Rules" {...a11yProps(0)} />
        <Tab label="MCP Servers" {...a11yProps(1)} />
        <Tab label="Ignore Files" {...a11yProps(2)} />
        <Tab label="Agent Configs" {...a11yProps(3)} />
        <Tab label="Agent Skills" {...a11yProps(4)} />
      </Tabs>
      <TabPanel value={value} index={0}>
        <Box className={styles.tabPanel}>
          <AIRulesComponent title={title} />
        </Box>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box className={styles.tabPanel}>
          <MCPServersComponent />
        </Box>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Box className={styles.tabPanel}>
          <IgnoreFilesComponent />
        </Box>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Box className={styles.tabPanel}>
          <AgentConfigsComponent />
        </Box>
      </TabPanel>
      <TabPanel value={value} index={4}>
        <Box className={styles.tabPanel}>
          <AgentSkillsComponent />
        </Box>
      </TabPanel>
    </div>
  );
};
