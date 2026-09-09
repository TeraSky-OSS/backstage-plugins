import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Page,
  Content,
  Progress,
  Link,
  Table,
  TableColumn,
  StatusOK,
  StatusError,
  StatusWarning,
  StatusPending,
} from '@backstage/core-components';
import { useApi, configApiRef, useRouteRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { clusterDeploymentRouteRef } from '../../routes';
import {
  Alert,
  Badge,
  Box,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Flex,
  Grid,
  Select,
  Text,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import {
  RiAddCircleFill,
  RiDownloadCloud2Line,
  RiLayoutGridLine,
  RiListUnordered,
  RiRefreshLine,
  RiSparkling2Fill,
} from '@remixicon/react';
import { spectroCloudApiRef } from '../../api';
import { saveAs } from 'file-saver';
import styles from './VirtualClusterViewerPage.module.css';

interface VirtualClusterRow {
  entity: Entity;
  uid: string;
  clusterUid?: string;
  title: string;
  project: string;
  projectSystem?: Entity;
  status: string;
  cpuQuota: string;
  memoryQuota: string;
  hostClusterName: string;
  hostClusterEntity?: Entity;
  clusterGroupName: string;
  clusterGroupEntity?: Entity;
  hasUpdates: boolean;
}

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

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Flex justify="between" align="center" className={styles.infoRow}>
    <Text weight="bold" color="secondary">
      {label}
    </Text>
    {children}
  </Flex>
);

const UpdatesAvailableBadgeIcon = () => (
  <TooltipTrigger>
    <RiSparkling2Fill size={18} style={{ color: 'var(--bui-fg-warning)' }} />
    <Tooltip>Profile updates available</Tooltip>
  </TooltipTrigger>
);

const VirtualClusterCard = ({
  row,
  isDownloading,
  onCardClick,
  onDownload,
}: {
  row: VirtualClusterRow;
  isDownloading: boolean;
  onCardClick: () => void;
  onDownload: () => void;
}) => {
  const { entity } = row;
  const namespace = entity.metadata.namespace || 'default';

  return (
    <Card className={styles.card}>
      <div
        className={styles.cardClickArea}
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onCardClick();
        }}
      >
        <CardHeader>
          <Flex justify="between" align="start">
            <Text variant="title-small" weight="bold">
              {row.title}
            </Text>
            {row.hasUpdates && <UpdatesAvailableBadgeIcon />}
          </Flex>
        </CardHeader>
        <CardBody className={styles.cardBody}>
          <InfoRow label="Project:">
            {row.projectSystem ? (
              <Link
                to={`/catalog/${row.projectSystem.metadata.namespace || 'default'}/system/${row.projectSystem.metadata.name}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {row.project}
              </Link>
            ) : (
              <Text>{row.project || 'N/A'}</Text>
            )}
          </InfoRow>

          <InfoRow label="Status:">
            <Flex align="center" gap="1">
              {getStatusComponent(row.status)}
              <Text>{row.status}</Text>
            </Flex>
          </InfoRow>

          <InfoRow label="CPU Quota:">
            <Text>{row.cpuQuota}</Text>
          </InfoRow>

          <InfoRow label="Memory Quota:">
            <Text>{row.memoryQuota}</Text>
          </InfoRow>

          <InfoRow label="Host Cluster:">
            {row.hostClusterEntity ? (
              <Link
                to={`/catalog/${row.hostClusterEntity.metadata.namespace || 'default'}/resource/${row.hostClusterEntity.metadata.name}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {row.hostClusterName}
              </Link>
            ) : (
              <Text truncate>{row.hostClusterName}</Text>
            )}
          </InfoRow>

          <InfoRow label="Cluster Group:">
            {row.clusterGroupEntity ? (
              <Link
                to={`/catalog/${row.clusterGroupEntity.metadata.namespace || 'default'}/resource/${row.clusterGroupEntity.metadata.name}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {row.clusterGroupName}
              </Link>
            ) : (
              <Text truncate>{row.clusterGroupName}</Text>
            )}
          </InfoRow>

          <Flex gap="1" style={{ marginTop: 'var(--bui-space-2)' }}>
            <Badge>Virtual Cluster</Badge>
            <Badge>Nested</Badge>
          </Flex>
        </CardBody>
      </div>
      <CardFooter>
        <Flex justify="between" align="center">
          <Link to={`/catalog/${namespace}/resource/${entity.metadata.name}/kubernetes-resources`}>
            View Details
          </Link>
          <Button
            size="small"
            variant="secondary"
            iconStart={<RiDownloadCloud2Line />}
            isPending={isDownloading}
            onPress={onDownload}
          >
            {isDownloading ? 'Downloading...' : 'Kubeconfig'}
          </Button>
        </Flex>
      </CardFooter>
    </Card>
  );
};

const VirtualClusterTable = ({
  rows,
  downloadingCluster,
  onDownload,
}: {
  rows: VirtualClusterRow[];
  downloadingCluster?: string;
  onDownload: (entity: Entity) => void;
}) => {
  const columns: TableColumn<VirtualClusterRow>[] = [
    {
      title: 'Virtual Cluster Name',
      field: 'title',
      render: row => (
        <Flex align="center" gap="2">
          <Link
            to={`/catalog/${row.entity.metadata.namespace || 'default'}/resource/${row.entity.metadata.name}/kubernetes-resources`}
          >
            {row.title}
          </Link>
          {row.hasUpdates && <UpdatesAvailableBadgeIcon />}
        </Flex>
      ),
    },
    {
      title: 'Project',
      field: 'project',
      render: row =>
        row.projectSystem ? (
          <Link
            to={`/catalog/${row.projectSystem.metadata.namespace || 'default'}/system/${row.projectSystem.metadata.name}`}
          >
            {row.project}
          </Link>
        ) : (
          row.project || 'N/A'
        ),
    },
    {
      title: 'Status',
      field: 'status',
      render: row => (
        <Flex align="center" gap="1">
          {getStatusComponent(row.status)}
          <Text>{row.status}</Text>
        </Flex>
      ),
    },
    { title: 'CPU Quota', field: 'cpuQuota' },
    { title: 'Memory Quota', field: 'memoryQuota' },
    {
      title: 'Host Cluster',
      field: 'hostClusterName',
      render: row =>
        row.hostClusterEntity ? (
          <Link
            to={`/catalog/${row.hostClusterEntity.metadata.namespace || 'default'}/resource/${row.hostClusterEntity.metadata.name}`}
          >
            {row.hostClusterName}
          </Link>
        ) : (
          row.hostClusterName
        ),
    },
    {
      title: 'Cluster Group',
      field: 'clusterGroupName',
      render: row =>
        row.clusterGroupEntity ? (
          <Link
            to={`/catalog/${row.clusterGroupEntity.metadata.namespace || 'default'}/resource/${row.clusterGroupEntity.metadata.name}`}
          >
            {row.clusterGroupName}
          </Link>
        ) : (
          row.clusterGroupName
        ),
    },
    {
      title: 'Actions',
      sorting: false,
      render: row => (
        <Button
          size="small"
          variant="secondary"
          iconStart={<RiDownloadCloud2Line />}
          isPending={downloadingCluster === row.clusterUid}
          onPress={() => onDownload(row.entity)}
        >
          {downloadingCluster === row.clusterUid ? 'Downloading...' : 'Kubeconfig'}
        </Button>
      ),
    },
  ];

  return (
    <Table
      options={{ search: false, paging: false }}
      columns={columns}
      data={rows}
    />
  );
};

export const VirtualClusterViewerPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const configApi = useApi(configApiRef);
  const clusterDeploymentRoute = useRouteRef(clusterDeploymentRouteRef);

  const [virtualClusters, setVirtualClusters] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [downloadingCluster, setDownloadingCluster] = useState<string>();
  const [virtualClustersWithUpdates, setVirtualClustersWithUpdates] = useState<Set<string>>(new Set());
  const [hostClusterNames, setHostClusterNames] = useState<Map<string, string>>(new Map());
  const [clusterGroupNames, setClusterGroupNames] = useState<Map<string, string>>(new Map());
  const [hostClusterEntities, setHostClusterEntities] = useState<Map<string, Entity>>(new Map());
  const [clusterGroupEntities, setClusterGroupEntities] = useState<Map<string, Entity>>(new Map());
  const [projectSystemEntities, setProjectSystemEntities] = useState<Map<string, Entity>>(new Map());

  // Get annotation prefix from config
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const fetchVirtualClusters = async () => {
    try {
      setLoading(true);
      setError(undefined);

      // Get virtual clusters from SpectroCloud API that the user has access to based on OIDC token
      const spectroCloudVirtualClusters = await spectroCloudApi.getAllVirtualClusters();

      const accessibleVirtualClusterUids = new Set(
        spectroCloudVirtualClusters.map(vc => vc.metadata.uid)
      );

      // Get all catalog entities
      const { items } = await catalogApi.getEntities({
        filter: {
          kind: 'Resource',
          'spec.type': 'spectrocloud-virtual-cluster',
        },
      });

      // Filter catalog entities to only show virtual clusters the user has access to
      // and deduplicate by cluster UID (in case same cluster is ingested by multiple instances)
      const virtualClusterMap = new Map<string, Entity>();
      items.forEach(entity => {
        const clusterUid = entity.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        if (clusterUid && accessibleVirtualClusterUids.has(clusterUid)) {
          // Keep the entity with the most complete data (prefer one with project name over project UID)
          if (!virtualClusterMap.has(clusterUid)) {
            virtualClusterMap.set(clusterUid, entity);
          } else {
            const existing = virtualClusterMap.get(clusterUid)!;
            const existingProjectName = existing.metadata.annotations?.[`${annotationPrefix}/project-name`];
            const newProjectName = entity.metadata.annotations?.[`${annotationPrefix}/project-name`];
            // Prefer the one with actual project name (not a UID)
            if (existingProjectName?.length || 0 > 24 && newProjectName && newProjectName.length < 24) {
              virtualClusterMap.set(clusterUid, entity);
            }
          }
        }
      });

      const dedupedVirtualClusters = Array.from(virtualClusterMap.values());
      setVirtualClusters(dedupedVirtualClusters);

      // Fetch host cluster and cluster group names, and project systems
      const hostClusterIds = new Set<string>();
      const clusterGroupIds = new Set<string>();
      const projectNames = new Set<string>();

      dedupedVirtualClusters.forEach(vc => {
        const hostClusterId = vc.metadata.annotations?.[`${annotationPrefix}/host-cluster-id`];
        const clusterGroupId = vc.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`];
        const projectName = vc.metadata.annotations?.[`${annotationPrefix}/project-name`];
        if (hostClusterId) hostClusterIds.add(hostClusterId);
        if (clusterGroupId) clusterGroupIds.add(clusterGroupId);
        if (projectName) projectNames.add(projectName);
      });

      // Fetch host clusters from catalog
      const hostClusterNamesMap = new Map<string, string>();
      const hostClusterEntitiesMap = new Map<string, Entity>();
      if (hostClusterIds.size > 0) {
        const { items: hostClusters } = await catalogApi.getEntities({
          filter: {
            kind: 'Resource',
            'spec.type': 'spectrocloud-cluster',
          },
        });

        hostClusters.forEach(cluster => {
          const clusterId = cluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
          if (clusterId && hostClusterIds.has(clusterId)) {
            hostClusterNamesMap.set(clusterId, cluster.metadata.title || cluster.metadata.name);
            hostClusterEntitiesMap.set(clusterId, cluster);
          }
        });
      }
      setHostClusterNames(hostClusterNamesMap);
      setHostClusterEntities(hostClusterEntitiesMap);

      // Fetch cluster groups from catalog
      const clusterGroupNamesMap = new Map<string, string>();
      const clusterGroupEntitiesMap = new Map<string, Entity>();
      if (clusterGroupIds.size > 0) {
        const { items: clusterGroups } = await catalogApi.getEntities({
          filter: {
            kind: 'Resource',
            'spec.type': 'spectrocloud-cluster-group',
          },
        });

        clusterGroups.forEach(cg => {
          const cgId = cg.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`];
          if (cgId && clusterGroupIds.has(cgId)) {
            clusterGroupNamesMap.set(cgId, cg.metadata.title || cg.metadata.name);
            clusterGroupEntitiesMap.set(cgId, cg);
          }
        });
      }
      setClusterGroupNames(clusterGroupNamesMap);
      setClusterGroupEntities(clusterGroupEntitiesMap);

      // Fetch project systems from catalog
      const projectSystemEntitiesMap = new Map<string, Entity>();
      if (projectNames.size > 0) {
        const { items: systems } = await catalogApi.getEntities({
          filter: {
            kind: 'System',
          },
        });

        systems.forEach(system => {
          const systemName = system.metadata.name;
          const systemTitle = system.metadata.title || systemName;
          // Match by system name (which is typically based on instance-projectName pattern)
          projectNames.forEach(projectName => {
            if (systemName.endsWith(`-${projectName}`) || systemTitle === projectName) {
              projectSystemEntitiesMap.set(projectName, system);
            }
          });
        });
      }
      setProjectSystemEntities(projectSystemEntitiesMap);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load virtual clusters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVirtualClusters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for profile updates after virtual clusters are loaded
  useEffect(() => {
    if (virtualClusters.length === 0) return;

    const checkForUpdates = async () => {
      const virtualClustersWithUpdatesSet = new Set<string>();

      // Check each virtual cluster for profile updates
      for (const virtualCluster of virtualClusters) {
        const clusterUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        const projectUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/project-id`];
        const instanceName = virtualCluster.metadata.annotations?.[`${annotationPrefix}/instance`];

        if (!clusterUid) continue;

        try {
          // Get virtual cluster details to find attached profiles
          const clusterDetails = await spectroCloudApi.getVirtualClusterDetails(clusterUid, projectUid, instanceName);

          const profileNames = clusterDetails.spec?.clusterProfileTemplates
            ?.map(p => p.name)
            .filter((name): name is string => !!name) || [];

          if (profileNames.length === 0) continue;

          // Search for full profile data with version info
          const profiles = await spectroCloudApi.searchProfiles(profileNames, projectUid, instanceName);

          // Check if any profile has updates
          const hasAnyUpdates = profiles.some(profileData => {
            if (!profileData?.specSummary?.versions) return false;

            const versions = profileData.specSummary.versions;

            // Find the profile UID currently used by the virtual cluster
            const clusterProfileTemplate = clusterDetails.spec?.clusterProfileTemplates?.find(
              p => p.name === profileData.metadata.name
            );
            const profileUid = clusterProfileTemplate?.uid;

            if (!profileUid) return false;

            const currentVersionData = versions.find(v => v.uid === profileUid);
            const currentVersion = currentVersionData?.version;

            const compareVersions = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

            const latestVersion = versions?.reduce((max: string | null, v) => {
              const version = v?.version;
              if (!version) return max;
              return !max || compareVersions(version, max) > 0 ? version : max;
            }, null);

            return Boolean(currentVersion && latestVersion && compareVersions(latestVersion, currentVersion) > 0);
          });

          if (hasAnyUpdates) {
            virtualClustersWithUpdatesSet.add(clusterUid);
          }
        } catch (err) {
          // Silently ignore errors for individual virtual clusters
          // eslint-disable-next-line no-console
          console.warn(`Failed to check updates for virtual cluster ${clusterUid}:`, err);
        }
      }

      setVirtualClustersWithUpdates(virtualClustersWithUpdatesSet);
    };

    checkForUpdates();
  }, [virtualClusters, annotationPrefix, spectroCloudApi]);

  // Extract unique projects from virtual clusters
  const projects = useMemo(() => {
    const projectSet = new Set<string>();
    virtualClusters.forEach(vc => {
      const projectName = vc.metadata.annotations?.[`${annotationPrefix}/project-name`];
      if (projectName) projectSet.add(projectName);
    });
    return Array.from(projectSet).sort();
  }, [virtualClusters, annotationPrefix]);

  // Extract unique statuses from virtual clusters
  const statuses = useMemo(() => {
    const statusSet = new Set<string>();
    virtualClusters.forEach(vc => {
      const status = vc.metadata.annotations?.[`${annotationPrefix}/state`];
      if (status) statusSet.add(status);
    });
    return Array.from(statusSet).sort();
  }, [virtualClusters, annotationPrefix]);

  // Filter virtual clusters (sorting itself is handled per-view: the table's own
  // column headers are sortable via @backstage/core-components' Table, and cards
  // are shown in a stable name-sorted order)
  const filteredVirtualClusters = useMemo(() => {
    const filtered = virtualClusters.filter(vc => {
      // Project filter
      if (selectedProject !== 'all') {
        const projectName = vc.metadata.annotations?.[`${annotationPrefix}/project-name`];
        if (projectName !== selectedProject) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const status = vc.metadata.annotations?.[`${annotationPrefix}/state`];
        if (status !== selectedStatus) return false;
      }

      // Updates filter
      if (showOnlyWithUpdates) {
        const clusterUid = vc.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        if (!clusterUid || !virtualClustersWithUpdates.has(clusterUid)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) =>
      (a.metadata.title || a.metadata.name || '').localeCompare(b.metadata.title || b.metadata.name || ''),
    );
  }, [virtualClusters, selectedProject, selectedStatus, showOnlyWithUpdates, annotationPrefix, virtualClustersWithUpdates]);

  // Build the display rows consumed by both the card grid and the table view
  const rows = useMemo<VirtualClusterRow[]>(() => {
    return filteredVirtualClusters.map(virtualCluster => {
      const clusterUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
      const projectName = virtualCluster.metadata.annotations?.[`${annotationPrefix}/project-name`];
      const status = virtualCluster.metadata.annotations?.[`${annotationPrefix}/state`] || 'Unknown';
      const hostClusterId = virtualCluster.metadata.annotations?.[`${annotationPrefix}/host-cluster-id`];
      const clusterGroupId = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`];
      const hostClusterName = hostClusterId ? (hostClusterNames.get(hostClusterId) || hostClusterId.substring(0, 8)) : 'N/A';
      const clusterGroupName = clusterGroupId ? (clusterGroupNames.get(clusterGroupId) || clusterGroupId.substring(0, 8)) : 'N/A';

      // CPU and Memory quotas
      const cpuLimit = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cpu-limit`];
      const memoryLimit = virtualCluster.metadata.annotations?.[`${annotationPrefix}/memory-limit`];
      // Format CPU quota (convert MilliCore to cores)
      const cpuQuota = cpuLimit ? `${(parseInt(cpuLimit, 10) / 1000).toFixed(2)} cores` : 'N/A';
      // Format Memory quota (convert KiB to GiB)
      const memoryQuota = memoryLimit ? `${(parseInt(memoryLimit, 10) / (1024 * 1024)).toFixed(2)} GiB` : 'N/A';

      return {
        entity: virtualCluster,
        uid: virtualCluster.metadata.uid || virtualCluster.metadata.name,
        clusterUid,
        title: virtualCluster.metadata.title || virtualCluster.metadata.name,
        project: projectName || '',
        projectSystem: projectName ? projectSystemEntities.get(projectName) : undefined,
        status,
        cpuQuota,
        memoryQuota,
        hostClusterName,
        hostClusterEntity: hostClusterId ? hostClusterEntities.get(hostClusterId) : undefined,
        clusterGroupName,
        clusterGroupEntity: clusterGroupId ? clusterGroupEntities.get(clusterGroupId) : undefined,
        hasUpdates: clusterUid ? virtualClustersWithUpdates.has(clusterUid) : false,
      };
    });
  }, [
    filteredVirtualClusters,
    annotationPrefix,
    hostClusterNames,
    clusterGroupNames,
    hostClusterEntities,
    clusterGroupEntities,
    projectSystemEntities,
    virtualClustersWithUpdates,
  ]);

  const handleCardClick = useCallback((virtualCluster: Entity) => {
    // Navigate to Kubernetes Resources tab
    window.location.href = `/catalog/${virtualCluster.metadata.namespace || 'default'}/resource/${virtualCluster.metadata.name}`;
  }, []);

  const handleDownloadKubeconfig = useCallback(async (virtualCluster: Entity) => {
    const clusterUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
    const projectUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/project-id`];
    const instanceName = virtualCluster.metadata.annotations?.[`${annotationPrefix}/instance`];

    if (!clusterUid) return;

    try {
      setDownloadingCluster(clusterUid);
      const kubeconfig = await spectroCloudApi.getVirtualClusterKubeconfig(
        clusterUid,
        projectUid,
        instanceName,
        true,
      );

      const blob = new Blob([kubeconfig], { type: 'application/x-yaml' });
      saveAs(blob, `${virtualCluster.metadata.name}-kubeconfig.yaml`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to download kubeconfig:', err);
    } finally {
      setDownloadingCluster(undefined);
    }
  }, [spectroCloudApi, annotationPrefix]);

  if (loading) {
    return (
      <Page themeId="tool">
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error) {
    return (
      <Page themeId="tool">
        <Content>
          <Alert status="danger" description={error} />
        </Content>
      </Page>
    );
  }

  const virtualClusterDisplay = viewMode === 'cards' ? (
    <Grid.Root columns="12" gap="5">
      {rows.map(row => (
        <Grid.Item key={row.uid} colSpan={{ xs: '12', sm: '6', md: '4' }}>
          <VirtualClusterCard
            row={row}
            isDownloading={downloadingCluster === row.clusterUid}
            onCardClick={() => handleCardClick(row.entity)}
            onDownload={() => handleDownloadKubeconfig(row.entity)}
          />
        </Grid.Item>
      ))}
    </Grid.Root>
  ) : (
    <VirtualClusterTable
      rows={rows}
      downloadingCluster={downloadingCluster}
      onDownload={handleDownloadKubeconfig}
    />
  );

  return (
    <Page themeId="tool">
      <Content>
        <Text color="secondary" style={{ display: 'block', marginBottom: 'var(--bui-space-4)' }}>
          View and manage your Spectro Cloud virtual clusters
        </Text>

        <Box p="4">
          {/* Filters */}
          <Box className={styles.filterBar}>
            <Grid.Root columns="12" gap="3">
              <Grid.Item colSpan={{ xs: '12', sm: '4', md: '3' }}>
                <Select
                  size="small"
                  label="Project"
                  selectedKey={selectedProject}
                  onSelectionChange={key => setSelectedProject(String(key))}
                  options={[
                    { id: 'all', label: 'All Projects' },
                    ...projects.map(project => ({ id: project, label: project })),
                  ]}
                />
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '4', md: '2' }}>
                <Select
                  size="small"
                  label="Status"
                  selectedKey={selectedStatus}
                  onSelectionChange={key => setSelectedStatus(String(key))}
                  options={[
                    { id: 'all', label: 'All Statuses' },
                    ...statuses.map(status => ({ id: status, label: status })),
                  ]}
                />
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '4', md: '4' }}>
                <Flex align="center" style={{ height: '100%' }}>
                  <Checkbox
                    isSelected={showOnlyWithUpdates}
                    onChange={setShowOnlyWithUpdates}
                  >
                    Show only clusters with updates available
                  </Checkbox>
                </Flex>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '12', md: '3' }}>
                <Flex align="center" justify="end" gap="2" style={{ flexWrap: 'wrap' }}>
                  <ToggleButtonGroup
                    className={styles.viewToggle}
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={[viewMode]}
                    onSelectionChange={keys => {
                      const [v] = Array.from(keys);
                      if (v) setViewMode(v as 'cards' | 'list');
                    }}
                  >
                    <TooltipTrigger>
                      <ToggleButton id="cards" aria-label="card view">
                        <RiLayoutGridLine size={16} />
                      </ToggleButton>
                      <Tooltip>Card View</Tooltip>
                    </TooltipTrigger>
                    <TooltipTrigger>
                      <ToggleButton id="list" aria-label="list view">
                        <RiListUnordered size={16} />
                      </ToggleButton>
                      <Tooltip>List View</Tooltip>
                    </TooltipTrigger>
                  </ToggleButtonGroup>
                  <Text color="secondary">
                    {rows.length} / {virtualClusters.length}
                  </Text>
                  <Button
                    variant="primary"
                    size="small"
                    iconStart={<RiAddCircleFill />}
                    onPress={() => { window.location.href = clusterDeploymentRoute(); }}
                  >
                    Create Cluster
                  </Button>
                  <TooltipTrigger>
                    <ButtonIcon
                      aria-label="Refresh virtual clusters"
                      variant="tertiary"
                      size="small"
                      icon={<RiRefreshLine />}
                      onPress={fetchVirtualClusters}
                    />
                    <Tooltip>Refresh virtual clusters</Tooltip>
                  </TooltipTrigger>
                </Flex>
              </Grid.Item>
            </Grid.Root>
          </Box>

          {/* Virtual Cluster Display */}
          {rows.length === 0 ? (
            <Box className={styles.emptyState}>
              <Text variant="title-medium" color="secondary" style={{ display: 'block' }}>
                No virtual clusters found
              </Text>
              <Text color="secondary">
                {virtualClusters.length === 0
                  ? 'You do not have access to any virtual clusters.'
                  : 'No virtual clusters match the selected filters.'}
              </Text>
            </Box>
          ) : virtualClusterDisplay}
        </Box>
      </Content>
    </Page>
  );
};
