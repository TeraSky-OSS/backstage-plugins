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
import { useIgnoreFiles } from '../../hooks/useIgnoreFiles';
import { IgnoreFile } from '../../types';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    '& .MuiAccordion-root': {
      marginBottom: theme.spacing(1),
      '&:before': { display: 'none' },
    },
  },
  fileAccordion: {
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

const IgnoreFileAccordion = ({ file }: { file: IgnoreFile }) => {
  const styles = useStyles();
  return (
    <Accordion className={styles.fileAccordion}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.summaryRow}>
          <Typography variant="subtitle1">{file.agent}</Typography>
          <Chip label={file.filePath} size="small" variant="outlined" />
          <Chip label={`${file.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length} patterns`} size="small" color="primary" />
          {file.gitUrl && (
            <Tooltip title="Open file in repository">
              <IconButton
                size="small"
                style={{ marginLeft: 'auto' }}
                onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(file.gitUrl!, file.filePath), '_blank'); }}
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
            <CodeSnippet text={file.content} language="bash" showLineNumbers />
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

export interface IgnoreFilesComponentProps {
  title?: string;
}

export const IgnoreFilesComponent = ({ title = 'Agent Ignore Files' }: IgnoreFilesComponentProps) => {
  const styles = useStyles();
  const { files, loading, error, hasGitUrl } = useIgnoreFiles();

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
        <EmptyState missing="content" title="Error Loading Ignore Files" description={error} />
      </InfoCard>
    );
  }

  if (files.length === 0) {
    return (
      <InfoCard title={title}>
        <EmptyState missing="content" title="No Ignore Files Found" description="No agent ignore files (.cursorignore, .aiderignore, .rooignore, .geminiignore, .copilotignore) were found in this repository." />
      </InfoCard>
    );
  }

  return (
    <InfoCard title={title} className={styles.root}>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
        Found {files.length} ignore file{files.length !== 1 ? 's' : ''} controlling which files agents skip.
      </Typography>
      {files.map(file => (
        <IgnoreFileAccordion key={file.filePath} file={file} />
      ))}
    </InfoCard>
  );
};
