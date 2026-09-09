import { useEffect, useState } from 'react';
import type { Key } from 'react';
import { Alert, Box, Combobox, Text } from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { SpectroCloudProject } from '../../../api/SpectroCloudApi';

interface ProjectSelectionProps {
  selectedProjectUid?: string;
  onSelect: (projectUid: string, projectName: string) => void;
}

export const ProjectSelection = ({
  selectedProjectUid,
  onSelect,
}: ProjectSelectionProps) => {
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [projects, setProjects] = useState<SpectroCloudProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const result = await spectroCloudApi.getProjects();
        // Sort projects alphabetically
        const sortedProjects = result.sort((a, b) =>
          a.metadata.name.localeCompare(b.metadata.name)
        );
        setProjects(sortedProjects);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [spectroCloudApi]);

  if (loading) {
    return (
      <Box display="flex" style={{ justifyContent: 'center', alignItems: 'center' }} minHeight="200px">
        <Progress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="4">
        <Alert status="danger" description={error} />
      </Box>
    );
  }

  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Select Project
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Choose the project where you want to deploy the cluster
        </Text>
      </Box>

      <Combobox
        options={projects.map(p => ({
          id: p.metadata.uid,
          label: p.metadata.name,
          description: p.spec?.description,
        }))}
        label="Project *"
        isRequired
        description={`${projects.length} project${projects.length !== 1 ? 's' : ''} available`}
        selectedKey={selectedProjectUid ?? null}
        onSelectionChange={(key: Key | null) => {
          if (key !== null) {
            const project = projects.find(p => p.metadata.uid === key);
            if (project) {
              onSelect(project.metadata.uid, project.metadata.name);
            }
          }
        }}
      />
    </Box>
  );
};
