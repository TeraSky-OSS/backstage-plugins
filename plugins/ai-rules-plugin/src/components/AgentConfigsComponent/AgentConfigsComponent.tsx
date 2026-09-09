import {
  InfoCard,
  Progress,
  EmptyState,
  CodeSnippet,
} from '@backstage/core-components';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Box,
  ButtonIcon,
  Flex,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { RiExternalLinkLine } from '@remixicon/react';
import { useAgentConfigs } from '../../hooks/useAgentConfigs';
import { AgentConfig } from '../../types';
import styles from './AgentConfigsComponent.module.css';

const constructFileUrl = (gitUrl: string, filePath: string): string => {
  const cleanGitUrl = gitUrl.replace(/\/+$/, '');
  if (cleanGitUrl.includes('github.com')) return `${cleanGitUrl}/blob/main/${filePath}`;
  if (cleanGitUrl.includes('gitlab.com')) return `${cleanGitUrl}/-/blob/main/${filePath}`;
  return `${cleanGitUrl}/blob/main/${filePath}`;
};

const LANGUAGE_LABEL: Record<AgentConfig['language'], string> = {
  yaml: 'YAML',
  json: 'JSON',
  typescript: 'TypeScript',
};

const ConfigAccordion = ({ config }: { config: AgentConfig }) => {
  return (
    <Box className={styles.configAccordion} style={{ position: 'relative' }}>
      <Accordion>
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ flexWrap: 'wrap', paddingRight: 'var(--bui-space-8)' }}>
            <Text weight="bold">{config.agent}</Text>
            <Badge>{config.filePath}</Badge>
            <Badge>{LANGUAGE_LABEL[config.language]}</Badge>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <div className={styles.codeContainer}>
            <CodeSnippet text={config.content} language={config.language} showLineNumbers />
          </div>
        </AccordionPanel>
      </Accordion>
      {config.gitUrl && (
        <TooltipTrigger>
          <ButtonIcon
            aria-label="Open file in repository"
            icon={<RiExternalLinkLine />}
            size="small"
            variant="tertiary"
            style={{ position: 'absolute', top: 'var(--bui-space-2)', right: 'var(--bui-space-8)' }}
            onPress={() => window.open(constructFileUrl(config.gitUrl!, config.filePath), '_blank')}
          />
          <Tooltip>Open file in repository</Tooltip>
        </TooltipTrigger>
      )}
    </Box>
  );
};

export interface AgentConfigsComponentProps {
  title?: string;
}

export const AgentConfigsComponent = ({ title = 'Agent Configurations' }: AgentConfigsComponentProps) => {
  const { configs, loading, error, hasGitUrl } = useAgentConfigs();

  if (loading) return <InfoCard title={title}><Progress /></InfoCard>;

  if (!hasGitUrl) {
    return (
      <InfoCard title={title}>
        <EmptyState missing="content" title="No Git Repository" description="This component doesn't have a Git source URL configured." />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={title}>
        <EmptyState missing="content" title="Error Loading Agent Configs" description={error} />
      </InfoCard>
    );
  }

  if (configs.length === 0) {
    return (
      <InfoCard title={title}>
        <EmptyState missing="content" title="No Agent Configs Found" description="No agent configuration files were found (.aider.conf.yml, .continue/config.yaml, .cursor/settings.json, .zed/assistant.json)." />
      </InfoCard>
    );
  }

  return (
    <InfoCard title={title}>
      <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-4)' }}>
        Found {configs.length} agent configuration file{configs.length !== 1 ? 's' : ''}.
      </Text>
      {configs.map(config => (
        <ConfigAccordion key={config.filePath} config={config} />
      ))}
    </InfoCard>
  );
};
