import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Grid, Tooltip, makeStyles } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview } from '@terasky/backstage-plugin-crossplane-common';
import { configApiRef } from '@backstage/core-plugin-api';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import { green, red } from '@material-ui/core/colors';

interface ExtendedKubernetesObject extends KubernetesObject {
    status?: {
        conditions?: Array<{ type: string, status: string, reason?: string, lastTransitionTime?: string, message?: string }>;
    };
    spec?: {
        resourceRef?: {
            apiVersion?: string;
            kind?: string;
            name?: string;
        };
        resourceRefs?: Array<any>;
    };
}

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
  
const CrossplaneOverviewCard = () => {
    const { entity } = useEntity();
    const crossplaneApi = useApi(crossplaneApiRef);
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const { allowed: canShowOverviewTemp } = usePermission({ permission: showOverview });
    const canShowOverview = enablePermissions ? canShowOverviewTemp : true;
    const [claim, setClaim] = useState<ExtendedKubernetesObject | null>(null);
    const [managedResourcesCount, setManagedResourcesCount] = useState<number>(0);
    const classes = useStyles();

    useEffect(() => {
        if (!canShowOverview) {
            return;
        }

        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
            const claimName = annotations['terasky.backstage.io/claim-name'];
            const claimGroup = annotations['terasky.backstage.io/claim-group'];
            const claimVersion = annotations['terasky.backstage.io/claim-version'];
            const claimPlural = annotations['terasky.backstage.io/claim-plural'];
            const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
            const namespace = labelSelector.split(',').find(s => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];
            const clusterOfClaim = annotations['backstage.io/managed-by-location'].split(": ")[1];
            if (!claimPlural || !claimGroup || !claimVersion || !namespace || !clusterOfClaim) {
                return;
            }

            try {
                const response = await crossplaneApi.getResourceGraph({
                    clusterName: clusterOfClaim,
                    namespace,
                    xrdName: claimName,
                    xrdId: claimName,
                    claimId: claimName,
                    claimName,
                    claimGroup,
                    claimVersion,
                    claimPlural,
                });

                const claimResource = response.resources.find(r => r.kind === annotations['terasky.backstage.io/claim-kind']);
                if (claimResource) {
                    setClaim(claimResource);
                }

                const compositeResource = response.resources.find(r => r.kind === annotations['terasky.backstage.io/composite-kind']);
                if (compositeResource) {
                    setManagedResourcesCount(compositeResource.spec?.resourceRefs?.length || 0);
                }
            } catch (error) {
                throw error;
            }
        };

        fetchResources();
    }, [crossplaneApi, entity, canShowOverview]);

    if (!canShowOverview) {
        return (
          <Card style={{ width: '450px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
          <CardContent>
            <Typography variant="h5" component="h1" align="center">
              Crossplane Overview
            </Typography>
          <Box m={2}>
            <Typography  gutterBottom>
              You don't have permissions to view claim resources
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
                <Typography variant="h6" gutterBottom>Crossplane Overview</Typography>
                {claim ? (
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Kind</Typography>
                                <Typography variant="body2">{claim.kind}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray', width: '350px' }}>Synced</Typography>
                                <Tooltip
                                    //placement="left-start"
                                    classes={{ tooltip: classes.customWidth }}
                                    title={renderConditionTooltip(claim.status?.conditions?.find((condition: any) => condition.type === 'Synced') || {})}
                                >
                                    <Typography variant="body2">
                                        {renderStatusIcon(claim.status?.conditions?.find((condition: any) => condition.type === 'Synced')?.status || 'Unknown')}
                                    </Typography>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Name</Typography>
                                <Typography variant="body2">{claim.metadata?.name}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Ready</Typography>
                                <Tooltip
                                    //placement="left-start"
                                    classes={{ tooltip: classes.customWidth }}
                                    title={renderConditionTooltip(claim.status?.conditions?.find((condition: any) => condition.type === 'Ready') || {})}
                                >
                                    <Typography variant="body2">
                                        {renderStatusIcon(claim.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status || 'Unknown')}
                                    </Typography>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: 'gray' }}>Namespace</Typography>
                                <Typography variant="body2">{claim.metadata?.namespace}</Typography>
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
                        </Grid>
                    </Box>
                ) : (
                    <Typography>Loading...</Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default CrossplaneOverviewCard;