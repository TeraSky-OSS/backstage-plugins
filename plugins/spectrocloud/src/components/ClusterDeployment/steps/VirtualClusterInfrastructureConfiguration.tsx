import { useEffect, useState } from 'react';
import type { Key } from 'react';
import { Alert, Box, Combobox, Grid, NumberField, Text, TextField } from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { ClusterDeploymentState } from '../types';

interface ClusterGroup {
  metadata: {
    uid: string;
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    clustersConfig?: {
      endpointType?: 'Ingress' | 'LoadBalancer';
    };
  };
  status?: {
    limitConfig?: {
      cpuMilliCore?: number;
      memoryMiB?: number;
      storageGiB?: number;
    };
  };
}

interface VirtualClusterInfrastructureConfigurationProps {
  state: ClusterDeploymentState;
  onChange: (updates: Partial<ClusterDeploymentState>) => void;
}

export const VirtualClusterInfrastructureConfiguration = ({
  state,
  onChange,
}: VirtualClusterInfrastructureConfigurationProps) => {
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [clusterGroups, setClusterGroups] = useState<ClusterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchClusterGroups = async () => {
      try {
        setLoading(true);
        const result = await spectroCloudApi.getClusterGroups(state.projectUid);
        // The API returns { items: ClusterGroup[] } structure
        const groups = result.items || result || [];
        setClusterGroups(groups);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cluster groups');
      } finally {
        setLoading(false);
      }
    };

    if (state.projectUid) {
      fetchClusterGroups();
    }
  }, [spectroCloudApi, state.projectUid]);

  if (loading) {
    return (
      <Box display="flex" style={{ justifyContent: 'center', alignItems: 'center' }} minHeight="400px">
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

  const selectedGroup = clusterGroups.find(
    g => g.metadata.uid === state.cloudConfig.clusterGroupUid
  );

  // Get resource quotas from state
  const cpuCores = state.cloudConfig.cpuCores || 4;
  const memoryGiB = state.cloudConfig.memoryGiB || 8;
  const storageGiB = state.cloudConfig.storageGiB || 20;

  // Get cluster name from state
  const clusterName = state.clusterName || '';

  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" as="div">
        Virtual Cluster Configuration
      </Text>
      <Box mt="1" mb="4">
        <Text variant="body-small" color="secondary">
          Configure your virtual cluster settings
        </Text>
      </Box>

      {/* Virtual Cluster Name */}
      <Box mb="4">
        <TextField
          label="Virtual cluster name *"
          value={clusterName}
          onChange={value => onChange({ clusterName: value })}
          isRequired
          description="Enter a unique name for your virtual cluster (lowercase alphanumeric and hyphens only)"
          isInvalid={clusterName !== '' && !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(clusterName)}
        />
      </Box>

      {/* Cluster Group Selection */}
      <Box mb="4">
        <Combobox
          options={clusterGroups.map(g => ({
            id: g.metadata.uid,
            label: g.metadata.name,
            description:
              g.metadata.annotations?.['scope.name'] ||
              g.metadata.annotations?.projectName ||
              'PROJECT',
          }))}
          label="Select cluster group *"
          isRequired
          description={`${clusterGroups.length} cluster group${
            clusterGroups.length !== 1 ? 's' : ''
          } available`}
          selectedKey={state.cloudConfig.clusterGroupUid ?? null}
          onSelectionChange={(key: Key | null) => {
            if (key !== null) {
              const newValue = clusterGroups.find(g => g.metadata.uid === key);
              if (newValue) {
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    clusterGroupUid: newValue.metadata.uid,
                    clusterGroupName: newValue.metadata.name,
                    endpointType:
                      newValue.spec?.clustersConfig?.endpointType || 'LoadBalancer',
                  },
                });
              }
            }
          }}
        />
      </Box>

      {/* Quotas Section */}
      <Box mt="8">
        <Box mb="2">
          <Text variant="title-small" weight="bold" as="div">
            Resource Quotas
          </Text>
        </Box>
        <Grid.Root columns="12" gap="6">
          <Grid.Item colSpan={{ initial: '12', sm: '4' }}>
            <NumberField
              label="CPU (cores) *"
              value={cpuCores}
              onChange={value =>
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    cpuCores: value || 0,
                  },
                })
              }
              isRequired
              minValue={1}
              step={1}
              description="Number of CPU cores"
              isInvalid={cpuCores !== undefined && cpuCores <= 0}
            />
          </Grid.Item>
          <Grid.Item colSpan={{ initial: '12', sm: '4' }}>
            <NumberField
              label="Memory (GiB) *"
              value={memoryGiB}
              onChange={value =>
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    memoryGiB: value || 0,
                  },
                })
              }
              isRequired
              minValue={1}
              step={1}
              description="Memory in GiB"
              isInvalid={memoryGiB !== undefined && memoryGiB <= 0}
            />
          </Grid.Item>
          <Grid.Item colSpan={{ initial: '12', sm: '4' }}>
            <NumberField
              label="Storage (GiB) *"
              value={storageGiB}
              onChange={value =>
                onChange({
                  cloudConfig: {
                    ...state.cloudConfig,
                    storageGiB: value || 0,
                  },
                })
              }
              isRequired
              minValue={1}
              step={1}
              description="Storage in GiB"
              isInvalid={storageGiB !== undefined && storageGiB <= 0}
            />
          </Grid.Item>
        </Grid.Root>

        {selectedGroup?.status?.limitConfig && (
          <Box mt="4">
            <Alert
              status="info"
              description={
                <>
                  Cluster Group Limits: CPU:{' '}
                  {selectedGroup.status.limitConfig.cpuMilliCore
                    ? Math.floor(selectedGroup.status.limitConfig.cpuMilliCore / 1000)
                    : 'N/A'}{' '}
                  cores, Memory:{' '}
                  {selectedGroup.status.limitConfig.memoryMiB
                    ? Math.floor(selectedGroup.status.limitConfig.memoryMiB / 1024)
                    : 'N/A'}{' '}
                  GiB, Storage: {selectedGroup.status.limitConfig.storageGiB || 'N/A'} GiB
                </>
              }
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};
