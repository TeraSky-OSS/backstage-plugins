import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Grid, Tooltip, makeStyles } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview } from '@terasky/backstage-plugin-kro-common';
import { configApiRef } from '@backstage/core-plugin-api';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import { green, red } from '@material-ui/core/colors';

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
  customWidth: {
    maxWidth: 500,
  },
  noMaxWidth: {
    maxWidth: 'none',
  },
}));

const KroOverviewCard = () => {
  const { entity } = useEntity();
  const kubernetesApi = useApi(kubernetesApiRef);
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const { allowed: canShowOverviewTemp } = usePermission({ permission: showOverview });
  const canShowOverview = enablePermissions ? canShowOverviewTemp : true;
  const [rgd, setRgd] = useState<any | null>(null);
  const [instance, setInstance] = useState<any | null>(null);
  const classes = useStyles();

  useEffect(() => {
    if (!canShowOverview) {
      return;
    }
    const fetchResources = async () => {
      const annotations = entity.metadata.annotations || {};
      const rgdName = annotations['terasky.backstage.io/kro-rgd-name'];
      const rgdId = annotations['terasky.backstage.io/kro-rgd-id'];
      const clusterName = annotations['backstage.io/managed-by-location'].split(": ")[1];
      const namespace = entity.metadata.namespace || annotations['namespace'] || 'default';

      if (!rgdName || !rgdId || !clusterName) {
        return;
      }

      try {
        // Fetch the RGD
        const response = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/kro.run/v1alpha1/resourcegraphdefinitions/${rgdName}`,
          init: { method: 'GET' },
        });
        const rgdResource = await response.json();
        setRgd(rgdResource);

        // Fetch the instance
        const instanceResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/kro.run/v1alpha1/namespaces/${namespace}/applications/${entity.metadata.name}`,
          init: { method: 'GET' },
        });
        const instanceResource = await instanceResponse.json();
        setInstance(instanceResource);
      } catch (error) {
        console.error('Failed to fetch RGD:', error);
      }
    };
    fetchResources();
  }, [kubernetesApi, entity, canShowOverview]);

  if (!canShowOverview) {
    return (
      <Card style={{ width: '450px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
        <CardContent>
          <Typography variant="h5" component="h1" align="center">
            KRO Overview
          </Typography>
          <Box m={2}>
            <Typography gutterBottom>
              You don't have permissions to view KRO resources
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const renderStatusIcon = (status: string) => {
    return status === 'True' ? <CheckCircleIcon style={{ color: green[500] }} /> : <CancelIcon style={{ color: red[500] }} />;
  };

  const renderConditionTooltip = (condition: any) => (
    <Card style={{ width: '400px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
      <CardContent>
        <Typography variant="subtitle1">Condition: {condition.type}</Typography>
        <Typography variant="body2">Status: {condition.status}</Typography>
        <Typography variant="body2">Reason: {condition.reason}</Typography>
        <Typography variant="body2">Last Transition Time: {condition.lastTransitionTime}</Typography>
        <Typography variant="body2" style={{ wordWrap: 'break-word', maxWidth: '380px', alignSelf: 'center', }}>Message: {condition.message}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>KRO Overview</Typography>
        {rgd ? (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>RGD Name</Typography>
                <Typography variant="body2">{rgd.metadata?.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray', width: '350px' }}>RGD State</Typography>
                <Tooltip
                  classes={{ tooltip: classes.customWidth }}
                  title={renderConditionTooltip(rgd.status?.conditions?.find((condition: any) => condition.type === 'Ready') || {})}
                >
                  <Typography variant="body2">
                    {renderStatusIcon(rgd.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status || 'Unknown')}
                  </Typography>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Instance Name</Typography>
                <Typography variant="body2">{entity.metadata?.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Instance State</Typography>
                <Tooltip
                  classes={{ tooltip: classes.customWidth }}
                  title={renderConditionTooltip(instance?.status?.conditions?.find((condition: any) => condition.type === 'InstanceSynced') || {})}
                >
                  <Typography variant="body2">
                    {renderStatusIcon(instance?.status?.conditions?.find((condition: any) => condition.type === 'InstanceSynced')?.status || 'Unknown')}
                  </Typography>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Namespace</Typography>
                <Typography variant="body2">{entity.metadata?.namespace}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Cluster</Typography>
                <Typography variant="body2">{entity.metadata?.annotations?.['backstage.io/managed-by-location'].split(": ")[1] || "Unknown"}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>RGD API Version</Typography>
                <Typography variant="body2">{rgd.apiVersion}</Typography>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Typography>Loading...</Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default KroOverviewCard;