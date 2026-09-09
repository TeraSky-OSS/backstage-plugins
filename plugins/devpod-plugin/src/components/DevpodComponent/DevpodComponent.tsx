import { useDevpod } from '../../hooks/useDevpod';
import { CopyTextButton, InfoCard } from '@backstage/core-components';
import { VisuallyHidden } from '../VisuallyHidden';
import { ButtonLink, Flex, Select, TextField } from '@backstage/ui';
import { DevpodIDE } from '../../types';
import { Entity } from '@backstage/catalog-model';

export const isDevpodAvailable = (entity: Entity): boolean => {
  const sourceAnnotation = entity.metadata?.annotations?.['backstage.io/source-location'] || '';
  return sourceAnnotation.startsWith('url:');
};

export const DevpodComponent = () => {
  const { hasGitUrl, devpodUrl, selectedIde, setSelectedIde, componentName } = useDevpod();

  const getDevpodCommand = () => {
    // Extract git URL from devpod URL format
    const hashParts = devpodUrl.split('#');
    const encodedGitUrl = hashParts[1]?.split('&')[0] || '';
    const gitUrl = decodeURIComponent(encodedGitUrl);

    // Generate workspace name using component name and random suffix
    const workspaceName = `${componentName}-${Math.random().toString(36).substring(2, 6)}`;

    return `devpod up --source git:${gitUrl} --ide ${selectedIde.toLowerCase()} ${workspaceName}`;
  };

  return (
    <InfoCard title="Remote Development">
      {hasGitUrl ? (
        <Flex direction="column" gap="3" align="start">
          <Select
            label="IDE"
            selectedKey={selectedIde}
            onSelectionChange={key => setSelectedIde(key as DevpodIDE)}
            options={Object.entries(DevpodIDE).map(([key, value]) => ({
              id: value,
              label: key.toLowerCase().replace('_', ' '),
            }))}
          />
          <p>Your component can be opened in Devpod!</p>
          <ButtonLink href={devpodUrl} target="_blank" rel="noopener noreferrer">
            Open With DevPod
            <VisuallyHidden> (opens in Devpod)</VisuallyHidden>
          </ButtonLink>
          <Flex align="end" gap="2" style={{ width: '100%' }}>
            <TextField
              label="Command"
              value={getDevpodCommand()}
              isReadOnly
              style={{ width: '100%' }}
            />
            <CopyTextButton text={getDevpodCommand()} aria-label="Copy command to clipboard" />
          </Flex>
        </Flex>
      ) : (
        <p>No Git source URL found for this component</p>
      )}
    </InfoCard>
  );
};
