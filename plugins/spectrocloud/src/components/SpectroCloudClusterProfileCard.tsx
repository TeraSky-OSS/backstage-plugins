import React, { useState } from 'react';
import { useEntity, useRelatedEntities, EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import {
  InfoCard,
  Progress,
} from '@backstage/core-components';
import {
  Grid,
  Typography,
  Chip,
  makeStyles,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import LayersIcon from '@material-ui/icons/Layers';
import CloudIcon from '@material-ui/icons/Cloud';
import StorageIcon from '@material-ui/icons/Storage';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import ComputerIcon from '@material-ui/icons/Computer';

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
  typeChip: {
    backgroundColor: theme.palette.type === 'dark' ? '#1a237e' : '#e3f2fd',
    fontWeight: 600,
  },
  versionTable: {
    marginTop: theme.spacing(1),
  },
  tableHeader: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#f5f5f5',
  },
  currentVersionRow: {
    backgroundColor: theme.palette.type === 'dark' ? '#2d4a22' : '#e8f5e9',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#3d5a32' : '#d0e8d0',
    },
  },
  clickableRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#333' : '#f0f0f0',
    },
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  countBadge: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: '50%',
    padding: theme.spacing(0.5, 1),
    minWidth: 24,
    textAlign: 'center',
    fontWeight: 600,
  },
  expandCell: {
    width: 48,
    padding: theme.spacing(0, 1),
  },
  expandedRow: {
    backgroundColor: theme.palette.type === 'dark' ? '#252525' : '#fafafa',
  },
  clusterList: {
    paddingTop: 0,
    paddingBottom: theme.spacing(1),
  },
  clusterListItem: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
  },
  clusterIcon: {
    minWidth: 36,
    color: theme.palette.primary.main,
  },
  noClusterText: {
    padding: theme.spacing(1, 2),
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
}));

interface ProfileVersion {
  uid: string;
  version: string;
}

interface ClusterProfileRef {
  name: string;
  uid: string;  // This is the profile VERSION uid
}

interface ClusterInfo {
  entity: Entity;
  name: string;
  title: string;
}

const getProfileTypeIcon = (type: string) => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType === 'cluster' || lowerType === 'infra') {
    return <StorageIcon />;
  }
  if (lowerType === 'add-on' || lowerType === 'addon') {
    return <LayersIcon />;
  }
  return <CloudIcon />;
};

const getProfileTypeLabel = (type: string): string => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType === 'cluster') return 'Full Cluster Profile';
  if (lowerType === 'infra') return 'Infrastructure Profile';
  if (lowerType === 'add-on' || lowerType === 'addon') return 'Add-on Profile';
  return type || 'Unknown';
};

export const SpectroCloudClusterProfileCard = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  // Get related clusters (entities that depend on this profile)
  const { entities: relatedClusters, loading } = useRelatedEntities(entity, {
    type: 'dependencyOf',
  });

  // Get annotation prefix from config or use default
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const annotations = entity.metadata.annotations || {};

  // Extract profile information from annotations
  const profileUid = annotations[`${annotationPrefix}/profile-id`] || '';
  const scope = annotations[`${annotationPrefix}/scope`] || 'Unknown';
  const profileType = annotations[`${annotationPrefix}/profile-type`] || 'Unknown';
  const cloudType = annotations[`${annotationPrefix}/cloud-type`] || 'all';
  const latestVersion = annotations[`${annotationPrefix}/latest-version`] || annotations[`${annotationPrefix}/version`] || 'N/A';
  const profileStatus = annotations[`${annotationPrefix}/profile-status`] || 'unknown';

  // Parse profile versions from annotation
  let profileVersions: ProfileVersion[] = [];
  const versionsAnnotation = annotations[`${annotationPrefix}/profile-versions`];
  if (versionsAnnotation) {
    try {
      profileVersions = JSON.parse(versionsAnnotation);
    } catch {
      // Invalid JSON, fall back to current version
      if (profileUid && latestVersion !== 'N/A') {
        profileVersions = [{ uid: profileUid, version: latestVersion }];
      }
    }
  } else if (profileUid && latestVersion !== 'N/A') {
    // Fall back to just the current version
    profileVersions = [{ uid: profileUid, version: latestVersion }];
  }

  // Get clusters for a specific version
  const getClustersForVersion = (versionUid: string): ClusterInfo[] => {
    if (!relatedClusters) return [];
    
    const profileName = entity.metadata.title || entity.metadata.name;
    
    return relatedClusters
      .filter(cluster => {
        const clusterAnnotations = cluster.metadata.annotations || {};
        const profileRefsAnnotation = clusterAnnotations[`${annotationPrefix}/cluster-profile-refs`];
        
        if (!profileRefsAnnotation) return false;
        
        try {
          const profileRefs: ClusterProfileRef[] = JSON.parse(profileRefsAnnotation);
          // Match by version UID - the uid in the annotation is the profile VERSION uid
          return profileRefs.some(p => 
            p.uid === versionUid ||
            (p.name === profileName && p.uid === versionUid)
          );
        } catch {
          return false;
        }
      })
      .map(cluster => ({
        entity: cluster,
        name: cluster.metadata.name,
        title: cluster.metadata.title || cluster.metadata.name,
      }));
  };

  // Count clusters per version
  const getClusterCountByVersion = (versionUid: string): number => {
    return getClustersForVersion(versionUid).length;
  };

  // Toggle row expansion
  const toggleRowExpansion = (versionUid: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionUid)) {
        newSet.delete(versionUid);
      } else {
        newSet.add(versionUid);
      }
      return newSet;
    });
  };

  // Get total cluster count
  const totalClusterCount = relatedClusters?.length || 0;

  return (
    <InfoCard title="SpectroCloud Cluster Profile">
      <Grid container spacing={2}>
        {/* Profile Type */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Profile Type
          </Typography>
          <Box className={classes.iconContainer}>
            {getProfileTypeIcon(profileType)}
            <Chip
              label={getProfileTypeLabel(profileType)}
              size="small"
              className={classes.typeChip}
            />
          </Box>
        </Grid>

        {/* Cloud Type */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Cloud Type
          </Typography>
          <Typography variant="body1" className={classes.value}>
            {cloudType === 'all' ? 'All Clouds' : cloudType.toUpperCase()}
          </Typography>
        </Grid>

        {/* Scope */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Scope
          </Typography>
          <Chip
            label={scope}
            size="small"
            color={scope === 'tenant' ? 'secondary' : 'primary'}
          />
        </Grid>

        {/* Status */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Status
          </Typography>
          <Chip
            label={profileStatus}
            size="small"
            color={profileStatus === 'published' ? 'primary' : 'default'}
          />
        </Grid>

        {/* Latest Version */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Latest Version
          </Typography>
          <Typography variant="body1" className={classes.value}>
            {latestVersion}
          </Typography>
        </Grid>

        {/* Total Clusters Using */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Clusters Using This Profile
          </Typography>
          {loading ? (
            <Progress />
          ) : (
            <Typography variant="h6" className={classes.value}>
              {totalClusterCount}
            </Typography>
          )}
        </Grid>

        <Grid item xs={12}>
          <Divider className={classes.divider} />
        </Grid>

        {/* Version Table */}
        <Grid item xs={12}>
          <Typography variant="body2" className={classes.label}>
            Available Versions
          </Typography>
          {loading ? (
            <Progress />
          ) : profileVersions.length > 0 ? (
            <TableContainer component={Paper} className={classes.versionTable}>
              <Table size="small">
                <TableHead>
                  <TableRow className={classes.tableHeader}>
                    <TableCell className={classes.expandCell}></TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Version UID</TableCell>
                    <TableCell align="right">Clusters Using</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profileVersions.map((version) => {
                    const clusterCount = getClusterCountByVersion(version.uid);
                    const isCurrentVersion = version.version === latestVersion;
                    const isExpanded = expandedVersions.has(version.uid);
                    const clusters = getClustersForVersion(version.uid);
                    
                    return (
                      <React.Fragment key={version.uid}>
                        <TableRow 
                          className={`${isCurrentVersion ? classes.currentVersionRow : classes.clickableRow}`}
                          onClick={() => toggleRowExpansion(version.uid)}
                        >
                          <TableCell className={classes.expandCell}>
                            <IconButton size="small" aria-label="expand row">
                              {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            {version.version}
                            {isCurrentVersion && (
                              <Chip
                                label="latest"
                                size="small"
                                color="primary"
                                style={{ marginLeft: 8 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="textSecondary">
                              {version.uid}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <span className={classes.countBadge}>
                              {clusterCount}
                            </span>
                          </TableCell>
                        </TableRow>
                        <TableRow className={classes.expandedRow}>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box margin={1}>
                                {clusters.length > 0 ? (
                                  <List dense className={classes.clusterList}>
                                    {clusters.map((cluster) => (
                                      <ListItem 
                                        key={cluster.name} 
                                        className={classes.clusterListItem}
                                        component="div"
                                      >
                                        <ListItemIcon className={classes.clusterIcon}>
                                          <ComputerIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={
                                            <EntityRefLink
                                              entityRef={cluster.entity}
                                              className={classes.entityLink}
                                            >
                                              {cluster.title}
                                            </EntityRefLink>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                ) : (
                                  <Typography className={classes.noClusterText}>
                                    No clusters using this version
                                  </Typography>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No version information available
            </Typography>
          )}
        </Grid>
      </Grid>
    </InfoCard>
  );
};

export default SpectroCloudClusterProfileCard;
