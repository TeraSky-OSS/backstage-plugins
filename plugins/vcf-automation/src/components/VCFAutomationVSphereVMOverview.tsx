import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
  StatusOK,
  StatusError,
  StatusPending,
} from '@backstage/core-components';
import { Grid, Typography, makeStyles } from '@material-ui/core';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { showDeploymentResourcesDataPermission } from '@terasky/backstage-plugin-vcf-automation-common';

const useStyles = makeStyles(theme => ({
  statusText: {
    fontWeight: 'bold',
    '&.success': {
      color: theme.palette.success.main,
    },
    '&.error': {
      color: theme.palette.error.main,
    },
    '&.pending': {
      color: theme.palette.warning.main,
    },
  },
}));

export const VCFAutomationVSphereVMOverview = () => {
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);
  const classes = useStyles();
  const deploymentId = entity.spec?.system || '';
  const resourceId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  const { allowed: hasViewPermission, loading: permissionLoading } = usePermission({
    permission: showDeploymentResourcesDataPermission,
  });

  const { value: resource, loading, error } = useAsync(async () => {
    if (!resourceId || !deploymentId || !hasViewPermission) return undefined;
    return await api.getVSphereVMDetails(deploymentId as string, resourceId, instanceName);
  }, [resourceId, deploymentId, hasViewPermission, instanceName]);

  if (!resourceId || !deploymentId) {
    return (
      <InfoCard title="VCF Automation Resource">
        <Typography>No resource ID or deployment ID found for this entity.</Typography>
      </InfoCard>
    );
  }

  if (loading || permissionLoading) {
    return (
      <InfoCard title="VCF Automation Resource">
        <Progress />
      </InfoCard>
    );
  }

  if (!hasViewPermission) {
    return (
      <InfoCard title="VCF Automation Resource">
        <Typography>You don't have permission to view resource details.</Typography>
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!resource) {
    return (
      <InfoCard title="VCF Automation Resource">
        <Typography>No resource details available.</Typography>
      </InfoCard>
    );
  }

  const getStatusComponent = (state: string) => {
    switch (state?.toUpperCase() || 'UNKNOWN') {
      case 'SUCCESS':
      case 'OK':
        return <StatusOK />;
      case 'ERROR':
      case 'FAILED':
        return <StatusError />;
      default:
        return <StatusPending />;
    }
  };

  return (
    <InfoCard title="VCF Automation Resource">
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Name</Typography>
          <Typography>{resource.name}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Type</Typography>
          <Typography>{resource.type}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">State</Typography>
          <Grid container spacing={1} alignItems="center">
            {getStatusComponent(resource.state)}
            <Typography className={`${classes.statusText} ${resource.state?.toLowerCase() || 'unknown'}`}>
              {resource.state}
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Sync Status</Typography>
          <Grid container spacing={1} alignItems="center">
            {getStatusComponent(resource.syncStatus)}
            <Typography className={`${classes.statusText} ${resource.syncStatus?.toLowerCase() || 'unknown'}`}>
              {resource.syncStatus}
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Created At</Typography>
          <Typography>{new Date(resource.createdAt).toLocaleString()}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Region</Typography>
          <Typography>{resource.properties?.region || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2">Resource Metrics</Typography>
          <Typography>
            {`CPU: ${resource.properties?.cpuCount || 'N/A'} cores, `}
            {`Memory: ${resource.properties?.memoryGB || 'N/A'} GB, `}
            {`Storage: ${resource.properties?.storage?.disks?.[0]?.capacityGb || 'N/A'} GB`}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2">Expense Information</Typography>
          <Typography>
            {`Total: $${resource.expense?.totalExpense?.toFixed(2) || 'N/A'}, `}
            {`Compute: $${resource.expense?.computeExpense?.toFixed(2) || 'N/A'}, `}
            {`Storage: $${resource.expense?.storageExpense?.toFixed(2) || 'N/A'}`}
          </Typography>
        </Grid>
      </Grid>
    </InfoCard>
  );
}; 