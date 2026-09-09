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
import { useIgnoreFiles } from '../../hooks/useIgnoreFiles';
import { IgnoreFile } from '../../types';
import styles from './IgnoreFilesComponent.module.css';

const constructFileUrl = (gitUrl: string, filePath: string): string => {
  const cleanGitUrl = gitUrl.replace(/\/+$/, '');
  if (cleanGitUrl.includes('github.com')) return `${cleanGitUrl}/blob/main/${filePath}`;
  if (cleanGitUrl.includes('gitlab.com')) return `${cleanGitUrl}/-/blob/main/${filePath}`;
  return `${cleanGitUrl}/blob/main/${filePath}`;
};

const IgnoreFileAccordion = ({ file }: { file: IgnoreFile }) => {
  const patternCount = file.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
  return (
    <Box className={styles.fileAccordion} style={{ position: 'relative' }}>
      <Accordion>
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ flexWrap: 'wrap', paddingRight: 'var(--bui-space-8)' }}>
            <Text weight="bold">{file.agent}</Text>
            <Badge>{file.filePath}</Badge>
            <Badge>{patternCount} patterns</Badge>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <div className={styles.codeContainer}>
            <CodeSnippet text={file.content} language="bash" showLineNumbers />
          </div>
        </AccordionPanel>
      </Accordion>
      {file.gitUrl && (
        <TooltipTrigger>
          <ButtonIcon
            aria-label="Open file in repository"
            icon={<RiExternalLinkLine />}
            size="small"
            variant="tertiary"
            style={{ position: 'absolute', top: 'var(--bui-space-2)', right: 'var(--bui-space-8)' }}
            onPress={() => window.open(constructFileUrl(file.gitUrl!, file.filePath), '_blank')}
          />
          <Tooltip>Open file in repository</Tooltip>
        </TooltipTrigger>
      )}
    </Box>
  );
};

export interface IgnoreFilesComponentProps {
  title?: string;
}

export const IgnoreFilesComponent = ({ title = 'Agent Ignore Files' }: IgnoreFilesComponentProps) => {
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
    <InfoCard title={title}>
      <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-4)' }}>
        Found {files.length} ignore file{files.length !== 1 ? 's' : ''} controlling which files agents skip.
      </Text>
      {files.map(file => (
        <IgnoreFileAccordion key={file.filePath} file={file} />
      ))}
    </InfoCard>
  );
};
