import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, Page, Content, Progress, Link } from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Chip,
  Button,
  makeStyles,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';
import { Alert, ToggleButtonGroup, ToggleButton } from '@material-ui/lab';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import RefreshIcon from '@material-ui/icons/Refresh';
import NewReleasesIcon from '@material-ui/icons/NewReleases';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import ViewListIcon from '@material-ui/icons/ViewList';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import {
  StatusOK,
  StatusError,
  StatusWarning,
  StatusPending,
} from '@backstage/core-components';
import { spectroCloudApiRef } from '../../api';
import { saveAs } from 'file-saver';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  filterBar: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
  },
  cardContent: {
    flexGrow: 1,
  },
  cardActions: {
    padding: theme.spacing(2),
    paddingTop: 0,
    justifyContent: 'space-between',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    alignItems: 'center',
  },
  label: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
  },
  clusterName: {
    marginBottom: theme.spacing(2),
    fontWeight: 600,
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(8),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  tableHeaderCell: {
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  tableHeaderCellNonSortable: {
    fontWeight: 700,
  },
  tableCell: {
    padding: theme.spacing(2),
  },
  tableRow: {
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  viewToggle: {
    marginLeft: 'auto',
  },
}));

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

export const VirtualClusterViewerPage = () => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const configApi = useApi(configApiRef);
  
  const [virtualClusters, setVirtualClusters] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
            const latestVersion = profileData.specSummary.version || versions[0]?.version;
            
            // Find the profile UID currently used by the virtual cluster
            const clusterProfileTemplate = clusterDetails.spec?.clusterProfileTemplates?.find(
              p => p.name === profileData.metadata.name
            );
            const profileUid = clusterProfileTemplate?.uid;
            
            if (!profileUid) return false;
            
            const currentVersionData = versions.find(v => v.uid === profileUid);
            const currentVersion = currentVersionData?.version;
            
            return currentVersion && latestVersion && currentVersion !== latestVersion;
          });
          
          if (hasAnyUpdates) {
            virtualClustersWithUpdatesSet.add(clusterUid);
          }
        } catch (err) {
          // Silently ignore errors for individual virtual clusters
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

  // Filter and sort virtual clusters
  const filteredAndSortedVirtualClusters = useMemo(() => {
    let filtered = virtualClusters.filter(vc => {
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

    // Sort
    filtered.sort((a, b) => {
      let aVal: string;
      let bVal: string;

      switch (sortColumn) {
        case 'name':
          aVal = a.metadata.title || a.metadata.name || '';
          bVal = b.metadata.title || b.metadata.name || '';
          break;
        case 'project':
          aVal = a.metadata.annotations?.[`${annotationPrefix}/project-name`] || '';
          bVal = b.metadata.annotations?.[`${annotationPrefix}/project-name`] || '';
          break;
        case 'status':
          aVal = a.metadata.annotations?.[`${annotationPrefix}/state`] || '';
          bVal = b.metadata.annotations?.[`${annotationPrefix}/state`] || '';
          break;
        case 'hostCluster':
          const aHostId = a.metadata.annotations?.[`${annotationPrefix}/host-cluster-id`] || '';
          const bHostId = b.metadata.annotations?.[`${annotationPrefix}/host-cluster-id`] || '';
          aVal = hostClusterNames.get(aHostId) || aHostId;
          bVal = hostClusterNames.get(bHostId) || bHostId;
          break;
        case 'clusterGroup':
          const aCgId = a.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`] || '';
          const bCgId = b.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`] || '';
          aVal = clusterGroupNames.get(aCgId) || aCgId;
          bVal = clusterGroupNames.get(bCgId) || bCgId;
          break;
        default:
          aVal = '';
          bVal = '';
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [virtualClusters, selectedProject, selectedStatus, showOnlyWithUpdates, sortColumn, sortDirection, annotationPrefix, virtualClustersWithUpdates, hostClusterNames, clusterGroupNames]);

  const handleCardClick = (virtualCluster: Entity) => {
    // Navigate to Kubernetes Resources tab
    window.location.href = `/catalog/${virtualCluster.metadata.namespace || 'default'}/resource/${virtualCluster.metadata.name}`;
  };

  const handleDownloadKubeconfig = useCallback(async (virtualCluster: Entity, event?: React.MouseEvent) => {
    // Stop propagation to prevent card click
    if (event) {
      event.stopPropagation();
    }
    
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
      console.error('Failed to download kubeconfig:', err);
    } finally {
      setDownloadingCluster(undefined);
    }
  }, [spectroCloudApi, annotationPrefix]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  if (loading) {
    return (
      <Page themeId="tool">
        <Header title="Virtual Clusters" subtitle="View and manage your Spectro Cloud virtual clusters" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error) {
    return (
      <Page themeId="tool">
        <Header title="Virtual Clusters" subtitle="View and manage your Spectro Cloud virtual clusters" />
        <Content>
          <Alert severity="error">{error}</Alert>
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Header title="Virtual Clusters" subtitle="View and manage your Spectro Cloud virtual clusters" />
      <Content>
        <Box className={classes.root}>
          {/* Filters */}
          <Box className={classes.filterBar}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Project"
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  variant="outlined"
                  size="small"
                >
                  <MenuItem value="all">All Projects</MenuItem>
                  {projects.map(project => (
                    <MenuItem key={project} value={project}>
                      {project}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  variant="outlined"
                  size="small"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showOnlyWithUpdates}
                      onChange={(e) => setShowOnlyWithUpdates(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show only clusters with updates available"
                />
              </Grid>
              <Grid item xs={12} sm={12} md={3}>
                <Box display="flex" alignItems="center" justifyContent="flex-end" style={{ gap: 8 }}>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                    size="small"
                    className={classes.viewToggle}
                  >
                    <ToggleButton value="cards">
                      <Tooltip title="Card View">
                        <ViewModuleIcon />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="list">
                      <Tooltip title="List View">
                        <ViewListIcon />
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="body2" color="textSecondary">
                    {filteredAndSortedVirtualClusters.length} / {virtualClusters.length}
                  </Typography>
                  <Tooltip title="Refresh virtual clusters">
                    <IconButton onClick={fetchVirtualClusters} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Virtual Cluster Display */}
          {filteredAndSortedVirtualClusters.length === 0 ? (
            <Box className={classes.emptyState}>
              <Typography variant="h5" color="textSecondary" gutterBottom>
                No virtual clusters found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {virtualClusters.length === 0
                  ? 'You do not have access to any virtual clusters.'
                  : 'No virtual clusters match the selected filters.'}
              </Typography>
            </Box>
          ) : viewMode === 'cards' ? (
            <Grid container spacing={3}>
              {filteredAndSortedVirtualClusters.map(virtualCluster => {
                const clusterUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
                const projectName = virtualCluster.metadata.annotations?.[`${annotationPrefix}/project-name`];
                const state = virtualCluster.metadata.annotations?.[`${annotationPrefix}/state`] || 'Unknown';
                const hostClusterId = virtualCluster.metadata.annotations?.[`${annotationPrefix}/host-cluster-id`];
                const clusterGroupId = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`];
                const hostClusterName = hostClusterId ? (hostClusterNames.get(hostClusterId) || hostClusterId.substring(0, 8)) : 'N/A';
                const clusterGroupName = clusterGroupId ? (clusterGroupNames.get(clusterGroupId) || clusterGroupId.substring(0, 8)) : 'N/A';
                
                // CPU and Memory quotas
                const cpuLimit = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cpu-limit`];
                const memoryLimit = virtualCluster.metadata.annotations?.[`${annotationPrefix}/memory-limit`];
                
                // Format CPU quota (convert MilliCore to cores)
                const cpuQuota = cpuLimit ? `${(parseInt(cpuLimit) / 1000).toFixed(2)} cores` : 'N/A';
                // Format Memory quota (convert KiB to GiB)
                const memoryQuota = memoryLimit ? `${(parseInt(memoryLimit) / (1024 * 1024)).toFixed(2)} GiB` : 'N/A';
                
                const hasUpdates = clusterUid ? virtualClustersWithUpdates.has(clusterUid) : false;
                const isDownloading = downloadingCluster === clusterUid;

                return (
                  <Grid item xs={12} sm={6} md={4} key={virtualCluster.metadata.uid}>
                    <Card 
                      className={classes.card}
                      onClick={() => handleCardClick(virtualCluster)}
                    >
                      <CardContent className={classes.cardContent}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6" className={classes.clusterName}>
                            {virtualCluster.metadata.title || virtualCluster.metadata.name}
                          </Typography>
                          {hasUpdates && (
                            <Tooltip title="Profile updates available">
                              <NewReleasesIcon color="secondary" />
                            </Tooltip>
                          )}
                        </Box>
                        
                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Project:
                          </Typography>
                          {projectName && projectSystemEntities.has(projectName) ? (
                            <Link 
                              to={`/catalog/${projectSystemEntities.get(projectName)!.metadata.namespace || 'default'}/system/${projectSystemEntities.get(projectName)!.metadata.name}`}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              {projectName}
                            </Link>
                          ) : (
                            <Typography variant="body2">
                              {projectName || 'N/A'}
                            </Typography>
                          )}
                        </Box>

                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Status:
                          </Typography>
                          <Box className={classes.statusContainer}>
                            {getStatusComponent(state)}
                            <Typography variant="body2">{state}</Typography>
                          </Box>
                        </Box>

                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            CPU Quota:
                          </Typography>
                          <Typography variant="body2">{cpuQuota}</Typography>
                        </Box>

                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Memory Quota:
                          </Typography>
                          <Typography variant="body2">{memoryQuota}</Typography>
                        </Box>

                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Host Cluster:
                          </Typography>
                          {hostClusterId && hostClusterEntities.has(hostClusterId) ? (
                            <Link 
                              to={`/catalog/${hostClusterEntities.get(hostClusterId)!.metadata.namespace || 'default'}/resource/${hostClusterEntities.get(hostClusterId)!.metadata.name}`}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              {hostClusterName}
                            </Link>
                          ) : (
                            <Typography variant="body2" noWrap>
                              {hostClusterName}
                            </Typography>
                          )}
                        </Box>

                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Cluster Group:
                          </Typography>
                          {clusterGroupId && clusterGroupEntities.has(clusterGroupId) ? (
                            <Link 
                              to={`/catalog/${clusterGroupEntities.get(clusterGroupId)!.metadata.namespace || 'default'}/resource/${clusterGroupEntities.get(clusterGroupId)!.metadata.name}`}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              {clusterGroupName}
                            </Link>
                          ) : (
                            <Typography variant="body2" noWrap>
                              {clusterGroupName}
                            </Typography>
                          )}
                        </Box>

                        <Box mt={2}>
                          <Chip label="Virtual Cluster" size="small" color="primary" />
                          <Chip label="Nested" size="small" style={{ marginLeft: 4 }} />
                        </Box>
                      </CardContent>
                      <CardActions className={classes.cardActions}>
                        <Link 
                          to={`/catalog/${virtualCluster.metadata.namespace || 'default'}/resource/${virtualCluster.metadata.name}/kubernetes-resources`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          View Details
                        </Link>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={isDownloading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                          onClick={(e) => handleDownloadKubeconfig(virtualCluster, e)}
                          disabled={isDownloading}
                        >
                          {isDownloading ? 'Downloading...' : 'Kubeconfig'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <TableContainer component={Paper} className={classes.tableContainer}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('name')}
                    >
                      <Box display="flex" alignItems="center">
                        Virtual Cluster Name
                        {renderSortIcon('name')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('project')}
                    >
                      <Box display="flex" alignItems="center">
                        Project
                        {renderSortIcon('project')}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('status')}
                    >
                      <Box display="flex" alignItems="center">
                        Status
                        {renderSortIcon('status')}
                      </Box>
                    </TableCell>
                    <TableCell className={classes.tableHeaderCellNonSortable}>
                      CPU Quota
                    </TableCell>
                    <TableCell className={classes.tableHeaderCellNonSortable}>
                      Memory Quota
                    </TableCell>
                    <TableCell className={classes.tableHeaderCellNonSortable}>
                      Host Cluster
                    </TableCell>
                    <TableCell className={classes.tableHeaderCellNonSortable}>
                      Cluster Group
                    </TableCell>
                    <TableCell className={classes.tableHeaderCellNonSortable}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedVirtualClusters.map(virtualCluster => {
                    const clusterUid = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
                    const projectName = virtualCluster.metadata.annotations?.[`${annotationPrefix}/project-name`];
                    const state = virtualCluster.metadata.annotations?.[`${annotationPrefix}/state`] || 'Unknown';
                    const hostClusterId = virtualCluster.metadata.annotations?.[`${annotationPrefix}/host-cluster-id`];
                    const clusterGroupId = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cluster-group-id`];
                    const hostClusterName = hostClusterId ? (hostClusterNames.get(hostClusterId) || hostClusterId.substring(0, 8)) : 'N/A';
                    const clusterGroupName = clusterGroupId ? (clusterGroupNames.get(clusterGroupId) || clusterGroupId.substring(0, 8)) : 'N/A';
                    
                    // CPU and Memory quotas
                    const cpuLimit = virtualCluster.metadata.annotations?.[`${annotationPrefix}/cpu-limit`];
                    const memoryLimit = virtualCluster.metadata.annotations?.[`${annotationPrefix}/memory-limit`];
                    const cpuQuota = cpuLimit ? `${(parseInt(cpuLimit) / 1000).toFixed(2)} cores` : 'N/A';
                    const memoryQuota = memoryLimit ? `${(parseInt(memoryLimit) / (1024 * 1024)).toFixed(2)} GiB` : 'N/A';
                    
                    const hasUpdates = clusterUid ? virtualClustersWithUpdates.has(clusterUid) : false;
                    const isDownloading = downloadingCluster === clusterUid;

                    return (
                      <TableRow key={virtualCluster.metadata.uid} className={classes.tableRow}>
                        <TableCell className={classes.tableCell}>
                          <Box display="flex" alignItems="center">
                            <Link to={`/catalog/${virtualCluster.metadata.namespace || 'default'}/resource/${virtualCluster.metadata.name}/kubernetes-resources`}>
                              {virtualCluster.metadata.title || virtualCluster.metadata.name}
                            </Link>
                            {hasUpdates && (
                              <Tooltip title="Profile updates available">
                                <NewReleasesIcon color="secondary" fontSize="small" style={{ marginLeft: 8 }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell className={classes.tableCell}>
                          {projectName && projectSystemEntities.has(projectName) ? (
                            <Link 
                              to={`/catalog/${projectSystemEntities.get(projectName)!.metadata.namespace || 'default'}/system/${projectSystemEntities.get(projectName)!.metadata.name}`}
                            >
                              {projectName}
                            </Link>
                          ) : (
                            projectName || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className={classes.tableCell}>
                          <Box className={classes.statusContainer}>
                            {getStatusComponent(state)}
                            <Typography variant="body2">{state}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell className={classes.tableCell}>{cpuQuota}</TableCell>
                        <TableCell className={classes.tableCell}>{memoryQuota}</TableCell>
                        <TableCell className={classes.tableCell}>
                          {hostClusterId && hostClusterEntities.has(hostClusterId) ? (
                            <Link 
                              to={`/catalog/${hostClusterEntities.get(hostClusterId)!.metadata.namespace || 'default'}/resource/${hostClusterEntities.get(hostClusterId)!.metadata.name}`}
                            >
                              {hostClusterName}
                            </Link>
                          ) : (
                            hostClusterName
                          )}
                        </TableCell>
                        <TableCell className={classes.tableCell}>
                          {clusterGroupId && clusterGroupEntities.has(clusterGroupId) ? (
                            <Link 
                              to={`/catalog/${clusterGroupEntities.get(clusterGroupId)!.metadata.namespace || 'default'}/resource/${clusterGroupEntities.get(clusterGroupId)!.metadata.name}`}
                            >
                              {clusterGroupName}
                            </Link>
                          ) : (
                            clusterGroupName
                          )}
                        </TableCell>
                        <TableCell className={classes.tableCell}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={isDownloading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                            onClick={() => handleDownloadKubeconfig(virtualCluster)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? 'Downloading...' : 'Kubeconfig'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Content>
    </Page>
  );
};
