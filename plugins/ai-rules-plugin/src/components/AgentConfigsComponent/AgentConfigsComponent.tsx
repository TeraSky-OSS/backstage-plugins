import {
  InfoCard,
  Progress,
  EmptyState,
  CodeSnippet,
} from '@backstage/core-components';
import {
  makeStyles,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import { Theme } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LaunchIcon from '@material-ui/icons/Launch';
import { useAgentConfigs } from '../../hooks/useAgentConfigs';
import { AgentConfig } from '../../types';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    '& .MuiAccordion-root': {
      marginBottom: theme.spacing(1),
      '&:before': { display: 'none' },
    },
  },
  configAccordion: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing(1),
  },
  codeContainer: {
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    '& pre': { margin: 0 },
  },
}));

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
  const styles = useStyles();
  return (
    <Accordion className={styles.configAccordion}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.summaryRow}>
          <Typography variant="subtitle1">{config.agent}</Typography>
          <Chip label={config.filePath} size="small" variant="outlined" />
          <Chip label={LANGUAGE_LABEL[config.language]} size="small" color="primary" />
          {config.gitUrl && (
            <Tooltip title="Open file in repository">
              <IconButton
                size="small"
                style={{ marginLeft: 'auto' }}
                onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(config.gitUrl!, config.filePath), '_blank'); }}
              >
                <LaunchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div style={{ width: '100%' }}>
          <div className={styles.codeContainer}>
            <CodeSnippet text={config.content} language={config.language} showLineNumbers />
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

export interface AgentConfigsComponentProps {
  title?: string;
}

export const AgentConfigsComponent = ({ title = 'Agent Configurations' }: AgentConfigsComponentProps) => {
  const styles = useStyles();
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
    <InfoCard title={title} className={styles.root}>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
        Found {configs.length} agent configuration file{configs.length !== 1 ? 's' : ''}.
      </Typography>
      {configs.map(config => (
        <ConfigAccordion key={config.filePath} config={config} />
      ))}
    </InfoCard>
  );
};
