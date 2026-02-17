import { useEntity, useRelatedEntities, EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import {
  InfoCard,
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
} from '@material-ui/core';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import ComputerIcon from '@material-ui/icons/Computer';
import LayersIcon from '@material-ui/icons/Layers';

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
  clusterList: {
    paddingTop: 0,
  },
  clusterListItem: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
  },
  clusterIcon: {
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
}));

export const SpectroCloudClusterGroupCard = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);
  
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';
  
  const annotations = entity.metadata.annotations || {};
  const clusterGroupId = annotations[`${annotationPrefix}/cluster-group-id`];
  const scope = annotations[`${annotationPrefix}/scope`] || 'tenant';
  const projectName = annotations[`${annotationPrefix}/project-name`];
  const endpointType = annotations[`${annotationPrefix}/endpoint-type`] || 'N/A';
  
  // Get all dependent resources (clusters and profiles)
  const { entities: dependentEntities } = useRelatedEntities(entity, {
    type: 'dependsOn',
    kind: 'resource',
  });
  
  // Filter to get actual clusters (not profiles)
  const clusters = dependentEntities?.filter((e: Entity) => 
    e.spec?.type === 'spectrocloud-cluster' || 
    e.spec?.type === 'spectrocloud-virtual-cluster'
  ) || [];
  
  // Filter to get profile entities
  const profileEntities = dependentEntities?.filter((e: Entity) => 
    e.spec?.type === 'spectrocloud-cluster-profile'
  ) || [];
  
  // Get attached profiles from annotations (for display names and UIDs)
  const profileRefs = annotations[`${annotationPrefix}/cluster-profile-refs`];
  let profiles: Array<{name: string; uid: string}> = [];
  if (profileRefs) {
    try {
      profiles = JSON.parse(profileRefs);
    } catch (e) {
      // Ignore parse errors
    }
  }

  return (
    <InfoCard title="Cluster Group Overview">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Cluster Group ID:
            </Typography>
            <Typography variant="body2" className={classes.value}>
              {clusterGroupId || 'N/A'}
            </Typography>
          </Box>

          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Scope:
            </Typography>
            <Chip 
              label={scope} 
              size="small"
              className={classes.chip}
              color={scope === 'tenant' ? 'secondary' : 'default'}
            />
          </Box>

          {scope === 'project' && projectName && (
            <Box className={classes.infoRow}>
              <Typography variant="body2" className={classes.label}>
                Project:
              </Typography>
              <Typography variant="body2" className={classes.value}>
                {projectName}
              </Typography>
            </Box>
          )}

          <Box className={classes.infoRow}>
            <Typography variant="body2" className={classes.label}>
              Endpoint Type:
            </Typography>
            <Typography variant="body2" className={classes.value}>
              {endpointType}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
            <Box className={classes.infoRow}>
              <Typography variant="body2" className={classes.label}>
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  <ComputerIcon fontSize="small" />
                  Member Clusters ({clusters.length}):
                </Box>
              </Typography>
            {clusters.length > 0 ? (
              <List dense className={classes.clusterList}>
                {clusters.map((cluster: Entity) => (
                  <ListItem key={cluster.metadata.uid} className={classes.clusterListItem}>
                    <ListItemIcon className={classes.clusterIcon}>
                      <ComputerIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <EntityRefLink
                        entityRef={cluster}
                        title={cluster.metadata.title || cluster.metadata.name}
                        className={classes.entityLink}
                      />
                      <Chip 
                        label={cluster.spec?.type === 'spectrocloud-virtual-cluster' ? 'Virtual' : 'Physical'}
                        size="small"
                        className={classes.chip}
                        style={{ marginLeft: 8 }}
                      />
                    </ListItemText>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" className={classes.noResourceText}>
                No member clusters
              </Typography>
            )}
          </Box>

          {profiles.length > 0 && (
            <Box className={classes.infoRow} mt={2}>
              <Typography variant="body2" className={classes.label}>
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  <LayersIcon fontSize="small" />
                  Add-on Profiles ({profiles.length}):
                </Box>
              </Typography>
              <List dense className={classes.clusterList}>
                {profiles.map((profile) => {
                  // Find the matching profile entity by UID in annotations
                  const profileEntity = profileEntities.find((e: Entity) => 
                    e.metadata.annotations?.[`${annotationPrefix}/profile-id`] === profile.uid
                  );
                  
                  return (
                    <ListItem key={profile.uid} className={classes.clusterListItem}>
                      <ListItemIcon className={classes.clusterIcon}>
                        <LayersIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>
                        {profileEntity ? (
                          <EntityRefLink
                            entityRef={profileEntity}
                            defaultKind="resource"
                            className={classes.entityLink}
                          />
                        ) : (
                          <Typography variant="body2" className={classes.value}>
                            {profile.name}
                          </Typography>
                        )}
                      </ListItemText>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Grid>
      </Grid>

      <Divider className={classes.divider} />

      <Box>
        <Typography variant="body2" color="textSecondary">
          <Box component="span" fontWeight={600}>
            <GroupWorkIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Cluster Group
          </Box>
          : A logical grouping of clusters that can share configuration and policies
        </Typography>
      </Box>
    </InfoCard>
  );
};
