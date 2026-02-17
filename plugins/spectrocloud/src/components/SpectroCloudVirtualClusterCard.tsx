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
import {
  Grid,
  Typography,
  Chip,
  makeStyles,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import LayersIcon from '@material-ui/icons/Layers';
import MemoryIcon from '@material-ui/icons/Memory';
import SpeedIcon from '@material-ui/icons/Speed';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import { saveAs } from 'file-saver';
import { spectroCloudApiRef } from '../api';
import {
  useCanDownloadKubeconfig,
} from './PermissionGuards';

const useStyles = makeStyles(theme => ({
  chip: {
    margin: theme.spacing(0.5),
  },
  infoRow: {
    marginBottom: theme.spacing(1),
  },
  label: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  value: {
    color: theme.palette.text.primary,
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  resourceList: {
    paddingTop: 0,
  },
  resourceListItem: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
  },
  resourceIcon: {
    minWidth: 36,
    color: theme.palette.primary.main,
  },
  noResourceText: {
    padding: theme.spacing(1, 0),
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
  entityLink: {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  progressBar: {
    marginTop: theme.spacing(1),
    height: 6,
    borderRadius: 3,
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

export const SpectroCloudVirtualClusterCard = () => {
  const classes = useStyles();
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
        <Alert severity="error" style={{ marginBottom: 16 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Basic Info Column */}
        <Grid item xs={12} md={6}>
          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Status
            </Typography>
            <Box className={classes.statusContainer}>
              {getStatusComponent(state)}
              <Typography variant="body2">{state}</Typography>
            </Box>
          </Box>

          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Type
            </Typography>
            <Box display="flex" style={{ gap: 8 }}>
              <Chip label="Virtual Cluster" size="small" color="primary" />
              <Chip label="Nested" size="small" />
            </Box>
          </Box>

          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Scope
            </Typography>
            <Chip 
              label={scope} 
              size="small"
              color={scope === 'tenant' ? 'secondary' : 'default'}
            />
          </Box>

          {scope === 'project' && projectSystem && (
            <Box className={classes.infoRow}>
              <Typography variant="body2" className={classes.label}>
                Project
              </Typography>
              <EntityRefLink
                entityRef={projectSystem}
                title={projectName || projectSystem.metadata.title || projectSystem.metadata.name}
                className={classes.entityLink}
              />
            </Box>
          )}

          <Divider className={classes.divider} />

          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Host Cluster
            </Typography>
            {hostCluster ? (
              <EntityRefLink
                entityRef={hostCluster}
                title={hostCluster.metadata.title || hostCluster.metadata.name}
                className={classes.entityLink}
              />
            ) : (
              <Typography variant="body2" color="textSecondary">
                Not found in catalog
              </Typography>
            )}
          </Box>

          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Cluster Group
            </Typography>
            {clusterGroup ? (
              <EntityRefLink
                entityRef={clusterGroup}
                title={clusterGroup.metadata.title || clusterGroup.metadata.name}
                className={classes.entityLink}
              />
            ) : (
              <Typography variant="body2" color="textSecondary">
                Not found in catalog
              </Typography>
            )}
          </Box>

          {canDownload && (
            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                startIcon={downloading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                onClick={handleDownloadKubeconfig}
                disabled={downloading}
                fullWidth
              >
                {downloading ? 'Downloading...' : 'Download Kubeconfig'}
              </Button>
            </Box>
          )}
        </Grid>

        {/* Metrics and Profiles Column */}
        <Grid item xs={12} md={6}>
          {/* Resource Metrics */}
          <Box mb={2}>
            <Typography variant="h6" gutterBottom>
              Resource Metrics
            </Typography>
            
            {/* CPU Metrics */}
            <Box mb={2}>
              <Box display="flex" alignItems="center" mb={0.5}>
                <SpeedIcon fontSize="small" style={{ marginRight: 8 }} />
                <Typography variant="body2" className={classes.label}>
                  CPU
                </Typography>
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Request
                  </Typography>
                  <Typography variant="body2" className={classes.value}>
                    {formatCpu(cpuMetrics?.request)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Limit
                  </Typography>
                  <Typography variant="body2" className={classes.value}>
                    {formatCpu(cpuMetrics?.limit)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Usage
                  </Typography>
                  <Typography variant="body2" className={classes.value}>
                    {formatCpu(cpuMetrics?.usage)}
                  </Typography>
                </Grid>
              </Grid>
              {cpuUsagePercent > 0 && (
                <Tooltip title={cpuUsagePercent > 100 ? `Exceeding limit by ${(cpuUsagePercent - 100).toFixed(1)}%` : `${cpuUsagePercent.toFixed(1)}% of limit`}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(cpuUsagePercent, 100)} 
                    className={classes.progressBar}
                    color={cpuUsagePercent > 100 ? 'secondary' : cpuUsagePercent > 80 ? 'secondary' : 'primary'}
                  />
                </Tooltip>
              )}
              {cpuUsagePercent > 100 && (
                <Typography variant="caption" color="error" style={{ marginTop: 4 }}>
                  ⚠️ Exceeding limit by {(cpuUsagePercent - 100).toFixed(1)}%
                </Typography>
              )}
            </Box>

            {/* Memory Metrics */}
            <Box>
              <Box display="flex" alignItems="center" mb={0.5}>
                <MemoryIcon fontSize="small" style={{ marginRight: 8 }} />
                <Typography variant="body2" className={classes.label}>
                  Memory
                </Typography>
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Request
                  </Typography>
                  <Typography variant="body2" className={classes.value}>
                    {formatMemory(memoryMetrics?.request)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Limit
                  </Typography>
                  <Typography variant="body2" className={classes.value}>
                    {formatMemory(memoryMetrics?.limit)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Usage
                  </Typography>
                  <Typography variant="body2" className={classes.value}>
                    {formatMemory(memoryMetrics?.usage)}
                  </Typography>
                </Grid>
              </Grid>
              {memoryUsagePercent > 0 && (
                <Tooltip title={memoryUsagePercent > 100 ? `Exceeding limit by ${(memoryUsagePercent - 100).toFixed(1)}%` : `${memoryUsagePercent.toFixed(1)}% of limit`}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(memoryUsagePercent, 100)} 
                    className={classes.progressBar}
                    color={memoryUsagePercent > 100 ? 'secondary' : memoryUsagePercent > 80 ? 'secondary' : 'primary'}
                  />
                </Tooltip>
              )}
              {memoryUsagePercent > 100 && (
                <Typography variant="caption" color="error" style={{ marginTop: 4 }}>
                  ⚠️ Exceeding limit by {(memoryUsagePercent - 100).toFixed(1)}%
                </Typography>
              )}
            </Box>
          </Box>

          <Divider className={classes.divider} />

          {/* Cluster Profiles */}
          {profiles.length > 0 && (
            <Box mt={2}>
              <Typography variant="body2" className={classes.label} gutterBottom>
                <LayersIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Cluster Profiles ({profiles.length})
              </Typography>
              <List dense className={classes.resourceList}>
                {profiles.map((profile: Entity) => (
                  <ListItem key={profile.metadata.uid} className={classes.resourceListItem}>
                    <ListItemIcon className={classes.resourceIcon}>
                      <LayersIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <EntityRefLink
                        entityRef={profile}
                        title={profile.metadata.title || profile.metadata.name}
                        className={classes.entityLink}
                      />
                    </ListItemText>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Grid>
      </Grid>
    </InfoCard>
  );
};
