import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Divider,
  makeStyles,
} from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { listManagedResourceDefinitionsPermission } from '@terasky/backstage-plugin-crossplane-common';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { getAnnotationPrefix } from './annotationUtils';
import { getProviderClusterName, getProviderName } from './isCrossplaneProviderEntity';

const useStyles = makeStyles(theme => ({
  card: {
    minWidth: 300,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  statBox: {
    textAlign: 'center',
    padding: theme.spacing(1.5),
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dividerVertical: {
    width: 1,
    alignSelf: 'stretch',
    margin: theme.spacing(0, 1),
    backgroundColor: theme.palette.divider,
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: theme.spacing(0.5),
  },
  activeColor: {
    color: '#4caf50',
  },
  inactiveColor: {
    color: '#f44336',
  },
  namespacedColor: {
    color: '#2196f3',
  },
  clusterColor: {
    color: '#ff9800',
  },
}));

const CrossplaneMrdCard = () => {
  const { entity } = useEntity();
  const crossplaneApi = useApi(crossplaneApiRef);
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const annotationPrefix = getAnnotationPrefix(config);
  const { allowed: canListTemp } = usePermission({
    permission: listManagedResourceDefinitionsPermission,
  });
  const canList = enablePermissions ? canListTemp : true;
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    namespacedCount: number;
    clusterScopedCount: number;
    activeCount: number;
    inactiveCount: number;
  } | null>(null);

  useEffect(() => {
    if (!canList) return;

    const clusterName = getProviderClusterName(entity);
    const providerName = getProviderName(entity, annotationPrefix);

    if (!clusterName) return;

    setLoading(true);
    setError(null);

    crossplaneApi
      .getManagedResourceDefinitions(clusterName, providerName)
      .then(response => {
        setSummary({
          total: response.items.length,
          namespacedCount: response.namespacedCount,
          clusterScopedCount: response.clusterScopedCount,
          activeCount: response.activeCount,
          inactiveCount: response.inactiveCount,
        });
      })
      .catch(err => {
        setError(err?.message || 'Failed to load MRDs');
      })
      .finally(() => setLoading(false));
  }, [canList, crossplaneApi, entity, annotationPrefix]);

  if (!canList) {
    return (
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            You do not have permission to view Managed Resource Definitions.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={classes.card}>
      <CardHeader
        title="Managed Resource Definitions"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <Divider />
      <CardContent>
        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={32} />
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
        {!loading && !error && summary !== null && (
          <>
            <Box mb={2} textAlign="center">
              <Typography className={classes.statValue}>{summary.total}</Typography>
              <Typography className={classes.statLabel}>Total MRDs</Typography>
            </Box>
            <Divider />
            <Box mt={2} mb={1}>
              <Typography className={classes.sectionTitle}>By Scope</Typography>
              <Grid container>
                <Grid item xs={6}>
                  <Box className={classes.statBox}>
                    <Typography
                      className={classes.statValue}
                      style={{ color: '#2196f3' }}
                    >
                      {summary.namespacedCount}
                    </Typography>
                    <Typography className={classes.statLabel}>Namespaced</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box className={classes.statBox}>
                    <Typography
                      className={classes.statValue}
                      style={{ color: '#ff9800' }}
                    >
                      {summary.clusterScopedCount}
                    </Typography>
                    <Typography className={classes.statLabel}>Cluster Scoped</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            <Divider />
            <Box mt={2}>
              <Typography className={classes.sectionTitle}>By State</Typography>
              <Grid container>
                <Grid item xs={6}>
                  <Box className={classes.statBox}>
                    <Typography
                      className={classes.statValue}
                      style={{ color: '#4caf50' }}
                    >
                      {summary.activeCount}
                    </Typography>
                    <Typography className={classes.statLabel}>Active</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box className={classes.statBox}>
                    <Typography
                      className={classes.statValue}
                      style={{ color: '#f44336' }}
                    >
                      {summary.inactiveCount}
                    </Typography>
                    <Typography className={classes.statLabel}>Inactive</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CrossplaneMrdCard;
