import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Grid, Tooltip, makeStyles } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview } from '@terasky/backstage-plugin-crossplane-common';
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

const CrossplaneV2OverviewCard = () => {
    const { entity } = useEntity();
    const kubernetesApi = useApi(kubernetesApiRef);
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const { allowed: canShowOverviewTemp } = usePermission({ permission: showOverview });
    const canShowOverview = enablePermissions ? canShowOverviewTemp : true;
    const [composite, setComposite] = useState<any | null>(null);
    const [managedResourcesCount, setManagedResourcesCount] = useState<number>(0);
    const classes = useStyles();

    useEffect(() => {
        if (!canShowOverview) {
            return;
        }
        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
            const plural = annotations['terasky.backstage.io/composite-plural'];
            const group = annotations['terasky.backstage.io/composite-group'];
            const version = annotations['terasky.backstage.io/composite-version'];
            const name = annotations['terasky.backstage.io/composite-name'];
            const clusterOfComposite = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const scope = annotations['terasky.backstage.io/crossplane-scope'];
            const namespace = entity.metadata.namespace || annotations['namespace'] || 'default';
            let url = '';
            if (scope === 'Namespaced') {
                url = `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${name}`;
            } else {
                url = `/apis/${group}/${version}/${plural}/${name}`;
            }
            if (!plural || !group || !version || !name || !clusterOfComposite) {
                return;
            }
            try {
                const response = await kubernetesApi.proxy({
                    clusterName: clusterOfComposite,
                    path: url,
                    init: { method: 'GET' },
                });
                const compositeResource = await response.json();
                setComposite(compositeResource);
                setManagedResourcesCount(compositeResource.spec?.crossplane?.resourceRefs?.length || 0);
            } catch (error) {
                // ignore
            }
        };
        fetchResources();
    }, [kubernetesApi, entity, canShowOverview]);

    if (!canShowOverview) {
        return (
          <Card style={{ width: '450px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
          <CardContent>
            <Typography variant="h5" component="h1" align="center">
              Crossplane Overview
            </Typography>
          <Box m={2}>
            <Typography  gutterBottom>
              You don't have permissions to view composite resources
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
                <Typography variant="h6" gutterBottom>Crossplane v2 Overview</Typography>
                {composite ? (
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Kind</Typography>
                                <Typography variant="body2">{composite.kind}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray', width: '350px' }}>Synced</Typography>
                                <Tooltip
                                    classes={{ tooltip: classes.customWidth }}
                                    title={renderConditionTooltip(composite.status?.conditions?.find((condition: any) => condition.type === 'Synced') || {})}
                                >
                                    <Typography variant="body2">
                                        {renderStatusIcon(composite.status?.conditions?.find((condition: any) => condition.type === 'Synced')?.status || 'Unknown')}
                                    </Typography>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Name</Typography>
                                <Typography variant="body2">{composite.metadata?.name}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Ready</Typography>
                                <Tooltip
                                    classes={{ tooltip: classes.customWidth }}
                                    title={renderConditionTooltip(composite.status?.conditions?.find((condition: any) => condition.type === 'Ready') || {})}
                                >
                                    <Typography variant="body2">
                                        {renderStatusIcon(composite.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status || 'Unknown')}
                                    </Typography>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Namespace</Typography>
                                <Typography variant="body2">{composite.metadata?.namespace}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Managed Resources</Typography>
                                <Typography variant="body2">{managedResourcesCount}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Cluster</Typography>
                                <Typography variant="body2">{entity.metadata?.annotations?.['backstage.io/managed-by-location'].split(": ")[1] || "Unknown" }</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Composition</Typography>
                                <Typography variant="body2">{entity.metadata?.annotations?.['terasky.backstage.io/composition-name'] || "Unknown" }</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>XR Scope</Typography>
                                <Typography variant="body2">{entity.metadata?.annotations?.['terasky.backstage.io/crossplane-scope'] || 'Unknown'}</Typography>
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

export default CrossplaneV2OverviewCard; 