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
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
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
  RiAddCircleLine,
  RiDashboardLine,
  RiDownloadCloudLine,
  RiFilterLine,
  RiRefreshLine,
  RiSparkling2Line,
  RiTableLine,
} from '@remixicon/react';
import { spectroCloudApiRef } from '../../api';
import { saveAs } from 'file-saver';
import styles from './ClusterViewerPage.module.css';

type ViewMode = 'cards' | 'list';

type ClusterInfo = {
  scope: string;
  state: string;
  cloudType: string;
  k8sVersion: string;
  projectName: string;
  clusterUid: string;
  projectUid: string;
  instanceName: string;
};

type ClusterRow = ClusterInfo & {
  cluster: Entity;
  displayName: string;
  hasUpdates: boolean;
};

const getStatusComponent = (state: string) => {
  const lowerState = state.toLowerCase();
  if (lowerState === 'running' || lowerState === 'healthy' || lowerState === 'ready') {
    return <StatusOK />;
  }
  if (lowerState === 'error' || lowerState === 'failed' || lowerState === 'unhealthy') {
    return <StatusError />;
  }
  if (lowerState === 'warning' || lowerState === 'degraded') {
    return <StatusWarning />;
  }
  return <StatusPending />;
};

export const ClusterViewerPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const configApi = useApi(configApiRef);
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const clusterDeploymentRoute = useRouteRef(clusterDeploymentRouteRef);

  const [clusters, setClusters] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCloudType, setSelectedCloudType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedK8sVersion, setSelectedK8sVersion] = useState<string>('all');
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [downloadingCluster, setDownloadingCluster] = useState<string>();
  const [clustersWithUpdates, setClustersWithUpdates] = useState<Set<string>>(new Set());
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Get annotation prefix from config
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const fetchClusters = async () => {
    try {
      setLoading(true);
      setError(undefined);

      // Get clusters from SpectroCloud API that the user has access to based on OIDC token
      const spectroCloudClusters = await spectroCloudApi.getAllClusters();

      const accessibleClusterUids = new Set(
        spectroCloudClusters.map(cluster => cluster.metadata.uid)
      );

      // Get all catalog entities
      const { items } = await catalogApi.getEntities({
        filter: {
          kind: 'Resource',
          'spec.type': 'spectrocloud-cluster',
        },
      });

      // Filter catalog entities to only show clusters the user has access to
      const filteredClusters = items.filter(entity => {
        const clusterUid = entity.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        return clusterUid && accessibleClusterUids.has(clusterUid);
      });

      setClusters(filteredClusters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clusters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for profile updates after clusters are loaded
  useEffect(() => {
    if (clusters.length === 0) return;

    const checkForUpdates = async () => {
      const clustersWithUpdatesSet = new Set<string>();

      // Check each cluster for profile updates
      for (const cluster of clusters) {
        const clusterUid = cluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        const projectUid = cluster.metadata.annotations?.[`${annotationPrefix}/project-id`];
        const instanceName = cluster.metadata.annotations?.[`${annotationPrefix}/instance`];

        if (!clusterUid) continue;

        try {
          // Get cluster details to find attached profiles
          const clusterDetails = await spectroCloudApi.getClusterDetails(clusterUid, projectUid, instanceName);

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

            // Find the profile UID currently used by the cluster
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
            clustersWithUpdatesSet.add(clusterUid);
          }
        } catch (err) {
          // Silently ignore errors for individual clusters
          // eslint-disable-next-line no-console
          console.warn(`Failed to check updates for cluster ${clusterUid}:`, err);
        }
      }

      setClustersWithUpdates(clustersWithUpdatesSet);
    };

    checkForUpdates();
  }, [clusters, annotationPrefix, spectroCloudApi]);

  // Extract unique values for filters
  const projects = useMemo(() => {
    const projectSet = new Set<string>();
    clusters.forEach(cluster => {
      const projectName = cluster.metadata.annotations?.[`${annotationPrefix}/project-name`];
      if (projectName) {
        projectSet.add(projectName);
      }
    });
    return ['all', ...Array.from(projectSet).sort()];
  }, [clusters, annotationPrefix]);

  const cloudTypes = useMemo(() => {
    const cloudTypeSet = new Set<string>();
    clusters.forEach(cluster => {
      const cloudType = cluster.metadata.annotations?.[`${annotationPrefix}/cloud-type`];
      if (cloudType && cloudType !== 'unknown') {
        cloudTypeSet.add(cloudType.toUpperCase());
      }
    });
    return ['all', ...Array.from(cloudTypeSet).sort()];
  }, [clusters, annotationPrefix]);

  const statuses = useMemo(() => {
    const statusSet = new Set<string>();
    clusters.forEach(cluster => {
      const state = cluster.metadata.annotations?.[`${annotationPrefix}/state`];
      if (state && state !== 'unknown') {
        statusSet.add(state);
      }
    });
    return ['all', ...Array.from(statusSet).sort()];
  }, [clusters, annotationPrefix]);

  const k8sVersions = useMemo(() => {
    const versionSet = new Set<string>();
    clusters.forEach(cluster => {
      const version = cluster.metadata.annotations?.[`${annotationPrefix}/kubernetes-version`];
      if (version && version !== 'N/A') {
        versionSet.add(version);
      }
    });
    return ['all', ...Array.from(versionSet).sort()];
  }, [clusters, annotationPrefix]);

  // Helper function to extract cluster info from entity
  const getClusterInfo = useCallback((cluster: Entity): ClusterInfo => {
    const annotations = cluster.metadata.annotations || {};
    const cloudType = annotations[`${annotationPrefix}/cloud-type`] || 'unknown';
    const projectName = annotations[`${annotationPrefix}/project-name`] || 'N/A';

    return {
      scope: annotations[`${annotationPrefix}/scope`] || 'unknown',
      state: annotations[`${annotationPrefix}/state`] || 'unknown',
      cloudType: cloudType === 'unknown' ? 'Unknown' : cloudType.toUpperCase(),
      k8sVersion: annotations[`${annotationPrefix}/kubernetes-version`] || 'N/A',
      projectName,
      clusterUid: annotations[`${annotationPrefix}/cluster-id`] || '',
      projectUid: annotations[`${annotationPrefix}/project-id`] || '',
      instanceName: annotations[`${annotationPrefix}/instance`] || '',
    };
  }, [annotationPrefix]);

  // Filter and sort clusters (list view lets the table re-sort independently by column)
  const filteredClusters = useMemo(() => {
    const filtered = clusters.filter(cluster => {
      const info = getClusterInfo(cluster);

      // Project filter
      if (selectedProject !== 'all' && info.projectName !== selectedProject) {
        return false;
      }

      // Cloud type filter
      if (selectedCloudType !== 'all' && info.cloudType !== selectedCloudType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && info.state !== selectedStatus) {
        return false;
      }

      // K8s version filter
      if (selectedK8sVersion !== 'all' && info.k8sVersion !== selectedK8sVersion) {
        return false;
      }

      // Updates available filter
      if (showOnlyWithUpdates && !clustersWithUpdates.has(info.clusterUid)) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) =>
      (a.metadata.title || a.metadata.name).localeCompare(b.metadata.title || b.metadata.name)
    );
  }, [clusters, selectedProject, selectedCloudType, selectedStatus, selectedK8sVersion, showOnlyWithUpdates, clustersWithUpdates, getClusterInfo]);

  const clusterRows: ClusterRow[] = useMemo(
    () => filteredClusters.map(cluster => ({
      cluster,
      displayName: cluster.metadata.title || cluster.metadata.name,
      hasUpdates: clustersWithUpdates.has(getClusterInfo(cluster).clusterUid),
      ...getClusterInfo(cluster),
    })),
    [filteredClusters, clustersWithUpdates, getClusterInfo],
  );

  const handleDownloadKubeconfig = async (cluster: Entity) => {
    const info = getClusterInfo(cluster);

    if (!info.clusterUid) {
      return;
    }

    setDownloadingCluster(info.clusterUid);

    try {
      const kubeconfig = await spectroCloudApi.getKubeconfig(
        info.clusterUid,
        info.projectUid || undefined,
        info.instanceName,
        true,
      );

      const blob = new Blob([kubeconfig], { type: 'application/x-yaml' });
      const filename = `${cluster.metadata.name}-kubeconfig.yaml`;
      saveAs(blob, filename);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to download kubeconfig:', err);
    } finally {
      setDownloadingCluster(undefined);
    }
  };

  const handleCardClick = (cluster: Entity) => {
    // Navigate to Kubernetes Resources tab
    window.location.href = `/catalog/${cluster.metadata.namespace || 'default'}/resource/${cluster.metadata.name}/kubernetes-resources`;
  };

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

  // Count active filters
  const activeFiltersCount = [
    selectedProject !== 'all' ? 1 : 0,
    selectedCloudType !== 'all' ? 1 : 0,
    selectedStatus !== 'all' ? 1 : 0,
    selectedK8sVersion !== 'all' ? 1 : 0,
    showOnlyWithUpdates ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const columns: TableColumn<ClusterRow>[] = [
    {
      title: 'Cluster Name',
      field: 'displayName',
      render: row => <Text weight="bold">{row.displayName}</Text>,
    },
    {
      title: 'Status',
      field: 'state',
      render: row => (
        <Flex align="center" gap="1">
          {getStatusComponent(row.state)}
          <Text variant="body-small">{row.state}</Text>
        </Flex>
      ),
    },
    {
      title: 'Cloud Type',
      field: 'cloudType',
      render: row => <Badge>{row.cloudType}</Badge>,
    },
    {
      title: 'Scope',
      field: 'scope',
      render: row => <Badge>{row.scope}</Badge>,
    },
    {
      title: 'Project',
      field: 'projectName',
      render: row => <Text variant="body-small">{row.scope === 'project' ? row.projectName : '-'}</Text>,
    },
    {
      title: 'Kubernetes',
      field: 'k8sVersion',
    },
    {
      title: 'Updates',
      field: 'hasUpdates',
      render: row =>
        row.hasUpdates ? (
          <Badge icon={<RiSparkling2Line size={14} />}>Available</Badge>
        ) : null,
    },
    {
      title: 'Actions',
      sorting: false,
      render: row => (
        // Shields the button below from the row's onRowClick navigation handler;
        // the button itself remains the only focusable/keyboard-operable control here.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div onClick={e => e.stopPropagation()}>
          <Button
            size="small"
            variant="secondary"
            iconStart={<RiDownloadCloudLine />}
            isPending={downloadingCluster === row.clusterUid}
            onPress={() => handleDownloadKubeconfig(row.cluster)}
          >
            Kubeconfig
          </Button>
        </div>
      ),
    },
  ];

  const clusterDisplay = viewMode === 'cards' ? (
    /* Card View */
    <Grid.Root columns="12" gap="5">
      {filteredClusters.map((cluster) => {
        const info = getClusterInfo(cluster);
        const isDownloading = downloadingCluster === info.clusterUid;

        return (
          <Grid.Item colSpan={{ xs: '12', sm: '6', md: '4' }} key={cluster.metadata.uid}>
            <div
              className={styles.clusterCardWrapper}
              onClick={() => handleCardClick(cluster)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleCardClick(cluster);
              }}
            >
              <Card className={styles.clusterCard}>
                <CardBody>
                  <Box mb="4">
                    <Text variant="title-small" weight="bold">
                      {cluster.metadata.title || cluster.metadata.name}
                    </Text>
                  </Box>

                  {/* Status */}
                  <Flex justify="between" align="center" mb="2">
                    <Text variant="body-small" color="secondary" weight="bold">
                      Status
                    </Text>
                    <Flex align="center" gap="1">
                      {getStatusComponent(info.state)}
                      <Text variant="body-small">{info.state}</Text>
                    </Flex>
                  </Flex>

                  {/* Cloud Type */}
                  <Flex justify="between" align="center" mb="2">
                    <Text variant="body-small" color="secondary" weight="bold">
                      Cloud Type
                    </Text>
                    <Badge>{info.cloudType.toUpperCase()}</Badge>
                  </Flex>

                  {/* Scope */}
                  <Flex justify="between" align="center" mb="2">
                    <Text variant="body-small" color="secondary" weight="bold">
                      Scope
                    </Text>
                    <Badge>{info.scope}</Badge>
                  </Flex>

                  {/* Project */}
                  {info.scope === 'project' && (
                    <Flex justify="between" align="center" mb="2">
                      <Text variant="body-small" color="secondary" weight="bold">
                        Project
                      </Text>
                      <Text variant="body-small">{info.projectName}</Text>
                    </Flex>
                  )}

                  {/* Kubernetes Version */}
                  <Flex justify="between" align="center" mb="2">
                    <Text variant="body-small" color="secondary" weight="bold">
                      Kubernetes
                    </Text>
                    <Text variant="body-small">{info.k8sVersion}</Text>
                  </Flex>

                  {/* Updates Available Indicator */}
                  {clustersWithUpdates.has(info.clusterUid) && (
                    <Box mt="2">
                      <Badge icon={<RiSparkling2Line size={14} />}>Updates Available</Badge>
                    </Box>
                  )}
                </CardBody>

                <CardFooter>
                  <Flex justify="between" align="center" style={{ width: '100%' }}>
                    <Link
                      to={`/catalog/${cluster.metadata.namespace || 'default'}/resource/${cluster.metadata.name}/kubernetes-resources`}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      View Details
                    </Link>
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                    <div onClick={e => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="secondary"
                        iconStart={<RiDownloadCloudLine />}
                        isPending={isDownloading}
                        onPress={() => handleDownloadKubeconfig(cluster)}
                      >
                        {isDownloading ? 'Downloading...' : 'Kubeconfig'}
                      </Button>
                    </div>
                  </Flex>
                </CardFooter>
              </Card>
            </div>
          </Grid.Item>
        );
      })}
    </Grid.Root>
  ) : (
    /* List View */
    <Table<ClusterRow>
      options={{ search: false, paging: false }}
      columns={columns}
      data={clusterRows}
      onRowClick={(_event, rowData) => {
        if (rowData) handleCardClick(rowData.cluster);
      }}
    />
  );

  return (
    <Page themeId="tool">
      <Content>
        <Box p="2">
          {/* Toolbar */}
          <Box className={styles.filterBar} bg="neutral" p="4" mb="4">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <Button
                  variant="secondary"
                  size="small"
                  iconStart={<RiFilterLine />}
                  onPress={() => setFilterDialogOpen(true)}
                >
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge size="small" style={{ marginLeft: 'var(--bui-space-1)' }}>
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                <Text variant="body-small" color="secondary">
                  {filteredClusters.length} / {clusters.length} clusters
                </Text>
              </Flex>

              <Flex align="center" gap="2">
                <ToggleButtonGroup
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={[viewMode]}
                  onSelectionChange={keys => {
                    const [v] = Array.from(keys);
                    if (v) setViewMode(v as ViewMode);
                  }}
                >
                  <TooltipTrigger>
                    <ToggleButton id="cards" aria-label="card view">
                      <RiDashboardLine size={16} />
                    </ToggleButton>
                    <Tooltip>Card View</Tooltip>
                  </TooltipTrigger>
                  <TooltipTrigger>
                    <ToggleButton id="list" aria-label="list view">
                      <RiTableLine size={16} />
                    </ToggleButton>
                    <Tooltip>List View</Tooltip>
                  </TooltipTrigger>
                </ToggleButtonGroup>
                <Button
                  variant="primary"
                  size="small"
                  iconStart={<RiAddCircleLine />}
                  onPress={() => { window.location.href = clusterDeploymentRoute(); }}
                >
                  Create Cluster
                </Button>
                <TooltipTrigger>
                  <ButtonIcon
                    aria-label="Refresh clusters"
                    icon={<RiRefreshLine />}
                    size="small"
                    variant="secondary"
                    onPress={fetchClusters}
                  />
                  <Tooltip>Refresh clusters</Tooltip>
                </TooltipTrigger>
              </Flex>
            </Flex>
          </Box>

          {/* Cluster Display */}
          {filteredClusters.length === 0 ? (
            <Box className={styles.emptyState}>
              <Text as="div" variant="title-small">
                No clusters found
              </Text>
              <Text variant="body-small" color="secondary">
                {clusters.length === 0
                  ? 'No SpectroCloud clusters are available in the catalog.'
                  : 'No clusters match the selected filters. Try adjusting your filter criteria.'}
              </Text>
            </Box>
          ) : clusterDisplay}

          {/* Filter Dialog */}
          <Dialog isOpen={filterDialogOpen} onOpenChange={setFilterDialogOpen} width={640}>
            <DialogHeader>Filter Clusters</DialogHeader>
            <DialogBody>
              <Grid.Root columns="12" gap="4">
                <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                  <Select
                    label="Project"
                    selectedKey={selectedProject}
                    onSelectionChange={key => setSelectedProject(String(key))}
                    options={projects.map(project => ({
                      id: project,
                      label: project === 'all' ? 'All Projects' : project,
                    }))}
                  />
                </Grid.Item>

                <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                  <Select
                    label="Cloud Type"
                    selectedKey={selectedCloudType}
                    onSelectionChange={key => setSelectedCloudType(String(key))}
                    options={cloudTypes.map(type => ({
                      id: type,
                      label: type === 'all' ? 'All Types' : type,
                    }))}
                  />
                </Grid.Item>

                <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                  <Select
                    label="Status"
                    selectedKey={selectedStatus}
                    onSelectionChange={key => setSelectedStatus(String(key))}
                    options={statuses.map(status => ({
                      id: status,
                      label: status === 'all' ? 'All Statuses' : status,
                    }))}
                  />
                </Grid.Item>

                <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                  <Select
                    label="Kubernetes Version"
                    selectedKey={selectedK8sVersion}
                    onSelectionChange={key => setSelectedK8sVersion(String(key))}
                    options={k8sVersions.map(version => ({
                      id: version,
                      label: version === 'all' ? 'All Versions' : version,
                    }))}
                  />
                </Grid.Item>

                <Grid.Item colSpan="12">
                  <Checkbox
                    isSelected={showOnlyWithUpdates}
                    onChange={setShowOnlyWithUpdates}
                  >
                    Show only clusters with updates available
                  </Checkbox>
                </Grid.Item>
              </Grid.Root>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="secondary"
                onPress={() => {
                  setSelectedProject('all');
                  setSelectedCloudType('all');
                  setSelectedStatus('all');
                  setSelectedK8sVersion('all');
                  setShowOnlyWithUpdates(false);
                }}
              >
                Clear All
              </Button>
              <Button
                variant="primary"
                onPress={() => setFilterDialogOpen(false)}
              >
                Apply
              </Button>
            </DialogFooter>
          </Dialog>
        </Box>
      </Content>
    </Page>
  );
};
