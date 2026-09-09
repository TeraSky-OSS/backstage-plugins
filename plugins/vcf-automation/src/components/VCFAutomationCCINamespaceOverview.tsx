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
import { Badge, Box, Flex, Grid, Text } from '@backstage/ui';
import useAsync from 'react-use/lib/useAsync';

export const VCFAutomationCCINamespaceOverview = () => {
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
        <Text>No namespace data available.</Text>
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
      <Grid.Root columns="12" gap="5">
        <Grid.Item colSpan="12">
          <Box mb="4">
            <Text variant="title-small" weight="bold">Basic Information</Text>
          </Box>
          <StructuredMetadataTable metadata={basicInfo} />
        </Grid.Item>

        {status?.conditions && status.conditions.length > 0 && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Conditions</Text>
            </Box>
            <Box>
              {status.conditions.map((condition: any, index: number) => (
                <Flex key={index} align="center" gap="2" mb="2">
                  {renderStatusIcon(condition.status)}
                  <Badge style={condition.status === 'True' ? { color: 'var(--bui-fg-positive)' } : undefined}>
                    {`${condition.type}: ${condition.status}`}
                  </Badge>
                  <Text variant="body-small">
                    {condition.lastTransitionTime}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Grid.Item>
        )}

        {status?.vmClasses && status.vmClasses.length > 0 && (
          <Grid.Item colSpan={{ xs: '12', md: '6' }}>
            <Box mb="4">
              <Text variant="title-small" weight="bold">Available VM Classes</Text>
            </Box>
            <Flex gap="1" style={{ flexWrap: 'wrap' }}>
              {status.vmClasses.map((vmClass: any, index: number) => (
                <Badge key={index}>{vmClass.name}</Badge>
              ))}
            </Flex>
          </Grid.Item>
        )}

        {status?.storageClasses && status.storageClasses.length > 0 && (
          <Grid.Item colSpan={{ xs: '12', md: '6' }}>
            <Box mb="4">
              <Text variant="title-small" weight="bold">Storage Classes</Text>
            </Box>
            <Box>
              {status.storageClasses.map((storageClass: any, index: number) => (
                <Box key={index} mb="2">
                  <Badge>{storageClass.name}</Badge>
                  <Text variant="body-small" style={{ display: 'block' }}>
                    Limit: {storageClass.limit}
                  </Text>
                </Box>
              ))}
            </Box>
          </Grid.Item>
        )}

        {status?.zones && status.zones.length > 0 && (
          <Grid.Item colSpan="12">
            <Box mb="4">
              <Text variant="title-small" weight="bold">Resource Zones</Text>
            </Box>
            <Grid.Root columns="12" gap="5">
              {status.zones.map((zone: any, index: number) => (
                <Grid.Item colSpan={{ xs: '12', md: '6' }} key={index}>
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
                </Grid.Item>
              ))}
            </Grid.Root>
          </Grid.Item>
        )}
      </Grid.Root>
    </InfoCard>
  );
};