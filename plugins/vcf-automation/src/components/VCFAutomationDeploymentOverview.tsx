import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { Grid, Text } from '@backstage/ui';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { viewDeploymentHistoryPermission } from '@terasky/backstage-plugin-vcf-automation-common';

export const VCFAutomationDeploymentOverview = () => {
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);
  const deploymentId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  const { allowed: hasViewPermission, loading: permissionLoading } = usePermission({
    permission: viewDeploymentHistoryPermission,
  });

  const { value: deploymentDetails, loading, error } = useAsync(async () => {
    if (!deploymentId || !hasViewPermission) {
      return undefined;
    }
    return await api.getDeploymentDetails(deploymentId, instanceName);
  }, [deploymentId, hasViewPermission, instanceName]);

  if (!deploymentId) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Text>No deployment ID found for this entity.</Text>
      </InfoCard>
    );
  }

  if (loading || permissionLoading) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Progress />
      </InfoCard>
    );
  }

  if (!hasViewPermission) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Text>You don't have permission to view deployment details.</Text>
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!deploymentDetails) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Text>No deployment details available.</Text>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="VCF Automation Deployment">
      <Grid.Root columns="12" gap="5">
        <Grid.Item colSpan="12">
          <Text variant="title-small" weight="bold">Deployment Information</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Name</Text>
          <Text>{deploymentDetails.name}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Status</Text>
          <Text>{deploymentDetails.status}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Created By</Text>
          <Text>{deploymentDetails.createdBy}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Created At</Text>
          <Text>
            {new Date(deploymentDetails.createdAt).toLocaleString()}
          </Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Last Updated By</Text>
          <Text>{deploymentDetails.lastUpdatedBy}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Last Updated At</Text>
          <Text>
            {new Date(deploymentDetails.lastUpdatedAt).toLocaleString()}
          </Text>
        </Grid.Item>
        <Grid.Item colSpan="12">
          <Text variant="title-small" weight="bold">Expenses</Text>
        </Grid.Item>
        <Grid.Item colSpan="3">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Total</Text>
          <Text>
            {deploymentDetails.expense?.totalExpense || 'N/A'} {deploymentDetails.expense?.unit || ''}
          </Text>
        </Grid.Item>
        <Grid.Item colSpan="3">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Compute</Text>
          <Text>
            {deploymentDetails.expense?.computeExpense || 'N/A'} {deploymentDetails.expense?.unit || ''}
          </Text>
        </Grid.Item>
        <Grid.Item colSpan="3">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Storage</Text>
          <Text>
            {deploymentDetails.expense?.storageExpense || 'N/A'} {deploymentDetails.expense?.unit || ''}
          </Text>
        </Grid.Item>
        <Grid.Item colSpan="3">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Additional</Text>
          <Text>
            {deploymentDetails.expense?.additionalExpense || 'N/A'} {deploymentDetails.expense?.unit || ''}
          </Text>
        </Grid.Item>
      </Grid.Root>
    </InfoCard>
  );
}; 