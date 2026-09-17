import { useState } from 'react';
import {
  InfoCard,
  Progress,
  EmptyState,
  MarkdownContent,
  CodeSnippet,
} from '@backstage/core-components';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Box,
  ButtonIcon,
  Card,
  CardBody,
  Text,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { RiExternalLinkLine } from '@remixicon/react';
import { useSkills } from '../../hooks/useSkills';
import { AgentSkill } from '../../types';
import styles from './AgentSkillsComponent.module.css';

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
  const [view, setView] = useState<'rendered' | 'raw'>('rendered');
  return (
    <div>
      <ToggleButtonGroup
        className={styles.viewToggle}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[view]}
        onSelectionChange={keys => {
          const [v] = Array.from(keys);
          if (v) setView(v as 'rendered' | 'raw');
        }}
      >
        <ToggleButton id="rendered" size="small">Rendered</ToggleButton>
        <ToggleButton id="raw" size="small">Raw</ToggleButton>
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
  const hasResources =
    resources.scripts.length > 0 ||
    resources.references.length > 0 ||
    resources.assets.length > 0;

  if (!hasResources) return null;

  return (
    <div className={styles.resourcesSection}>
      <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        Bundled Resources
      </Text>
      {resources.scripts.length > 0 && (
        <div className={styles.resourceGroup}>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>Scripts</Text>
          <div className={styles.resourceList}>
            {resources.scripts.map(f => <Badge key={f}>{f}</Badge>)}
          </div>
        </div>
      )}
      {resources.references.length > 0 && (
        <div className={styles.resourceGroup}>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>References</Text>
          <div className={styles.resourceList}>
            {resources.references.map(f => <Badge key={f}>{f}</Badge>)}
          </div>
        </div>
      )}
      {resources.assets.length > 0 && (
        <div className={styles.resourceGroup}>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>Assets</Text>
          <div className={styles.resourceList}>
            {resources.assets.map(f => <Badge key={f}>{f}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
};

const SkillAccordion = ({ skill }: { skill: AgentSkill }) => {
  return (
    <Box className={styles.skillAccordion} style={{ position: 'relative' }}>
      <Accordion>
        <AccordionTrigger>
          <div className={styles.summaryRow}>
            <Text weight="bold">{skill.name}</Text>
            <Text style={{ color: 'var(--bui-fg-secondary)', flex: 1 }}>
              {skill.description}
            </Text>
            {skill.compatibility && <Badge>{skill.compatibility}</Badge>}
            {skill.license && <Badge>{`License: ${skill.license}`}</Badge>}
            {skill.metadata?.author && <Badge>{`by ${skill.metadata.author}`}</Badge>}
            {skill.metadata?.version && <Badge>{`v${skill.metadata.version}`}</Badge>}
          </div>
        </AccordionTrigger>
        <AccordionPanel>
          <div className={styles.skillContent}>
            {skill.allowedTools && skill.allowedTools.length > 0 && (
              <div>
                <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>Pre-approved tools</Text>
                <div className={styles.resourceList}>
                  {skill.allowedTools.map(t => <Badge key={t}>{t}</Badge>)}
                </div>
              </div>
            )}
            <SkillContentViewer content={skill.content} />
            <ResourcesSection resources={skill.resources} />
          </div>
        </AccordionPanel>
      </Accordion>
      {skill.gitUrl && (
        <TooltipTrigger>
          <ButtonIcon
            aria-label="Open SKILL.md in repository"
            icon={<RiExternalLinkLine />}
            size="small"
            variant="tertiary"
            style={{ position: 'absolute', top: 'var(--bui-space-2)', right: 'var(--bui-space-8)' }}
            onPress={() => window.open(constructFileUrl(skill.gitUrl!, skill.filePath), '_blank')}
          />
          <Tooltip>Open SKILL.md in repository</Tooltip>
        </TooltipTrigger>
      )}
    </Box>
  );
};

export interface AgentSkillsComponentProps {
  title?: string;
}

export const AgentSkillsComponent = ({ title = 'Agent Skills' }: AgentSkillsComponentProps) => {
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
    <InfoCard title={title}>
      {/* Stats */}
      <div className={styles.statsContainer}>
        <Card className={styles.statCard}>
          <CardBody>
            <Text variant="title-large" weight="bold" style={{ display: 'block' }}>{skills.length}</Text>
            <Text style={{ color: 'var(--bui-fg-secondary)' }}>Total Skills</Text>
          </CardBody>
        </Card>
        {sourceOrder.map(source => {
          const sourceSkills = skillsBySource[source];
          if (!sourceSkills || sourceSkills.length === 0) return null;
          const sourceLabel = source === 'claude' ? 'Claude' : 'Cursor';
          return (
            <Card key={source} className={styles.statCard}>
              <CardBody>
                <Text variant="title-large" weight="bold" style={{ display: 'block' }}>{sourceSkills.length}</Text>
                <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                  {source === 'cross-client' ? 'Cross-Client' : sourceLabel}
                </Text>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Grouped by source */}
      {sourceOrder.map(source => {
        const sourceSkills = skillsBySource[source];
        if (!sourceSkills || sourceSkills.length === 0) return null;
        return (
          <Box key={source} className={styles.sourceAccordion}>
            <Accordion defaultExpanded>
              <AccordionTrigger>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bui-space-4)' }}>
                  <Text variant="title-small" weight="bold">{SOURCE_LABELS[source]}</Text>
                  <Badge>{`${sourceSkills.length} skill${sourceSkills.length !== 1 ? 's' : ''}`}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionPanel>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {sourceSkills.map(skill => (
                    <SkillAccordion key={skill.filePath} skill={skill} />
                  ))}
                </div>
              </AccordionPanel>
            </Accordion>
          </Box>
        );
      })}
    </InfoCard>
  );
};
