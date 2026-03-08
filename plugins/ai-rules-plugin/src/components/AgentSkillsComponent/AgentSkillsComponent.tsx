import { useState } from 'react';
import {
  InfoCard,
  Progress,
  EmptyState,
  MarkdownContent,
  CodeSnippet,
} from '@backstage/core-components';
import {
  makeStyles,
  Typography,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { Theme } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import LaunchIcon from '@material-ui/icons/Launch';
import { useSkills } from '../../hooks/useSkills';
import { AgentSkill } from '../../types';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    '& .MuiAccordion-root': {
      marginBottom: theme.spacing(1),
      '&:before': { display: 'none' },
    },
  },
  statsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  statCard: {
    minWidth: '120px',
    textAlign: 'center',
  },
  sourceAccordion: {
    backgroundColor: theme.palette.background.default,
    marginBottom: theme.spacing(2),
    '& .MuiAccordionSummary-root': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  skillAccordion: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  summaryActions: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
  },
  skillContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    width: '100%',
  },
  viewToggle: {
    marginBottom: theme.spacing(1),
  },
  resourcesSection: {
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
  },
  resourceGroup: {
    marginBottom: theme.spacing(1),
    '&:last-child': { marginBottom: 0 },
  },
  resourceList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
  },
  contentViewer: {
    maxHeight: 400,
    overflow: 'auto',
    '& > *': { backgroundColor: 'transparent !important' },
  },
}));

const SOURCE_LABELS: Record<AgentSkill['source'], string> = {
  'cross-client': 'Cross-Client (.agents/skills/)',
  'claude': 'Claude Code (.claude/skills/)',
  'cursor': 'Cursor (.cursor/skills/)',
};

const constructFileUrl = (gitUrl: string, filePath: string): string => {
  const cleanGitUrl = gitUrl.replace(/\/+$/, '');
  if (cleanGitUrl.includes('github.com')) return `${cleanGitUrl}/blob/main/${filePath}`;
  if (cleanGitUrl.includes('gitlab.com')) return `${cleanGitUrl}/-/blob/main/${filePath}`;
  return `${cleanGitUrl}/blob/main/${filePath}`;
};

const SkillContentViewer = ({ content }: { content: string }) => {
  const styles = useStyles();
  const [view, setView] = useState<'rendered' | 'raw'>('rendered');
  return (
    <div>
      <ToggleButtonGroup
        size="small"
        value={view}
        exclusive
        onChange={(_e: any, v: any) => { if (v) setView(v); }}
        className={styles.viewToggle}
      >
        <ToggleButton value="rendered">Rendered</ToggleButton>
        <ToggleButton value="raw">Raw</ToggleButton>
      </ToggleButtonGroup>
      {view === 'rendered' ? (
        <div className={styles.contentViewer}>
          <MarkdownContent content={content} />
        </div>
      ) : (
        <CodeSnippet text={content} language="markdown" />
      )}
    </div>
  );
};

const ResourcesSection = ({ resources }: { resources: AgentSkill['resources'] }) => {
  const styles = useStyles();
  const hasResources =
    resources.scripts.length > 0 ||
    resources.references.length > 0 ||
    resources.assets.length > 0;

  if (!hasResources) return null;

  return (
    <div className={styles.resourcesSection}>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        Bundled Resources
      </Typography>
      {resources.scripts.length > 0 && (
        <div className={styles.resourceGroup}>
          <Typography variant="caption" color="textSecondary">Scripts</Typography>
          <div className={styles.resourceList}>
            {resources.scripts.map(f => <Chip key={f} label={f} size="small" variant="outlined" />)}
          </div>
        </div>
      )}
      {resources.references.length > 0 && (
        <div className={styles.resourceGroup}>
          <Typography variant="caption" color="textSecondary">References</Typography>
          <div className={styles.resourceList}>
            {resources.references.map(f => <Chip key={f} label={f} size="small" variant="outlined" />)}
          </div>
        </div>
      )}
      {resources.assets.length > 0 && (
        <div className={styles.resourceGroup}>
          <Typography variant="caption" color="textSecondary">Assets</Typography>
          <div className={styles.resourceList}>
            {resources.assets.map(f => <Chip key={f} label={f} size="small" variant="outlined" />)}
          </div>
        </div>
      )}
    </div>
  );
};

const SkillAccordion = ({ skill }: { skill: AgentSkill }) => {
  const styles = useStyles();
  return (
    <Accordion className={styles.skillAccordion}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.summaryRow}>
          <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
            {skill.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ flex: 1 }}>
            {skill.description}
          </Typography>
          {skill.compatibility && (
            <Chip label={skill.compatibility} size="small" variant="outlined" />
          )}
          {skill.license && (
            <Chip label={`License: ${skill.license}`} size="small" />
          )}
          {skill.metadata?.author && (
            <Chip label={`by ${skill.metadata.author}`} size="small" variant="outlined" />
          )}
          {skill.metadata?.version && (
            <Chip label={`v${skill.metadata.version}`} size="small" variant="outlined" />
          )}
          <div className={styles.summaryActions}>
            {skill.gitUrl && (
              <Tooltip title="Open SKILL.md in repository">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(skill.gitUrl!, skill.filePath), '_blank'); }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div className={styles.skillContent}>
          {skill.allowedTools && skill.allowedTools.length > 0 && (
            <div>
              <Typography variant="caption" color="textSecondary">Pre-approved tools</Typography>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {skill.allowedTools.map(t => <Chip key={t} label={t} size="small" />)}
              </div>
            </div>
          )}
          <SkillContentViewer content={skill.content} />
          <ResourcesSection resources={skill.resources} />
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

export interface AgentSkillsComponentProps {
  title?: string;
}

export const AgentSkillsComponent = ({ title = 'Agent Skills' }: AgentSkillsComponentProps) => {
  const styles = useStyles();
  const { skills, loading, error, hasGitUrl } = useSkills();

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
        <EmptyState missing="content" title="Error Loading Skills" description={error} />
      </InfoCard>
    );
  }

  if (skills.length === 0) {
    return (
      <InfoCard title={title}>
        <EmptyState
          missing="content"
          title="No Agent Skills Found"
          description="No Agent Skills (agentskills.io) were found in this repository. Skills are discovered in .agents/skills/, .claude/skills/, and .cursor/skills/."
        />
      </InfoCard>
    );
  }

  // Group by source
  const skillsBySource = skills.reduce((acc, skill) => {
    if (!acc[skill.source]) acc[skill.source] = [];
    acc[skill.source].push(skill);
    return acc;
  }, {} as Record<AgentSkill['source'], AgentSkill[]>);

  const sourceOrder: AgentSkill['source'][] = ['cross-client', 'claude', 'cursor'];

  return (
    <InfoCard title={title} className={styles.root}>
      {/* Stats */}
      <div className={styles.statsContainer}>
        <Card className={styles.statCard}>
          <CardContent>
            <Typography variant="h4">{skills.length}</Typography>
            <Typography color="textSecondary">Total Skills</Typography>
          </CardContent>
        </Card>
        {sourceOrder.map(source => {
          const sourceSkills = skillsBySource[source];
          if (!sourceSkills || sourceSkills.length === 0) return null;
          return (
            <Card key={source} className={styles.statCard}>
              <CardContent>
                <Typography variant="h4">{sourceSkills.length}</Typography>
                <Typography color="textSecondary">
                  {source === 'cross-client' ? 'Cross-Client' : source === 'claude' ? 'Claude' : 'Cursor'}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grouped by source */}
      {sourceOrder.map(source => {
        const sourceSkills = skillsBySource[source];
        if (!sourceSkills || sourceSkills.length === 0) return null;
        return (
          <Accordion key={source} defaultExpanded className={styles.sourceAccordion}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Typography variant="h6">{SOURCE_LABELS[source]}</Typography>
                <Chip label={`${sourceSkills.length} skill${sourceSkills.length !== 1 ? 's' : ''}`} size="small" color="primary" />
              </div>
            </AccordionSummary>
            <AccordionDetails style={{ flexDirection: 'column' }}>
              {sourceSkills.map(skill => (
                <SkillAccordion key={skill.filePath} skill={skill} />
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </InfoCard>
  );
};
