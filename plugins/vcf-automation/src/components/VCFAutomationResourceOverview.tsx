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
import { Flex, Grid, Text } from '@backstage/ui';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { showDeploymentResourcesDataPermission } from '@terasky/backstage-plugin-vcf-automation-common';

const statusTextColor = (state: string): string => {
  switch (state.toLowerCase()) {
    case 'success':
      return 'var(--bui-fg-positive)';
    case 'error':
      return 'var(--bui-fg-negative)';
    default:
      return 'var(--bui-fg-warning)';
  }
};

export const VCFAutomationResourceOverview = () => {
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);
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
        <Text>No resource ID or deployment ID found for this entity.</Text>
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
        <Text>You don't have permission to view resource details.</Text>
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!resource) {
    return (
      <InfoCard title="VCF Automation Resource">
        <Text>No resource details available.</Text>
      </InfoCard>
    );
  }

  const getStatusComponent = (state: string) => {
    switch (state.toUpperCase()) {
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
      <Grid.Root columns="12" gap="5">
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Name</Text>
          <Text>{resource.name}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Type</Text>
          <Text>{resource.type}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>State</Text>
          <Flex align="center" gap="1">
            {getStatusComponent(resource.state)}
            <Text weight="bold" style={{ color: statusTextColor(resource.state) }}>
              {resource.state}
            </Text>
          </Flex>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Sync Status</Text>
          <Flex align="center" gap="1">
            {getStatusComponent(resource.syncStatus)}
            <Text weight="bold" style={{ color: statusTextColor(resource.syncStatus) }}>
              {resource.syncStatus}
            </Text>
          </Flex>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Created At</Text>
          <Text>{new Date(resource.createdAt).toLocaleString()}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Region</Text>
          <Text>{resource.properties?.region || 'N/A'}</Text>
        </Grid.Item>
        <Grid.Item colSpan="12">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Resource Metrics</Text>
          <Text>
            {`CPU: ${resource.properties?.cpuCount || 'N/A'} cores, `}
            {`Memory: ${resource.properties?.memoryGB || 'N/A'} GB, `}
            {`Storage: ${resource.properties?.storage?.disks?.[0]?.capacityGb || 'N/A'} GB`}
          </Text>
        </Grid.Item>
        <Grid.Item colSpan="12">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Expense Information</Text>
          <Text>
            {`Total: $${resource.expense?.totalExpense?.toFixed(2) || 'N/A'}, `}
            {`Compute: $${resource.expense?.computeExpense?.toFixed(2) || 'N/A'}, `}
            {`Storage: $${resource.expense?.storageExpense?.toFixed(2) || 'N/A'}`}
          </Text>
        </Grid.Item>
      </Grid.Root>
    </InfoCard>
  );
}; 