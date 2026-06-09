import { useMemo } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import {
  InfoCard,
  StructuredMetadataTable,
  StatusOK,
  StatusError,
  StatusPending,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { Grid, Typography, Chip, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import useAsync from 'react-use/lib/useAsync';

const useStyles = makeStyles(theme => ({
  statusChip: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
  },
  conditionChip: {
    margin: theme.spacing(0.25),
  },
}));

export const VCFAutomationCCINamespaceOverview = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);

  // Extract stable values from entity
  const deploymentId = entity.spec?.system as string;
  const resourceId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  // Parse annotation data once using useMemo
  const annotationData = useMemo(() => {
    const resourceProperties = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-properties'];
    const supervisorNamespaceData = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-supervisor-namespace-data'];
    const origin = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-origin'];
    
    let namespaceData = null;
    
    // For standalone namespaces, use supervisor namespace data
    if (supervisorNamespaceData && supervisorNamespaceData !== '{}') {
      try {
        namespaceData = JSON.parse(supervisorNamespaceData);
      } catch (e) {
        // Keep null if parsing fails
      }
    }
    
    // For deployment-managed namespaces, use resource properties
    if (!namespaceData && resourceProperties && resourceProperties !== '{}') {
      try {
        namespaceData = JSON.parse(resourceProperties);
      } catch (e) {
        // Keep null if parsing fails
      }
    }
    
    return {
      namespaceData,
      isStandalone: origin === 'SUPERVISOR_NAMESPACE',
      origin: origin || '',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.metadata.annotations]);

  // Check if we need to make API call
  const needsApiCall = !annotationData.namespaceData;

  // Fallback API call if annotation data is missing or empty
  const { value: apiNamespaceData, loading, error } = useAsync(async () => {
    if (!needsApiCall || !resourceId) {
      return null;
    }

    try {
      // For standalone namespaces, fetch supervisor namespace directly
      if (annotationData.isStandalone) {
        const response = await api.getSupervisorNamespace(resourceId, instanceName);
        return response;
      }
      
      // For deployment-managed namespaces, fetch from deployment resources
      if (!deploymentId) {
        return null;
      }
      
      const response = await api.getDeploymentResources(deploymentId, instanceName);
      let resources = null;
      if (response) {
        // Handle both direct array and paginated response with content wrapper
        if (Array.isArray(response)) {
          resources = response;
        } else if (response.content && Array.isArray(response.content)) {
          resources = response.content;
        }
      }
      if (resources) {
        return resources.find((r: any) => r.id === resourceId);
      }
      return null;
    } catch (apiError) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch namespace data:', apiError);
      return null;
    }
  }, [needsApiCall, deploymentId, resourceId, instanceName, annotationData.isStandalone]);

  // Determine final data to use
  const namespaceData = annotationData.namespaceData || apiNamespaceData;

  if (loading) {
    return (
      <InfoCard title={`CCI Supervisor Namespace${annotationData.isStandalone ? ' (Standalone)' : ''}`}>
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!namespaceData) {
    return (
              <InfoCard title={`CCI Supervisor Namespace${annotationData.isStandalone ? ' (Standalone)' : ''}`}>
        <Typography>No namespace data available.</Typography>
      </InfoCard>
    );
  }

  const { status, metadata } = namespaceData;

  const renderStatusIcon = (conditionStatus: string) => {
    switch (conditionStatus.toLowerCase()) {
      case 'true':
        return <StatusOK />;
      case 'false':
        return <StatusError />;
      default:
        return <StatusPending />;
    }
  };

  const basicInfo = {
    'Namespace Name': namespaceData.name,
    'Resource Link': namespaceData.resourceLink,
    'Phase': status?.phase || 'Unknown',
    'Endpoint URL': status?.namespaceEndpointURL || 'Not available',
    'Infrastructure ID': metadata?.['infrastructure.cci.vmware.com/id'] || 'Not available',
    'Project ID': metadata?.['infrastructure.cci.vmware.com/project-id'] || 'Not available',
  };

  return (
            <InfoCard title={`CCI Supervisor Namespace Overview${annotationData.isStandalone ? ' (Standalone)' : ''}`}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" className={classes.sectionTitle}>
            Basic Information
          </Typography>
          <StructuredMetadataTable metadata={basicInfo} />
        </Grid>

        {status?.conditions && status.conditions.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Conditions
            </Typography>
            <Box>
              {status.conditions.map((condition: any, index: number) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  {renderStatusIcon(condition.status)}
                  <Chip
                    label={`${condition.type}: ${condition.status}`}
                    size="small"
                    className={classes.conditionChip}
                    color={condition.status === 'True' ? 'primary' : 'default'}
                  />
                  <Typography variant="caption" style={{ marginLeft: 8 }}>
                    {condition.lastTransitionTime}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        )}

        {status?.vmClasses && status.vmClasses.length > 0 && (
          <Grid item xs={12} md={6}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Available VM Classes
            </Typography>
            <Box>
              {status.vmClasses.map((vmClass: any, index: number) => (
                <Chip
                  key={index}
                  label={vmClass.name}
                  size="small"
                  className={classes.statusChip}
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>
        )}

        {status?.storageClasses && status.storageClasses.length > 0 && (
          <Grid item xs={12} md={6}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Storage Classes
            </Typography>
            <Box>
              {status.storageClasses.map((storageClass: any, index: number) => (
                <Box key={index} mb={1}>
                  <Chip
                    label={storageClass.name}
                    size="small"
                    className={classes.statusChip}
                    color="secondary"
                  />
                  <Typography variant="caption" display="block">
                    Limit: {storageClass.limit}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        )}

        {status?.zones && status.zones.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Resource Zones
            </Typography>
            <Grid container spacing={2}>
              {status.zones.map((zone: any, index: number) => (
                <Grid item xs={12} md={6} key={index}>
                  <InfoCard title={zone.name}>
                    <StructuredMetadataTable
                      metadata={{
                        'CPU Limit': zone.cpuLimit,
                        'CPU Reservation': zone.cpuReservation,
                        'Memory Limit': zone.memoryLimit,
                        'Memory Reservation': zone.memoryReservation,
                      }}
                    />
                  </InfoCard>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}
      </Grid>
    </InfoCard>
  );
};