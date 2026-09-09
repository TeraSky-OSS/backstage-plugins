import { useState, useEffect, useCallback } from 'react';
import { useEntity, useRelatedEntities, EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import {
  InfoCard,
  StatusOK,
  StatusError,
  StatusWarning,
  StatusPending,
  Progress,
} from '@backstage/core-components';
import { Alert, Badge, Box, Button, Flex, Grid, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiStackLine, RiRamLine, RiSpeedLine, RiDownloadCloud2Line } from '@remixicon/react';
import { saveAs } from 'file-saver';
import { spectroCloudApiRef } from '../api';
import {
  useCanDownloadKubeconfig,
} from './PermissionGuards';
import styles from './SpectroCloudVirtualClusterCard.module.css';

const getStatusComponent = (state: string) => {
  switch (state?.toLowerCase()) {
    case 'running':
    case 'healthy':
      return <StatusOK />;
    case 'error':
    case 'failed':
      return <StatusError />;
    case 'warning':
    case 'degraded':
      return <StatusWarning />;
    case 'pending':
    case 'provisioning':
      return <StatusPending />;
    default:
      return <StatusWarning />;
  }
};

export const SpectroCloudVirtualClusterCard = () => {
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);
  const spectroCloudApi = useApi(spectroCloudApiRef);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [downloading, setDownloading] = useState(false);
  const [clusterDetails, setClusterDetails] = useState<any>(null);

  const { allowed: canDownload } = useCanDownloadKubeconfig();

  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const annotations = entity.metadata.annotations || {};
  const clusterId = annotations[`${annotationPrefix}/cluster-id`];
  const scope = annotations[`${annotationPrefix}/scope`] || 'tenant';
  const projectId = annotations[`${annotationPrefix}/project-id`];
  const projectName = annotations[`${annotationPrefix}/project-name`];
  const state = annotations[`${annotationPrefix}/state`] || 'Unknown';
  const instanceName = annotations[`${annotationPrefix}/instance`];
  const hostClusterId = annotations[`${annotationPrefix}/host-cluster-id`];
  const clusterGroupId = annotations[`${annotationPrefix}/cluster-group-id`];

  // Get related entities (host cluster, cluster group, profiles) - MUST be before any conditional returns
  const { entities: dependsOnEntities } = useRelatedEntities(entity, {
    type: 'dependsOn',
    kind: 'resource',
  });

  // Find the system entity for the project - MUST be before any conditional returns
  const { entities: systemEntities } = useRelatedEntities(entity, {
    type: 'partOf',
    kind: 'system',
  });

  const hostCluster = dependsOnEntities?.find((e: Entity) =>
    e.metadata.annotations?.[`${annotationPrefix}/cluster-id`] === hostClusterId
  );

  const clusterGroup = dependsOnEntities?.find((e: Entity) =>
    e.spec?.type === 'spectrocloud-cluster-group' &&
    e.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`] === clusterGroupId
  );

  const profiles = dependsOnEntities?.filter((e: Entity) =>
    e.spec?.type === 'spectrocloud-cluster-profile'
  ) || [];

  const projectSystem = systemEntities?.[0];

  // Fetch cluster details for metrics
  useEffect(() => {
    const fetchClusterDetails = async () => {
      if (!clusterId) return;

      setLoading(true);
      setError(undefined);

      try {
        const details = await spectroCloudApi.getVirtualClusterDetails(
          clusterId,
          projectId,
          instanceName
        );
        setClusterDetails(details);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cluster details');
      } finally {
        setLoading(false);
      }
    };

    fetchClusterDetails();
  }, [clusterId, projectId, instanceName, spectroCloudApi]);

  const handleDownloadKubeconfig = useCallback(async () => {
    if (!clusterId) return;

    setDownloading(true);
    try {
      const kubeconfig = await spectroCloudApi.getVirtualClusterKubeconfig(
        clusterId,
        projectId,
        instanceName,
        true
      );

      const blob = new Blob([kubeconfig], { type: 'application/x-yaml' });
      saveAs(blob, `${entity.metadata.name}-kubeconfig.yaml`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download kubeconfig');
    } finally {
      setDownloading(false);
    }
  }, [clusterId, projectId, instanceName, spectroCloudApi, entity.metadata.name]);

  // Extract metrics
  const cpuMetrics = clusterDetails?.status?.metrics?.cpu;
  const memoryMetrics = clusterDetails?.status?.metrics?.memory;

  const formatCpu = (value: number | undefined) => value ? `${(value / 1000).toFixed(2)} cores` : 'N/A';
  const formatMemory = (value: number | undefined) => value ? `${(value / (1024 * 1024)).toFixed(2)} GiB` : 'N/A';

  // Calculate usage as percentage of LIMIT (not total)
  const cpuUsagePercent = cpuMetrics?.limit && cpuMetrics?.usage
    ? (cpuMetrics.usage / cpuMetrics.limit) * 100
    : 0;
  const memoryUsagePercent = memoryMetrics?.limit && memoryMetrics?.usage
    ? (memoryMetrics.usage / memoryMetrics.limit) * 100
    : 0;

  if (loading) {
    return (
      <InfoCard title="Virtual Cluster Overview">
        <Progress />
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Virtual Cluster Overview">
      {error && (
        <Box mb="4">
          <Alert status="danger" description={error} />
        </Box>
      )}

      <Grid.Root columns="12" gap="4">
        {/* Basic Info Column */}
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Status
            </Text>
            <Flex align="center" gap="2">
              {getStatusComponent(state)}
              <Text variant="body-small">{state}</Text>
            </Flex>
          </Box>

          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Type
            </Text>
            <Flex gap="2">
              <Badge className={styles.accentBadge}>Virtual Cluster</Badge>
              <Badge>Nested</Badge>
            </Flex>
          </Box>

          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Scope
            </Text>
            <Badge className={scope === 'tenant' ? undefined : styles.accentBadge}>{scope}</Badge>
          </Box>

          {scope === 'project' && projectSystem && (
            <Box mb="2">
              <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
                Project
              </Text>
              <EntityRefLink
                entityRef={projectSystem}
                title={projectName || projectSystem.metadata.title || projectSystem.metadata.name}
                className={styles.entityLink}
              />
            </Box>
          )}

          <hr className={styles.divider} />

          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Host Cluster
            </Text>
            {hostCluster ? (
              <EntityRefLink
                entityRef={hostCluster}
                title={hostCluster.metadata.title || hostCluster.metadata.name}
                className={styles.entityLink}
              />
            ) : (
              <Text variant="body-small" color="secondary">
                Not found in catalog
              </Text>
            )}
          </Box>

          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Cluster Group
            </Text>
            {clusterGroup ? (
              <EntityRefLink
                entityRef={clusterGroup}
                title={clusterGroup.metadata.title || clusterGroup.metadata.name}
                className={styles.entityLink}
              />
            ) : (
              <Text variant="body-small" color="secondary">
                Not found in catalog
              </Text>
            )}
          </Box>

          {canDownload && (
            <Box mt="4">
              <Button
                variant="primary"
                iconStart={<RiDownloadCloud2Line />}
                onPress={handleDownloadKubeconfig}
                isDisabled={downloading}
                isPending={downloading}
                style={{ width: '100%' }}
              >
                {downloading ? 'Downloading...' : 'Download Kubeconfig'}
              </Button>
            </Box>
          )}
        </Grid.Item>

        {/* Metrics and Profiles Column */}
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          {/* Resource Metrics */}
          <Box mb="4">
            <Text variant="title-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
              Resource Metrics
            </Text>

            {/* CPU Metrics */}
            <Box mb="4">
              <Flex align="center" gap="2" mb="1">
                <RiSpeedLine size={16} />
                <Text variant="body-small" weight="bold" color="secondary">
                  CPU
                </Text>
              </Flex>
              <Grid.Root columns="12" gap="2">
                <Grid.Item colSpan="4">
                  <Text variant="body-x-small" color="secondary" style={{ display: 'block' }}>
                    Request
                  </Text>
                  <Text variant="body-small">{formatCpu(cpuMetrics?.request)}</Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-x-small" color="secondary" style={{ display: 'block' }}>
                    Limit
                  </Text>
                  <Text variant="body-small">{formatCpu(cpuMetrics?.limit)}</Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-x-small" color="secondary" style={{ display: 'block' }}>
                    Usage
                  </Text>
                  <Text variant="body-small">{formatCpu(cpuMetrics?.usage)}</Text>
                </Grid.Item>
              </Grid.Root>
              {cpuUsagePercent > 0 && (
                <TooltipTrigger>
                  <Progress
                    variant="determinate"
                    value={Math.min(cpuUsagePercent, 100)}
                    className={styles.progressBar}
                    color={cpuUsagePercent > 80 ? 'secondary' : 'primary'}
                  />
                  <Tooltip>
                    {cpuUsagePercent > 100
                      ? `Exceeding limit by ${(cpuUsagePercent - 100).toFixed(1)}%`
                      : `${cpuUsagePercent.toFixed(1)}% of limit`}
                  </Tooltip>
                </TooltipTrigger>
              )}
              {cpuUsagePercent > 100 && (
                <Text variant="body-x-small" color="danger" style={{ display: 'block', marginTop: 'var(--bui-space-1)' }}>
                  ⚠️ Exceeding limit by {(cpuUsagePercent - 100).toFixed(1)}%
                </Text>
              )}
            </Box>

            {/* Memory Metrics */}
            <Box>
              <Flex align="center" gap="2" mb="1">
                <RiRamLine size={16} />
                <Text variant="body-small" weight="bold" color="secondary">
                  Memory
                </Text>
              </Flex>
              <Grid.Root columns="12" gap="2">
                <Grid.Item colSpan="4">
                  <Text variant="body-x-small" color="secondary" style={{ display: 'block' }}>
                    Request
                  </Text>
                  <Text variant="body-small">{formatMemory(memoryMetrics?.request)}</Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-x-small" color="secondary" style={{ display: 'block' }}>
                    Limit
                  </Text>
                  <Text variant="body-small">{formatMemory(memoryMetrics?.limit)}</Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-x-small" color="secondary" style={{ display: 'block' }}>
                    Usage
                  </Text>
                  <Text variant="body-small">{formatMemory(memoryMetrics?.usage)}</Text>
                </Grid.Item>
              </Grid.Root>
              {memoryUsagePercent > 0 && (
                <TooltipTrigger>
                  <Progress
                    variant="determinate"
                    value={Math.min(memoryUsagePercent, 100)}
                    className={styles.progressBar}
                    color={memoryUsagePercent > 80 ? 'secondary' : 'primary'}
                  />
                  <Tooltip>
                    {memoryUsagePercent > 100
                      ? `Exceeding limit by ${(memoryUsagePercent - 100).toFixed(1)}%`
                      : `${memoryUsagePercent.toFixed(1)}% of limit`}
                  </Tooltip>
                </TooltipTrigger>
              )}
              {memoryUsagePercent > 100 && (
                <Text variant="body-x-small" color="danger" style={{ display: 'block', marginTop: 'var(--bui-space-1)' }}>
                  ⚠️ Exceeding limit by {(memoryUsagePercent - 100).toFixed(1)}%
                </Text>
              )}
            </Box>
          </Box>

          <hr className={styles.divider} />

          {/* Cluster Profiles */}
          {profiles.length > 0 && (
            <Box mt="2">
              <Flex align="center" gap="2" mb="1">
                <RiStackLine size={16} />
                <Text variant="body-small" weight="bold" color="secondary">
                  Cluster Profiles ({profiles.length})
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                {profiles.map((profile: Entity) => (
                  <Flex key={profile.metadata.uid} align="center" gap="2">
                    <RiStackLine size={16} style={{ color: 'var(--bui-accent-fg)' }} />
                    <EntityRefLink
                      entityRef={profile}
                      title={profile.metadata.title || profile.metadata.name}
                      className={styles.entityLink}
                    />
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}
        </Grid.Item>
      </Grid.Root>
    </InfoCard>
  );
};
