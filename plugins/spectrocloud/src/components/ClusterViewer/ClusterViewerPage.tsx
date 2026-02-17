import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, Page, Content, Progress, Link } from '@backstage/core-components';
import { useApi, configApiRef, useRouteRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { clusterDeploymentRouteRef } from '../../routes';
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
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@material-ui/core';
import { Alert, ToggleButtonGroup, ToggleButton } from '@material-ui/lab';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import RefreshIcon from '@material-ui/icons/Refresh';
import NewReleasesIcon from '@material-ui/icons/NewReleases';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import ViewListIcon from '@material-ui/icons/ViewList';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import FilterListIcon from '@material-ui/icons/FilterList';
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
    justifyContent: 'space-between',
    padding: theme.spacing(2),
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  label: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
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
  clusterName: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
  },
  tableRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  tableCell: {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
  },
  tableHeaderCell: {
    border: `1px solid ${theme.palette.divider}`,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    padding: theme.spacing(2),
    borderBottom: `2px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
    },
    '& svg': {
      verticalAlign: 'middle',
      marginLeft: theme.spacing(0.5),
    },
  },
  tableHeaderCellNonSortable: {
    border: `1px solid ${theme.palette.divider}`,
    fontWeight: 700,
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    padding: theme.spacing(2),
    borderBottom: `2px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  viewToggle: {
    marginRight: theme.spacing(2),
  },
}));

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
  const classes = useStyles();
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
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
            const latestVersion = profileData.specSummary.version || versions[0]?.version;
            
            // Find the profile UID currently used by the cluster
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
            clustersWithUpdatesSet.add(clusterUid);
          }
        } catch (err) {
          // Silently ignore errors for individual clusters
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
  const getClusterInfo = useCallback((cluster: Entity) => {
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

  // Sort function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort clusters
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

    // Sort the filtered clusters
    return filtered.sort((a, b) => {
      const infoA = getClusterInfo(a);
      const infoB = getClusterInfo(b);
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = (a.metadata.title || a.metadata.name).localeCompare(
            b.metadata.title || b.metadata.name
          );
          break;
        case 'status':
          comparison = infoA.state.localeCompare(infoB.state);
          break;
        case 'cloudType':
          comparison = infoA.cloudType.localeCompare(infoB.cloudType);
          break;
        case 'scope':
          comparison = infoA.scope.localeCompare(infoB.scope);
          break;
        case 'project':
          comparison = infoA.projectName.localeCompare(infoB.projectName);
          break;
        case 'k8sVersion':
          comparison = infoA.k8sVersion.localeCompare(infoB.k8sVersion);
          break;
        case 'updates':
          const hasUpdatesA = clustersWithUpdates.has(infoA.clusterUid) ? 1 : 0;
          const hasUpdatesB = clustersWithUpdates.has(infoB.clusterUid) ? 1 : 0;
          comparison = hasUpdatesA - hasUpdatesB;
          break;
        default:
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clusters, selectedProject, selectedCloudType, selectedStatus, selectedK8sVersion, showOnlyWithUpdates, clustersWithUpdates, getClusterInfo, sortColumn, sortDirection]);

  const handleDownloadKubeconfig = async (cluster: Entity, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
        <Header title="Cluster Viewer" subtitle="View all SpectroCloud clusters" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error) {
    return (
      <Page themeId="tool">
        <Header title="Cluster Viewer" subtitle="View all SpectroCloud clusters" />
        <Content>
          <Alert severity="error">{error}</Alert>
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

  return (
    <Page themeId="tool">
      <Header 
        title="Cluster Viewer" 
        subtitle="View all SpectroCloud clusters"
      />
      <Content>
        <Box className={classes.root}>
          {/* Toolbar */}
          <Box className={classes.filterBar}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                <Badge badgeContent={activeFiltersCount} color="primary">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FilterListIcon />}
                    onClick={() => setFilterDialogOpen(true)}
                  >
                    Filters
                  </Button>
                </Badge>
                <Typography variant="body2" color="textSecondary">
                  {filteredClusters.length} / {clusters.length} clusters
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
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
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AddCircleIcon />}
                  onClick={() => window.location.href = clusterDeploymentRoute()}
                >
                  Create Cluster
                </Button>
                <Tooltip title="Refresh clusters">
                  <IconButton onClick={fetchClusters} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Cluster Display */}
          {filteredClusters.length === 0 ? (
            <Box className={classes.emptyState}>
              <Typography variant="h5" color="textSecondary" gutterBottom>
                No clusters found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {clusters.length === 0
                  ? 'No SpectroCloud clusters are available in the catalog.'
                  : 'No clusters match the selected filters. Try adjusting your filter criteria.'}
              </Typography>
            </Box>
          ) : viewMode === 'cards' ? (
            /* Card View */
            <Grid container spacing={3}>
              {filteredClusters.map((cluster) => {
                const info = getClusterInfo(cluster);
                const isDownloading = downloadingCluster === info.clusterUid;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={cluster.metadata.uid}>
                    <Card 
                      className={classes.card}
                      onClick={() => handleCardClick(cluster)}
                    >
                      <CardContent className={classes.cardContent}>
                        <Typography variant="h6" className={classes.clusterName}>
                          {cluster.metadata.title || cluster.metadata.name}
                        </Typography>

                        {/* Status */}
                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Status
                          </Typography>
                          <Box className={classes.statusContainer}>
                            {getStatusComponent(info.state)}
                            <Typography variant="body2">
                              {info.state}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Cloud Type */}
                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Cloud Type
                          </Typography>
                          <Chip 
                            label={info.cloudType.toUpperCase()} 
                            size="small" 
                            color="primary"
                          />
                        </Box>

                        {/* Scope */}
                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Scope
                          </Typography>
                          <Chip 
                            label={info.scope} 
                            size="small"
                            color={info.scope === 'tenant' ? 'secondary' : 'default'}
                          />
                        </Box>

                        {/* Project */}
                        {info.scope === 'project' && (
                          <Box className={classes.infoRow}>
                            <Typography variant="body2" className={classes.label}>
                              Project
                            </Typography>
                            <Typography variant="body2">
                              {info.projectName}
                            </Typography>
                          </Box>
                        )}

                        {/* Kubernetes Version */}
                        <Box className={classes.infoRow}>
                          <Typography variant="body2" className={classes.label}>
                            Kubernetes
                          </Typography>
                          <Typography variant="body2">
                            {info.k8sVersion}
                          </Typography>
                        </Box>

                        {/* Updates Available Indicator */}
                        {clustersWithUpdates.has(info.clusterUid) && (
                          <Box mt={2}>
                            <Chip 
                              icon={<NewReleasesIcon />}
                              label="Updates Available" 
                              size="small" 
                              color="secondary"
                            />
                          </Box>
                        )}
                      </CardContent>

                      <CardActions className={classes.cardActions}>
                        <Link 
                          to={`/catalog/${cluster.metadata.namespace || 'default'}/resource/${cluster.metadata.name}/kubernetes-resources`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          View Details
                        </Link>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={isDownloading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                          onClick={(e) => handleDownloadKubeconfig(cluster, e)}
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
            /* List View */
            <TableContainer component={Paper} className={classes.tableContainer}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('name')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Cluster Name
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('status')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Status
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('cloudType')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Cloud Type
                        {sortColumn === 'cloudType' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('scope')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Scope
                        {sortColumn === 'scope' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('project')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Project
                        {sortColumn === 'project' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('k8sVersion')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Kubernetes
                        {sortColumn === 'k8sVersion' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      className={classes.tableHeaderCell}
                      onClick={() => handleSort('updates')}
                      align="center"
                    >
                      <Box display="flex" alignItems="center" justifyContent="center">
                        Updates
                        {sortColumn === 'updates' && (
                          sortDirection === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell className={classes.tableHeaderCellNonSortable} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClusters.map((cluster) => {
                    const info = getClusterInfo(cluster);
                    const isDownloading = downloadingCluster === info.clusterUid;
                    
                    return (
                      <TableRow 
                        key={cluster.metadata.uid}
                        className={classes.tableRow}
                        onClick={() => handleCardClick(cluster)}
                      >
                        <TableCell className={classes.tableCell} align="center">
                          <Typography variant="body2" style={{ fontWeight: 600 }}>
                            {cluster.metadata.title || cluster.metadata.name}
                          </Typography>
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" style={{ gap: 8 }}>
                            {getStatusComponent(info.state)}
                            <Typography variant="body2">{info.state}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          <Chip label={info.cloudType} size="small" color="primary" />
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          <Chip 
                            label={info.scope} 
                            size="small"
                            color={info.scope === 'tenant' ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          {info.scope === 'project' ? info.projectName : '-'}
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">{info.k8sVersion}</TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          {clustersWithUpdates.has(info.clusterUid) && (
                            <Chip 
                              icon={<NewReleasesIcon />}
                              label="Available" 
                              size="small" 
                              color="secondary"
                            />
                          )}
                        </TableCell>
                        <TableCell className={classes.tableCell} align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={isDownloading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                            onClick={(e) => handleDownloadKubeconfig(cluster, e)}
                            disabled={isDownloading}
                          >
                            Kubeconfig
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Filter Dialog */}
          <Dialog 
            open={filterDialogOpen} 
            onClose={() => setFilterDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Filter Clusters</DialogTitle>
            <DialogContent>
              <Grid container spacing={3} style={{ paddingTop: 8 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Project"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    variant="outlined"
                  >
                    {projects.map(project => (
                      <MenuItem key={project} value={project}>
                        {project === 'all' ? 'All Projects' : project}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Cloud Type"
                    value={selectedCloudType}
                    onChange={(e) => setSelectedCloudType(e.target.value)}
                    variant="outlined"
                  >
                    {cloudTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {type === 'all' ? 'All Types' : type}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    variant="outlined"
                  >
                    {statuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status === 'all' ? 'All Statuses' : status}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Kubernetes Version"
                    value={selectedK8sVersion}
                    onChange={(e) => setSelectedK8sVersion(e.target.value)}
                    variant="outlined"
                  >
                    {k8sVersions.map(version => (
                      <MenuItem key={version} value={version}>
                        {version === 'all' ? 'All Versions' : version}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
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
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => {
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
                onClick={() => setFilterDialogOpen(false)} 
                color="primary"
                variant="contained"
              >
                Apply
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Content>
    </Page>
  );
};
