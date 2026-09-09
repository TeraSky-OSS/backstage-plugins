import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { Badge, Flex, Grid, Text } from '@backstage/ui';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { viewProjectDetailsPermission } from '@terasky/backstage-plugin-vcf-automation-common';

export const VCFAutomationProjectOverview = () => {
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);
  const projectId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  const { allowed: hasViewPermission, loading: permissionLoading } = usePermission({
    permission: viewProjectDetailsPermission,
  });

  const { value: project, loading, error } = useAsync(async () => {
    if (!projectId || !hasViewPermission) return undefined;
    return await api.getProjectDetails(projectId, instanceName);
  }, [projectId, hasViewPermission, instanceName]);

  if (!projectId) {
    return (
      <InfoCard title="VCF Automation Project">
        <Text>No project ID found for this entity.</Text>
      </InfoCard>
    );
  }

  if (loading || permissionLoading) {
    return (
      <InfoCard title="VCF Automation Project">
        <Progress />
      </InfoCard>
    );
  }

  if (!hasViewPermission) {
    return (
      <InfoCard title="VCF Automation Project">
        <Text>You don't have permission to view project details.</Text>
      </InfoCard>
    );
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!project) {
    return (
      <InfoCard title="VCF Automation Project">
        <Text>No project details available.</Text>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="VCF Automation Project">
      <Grid.Root columns="12" gap="5">
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Name</Text>
          <Text>{project.name}</Text>
        </Grid.Item>
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Description</Text>
          <Text>{project.description || 'No description'}</Text>
        </Grid.Item>
        <Grid.Item colSpan="12">
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Administrators</Text>
          <Flex gap="1" style={{ flexWrap: 'wrap' }}>
            {project.administrators && project.administrators.length > 0 ? (
              project.administrators.map((admin: any, index: number) => (
                <Badge key={admin.email ? `${admin.email}-${admin.type}` : `admin-${index}`}>
                  {admin.email ? `${admin.email} (${admin.type || 'User'})` : admin.toString()}
                </Badge>
              ))
            ) : (
              <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
                No administrators configured
              </Text>
            )}
          </Flex>
        </Grid.Item>
        {project.zones && project.zones.length > 0 && (
          <Grid.Item colSpan="12">
            <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Resource Allocation</Text>
            {project.zones.map((zone: any) => (
              <Grid.Root columns="12" gap="5" key={zone.id}>
                <Grid.Item colSpan="12">
                  <Text variant="body-small">Zone: {zone.zoneId}</Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-small" style={{ display: 'block' }}>Instances</Text>
                  <Text>
                    {zone.allocatedInstancesCount} / {zone.maxNumberInstances || 'Unlimited'}
                  </Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-small" style={{ display: 'block' }}>Memory (MB)</Text>
                  <Text>
                    {zone.allocatedMemoryMB} / {zone.memoryLimitMB || 'Unlimited'}
                  </Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-small" style={{ display: 'block' }}>CPU</Text>
                  <Text>
                    {zone.allocatedCpu} / {zone.cpuLimit || 'Unlimited'}
                  </Text>
                </Grid.Item>
                <Grid.Item colSpan="4">
                  <Text variant="body-small" style={{ display: 'block' }}>Storage (GB)</Text>
                  <Text>
                    {zone.allocatedStorageGB} / {zone.storageLimitGB || 'Unlimited'}
                  </Text>
                </Grid.Item>
              </Grid.Root>
            ))}
          </Grid.Item>
        )}
        {project.sharedResources !== undefined && (
          <Grid.Item colSpan="6">
            <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Shared Resources</Text>
            <Text>{project.sharedResources ? 'Yes' : 'No'}</Text>
          </Grid.Item>
        )}
        {project.placementPolicy && (
          <Grid.Item colSpan="6">
            <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Placement Policy</Text>
            <Text>{project.placementPolicy}</Text>
          </Grid.Item>
        )}
        {project.orgId && (
          <Grid.Item colSpan="6">
            <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Organization ID</Text>
            <Text>{project.orgId}</Text>
          </Grid.Item>
        )}
        {project.operationTimeout !== undefined && (
          <Grid.Item colSpan="6">
            <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Operation Timeout</Text>
            <Text>{project.operationTimeout} minutes</Text>
          </Grid.Item>
        )}
      </Grid.Root>
    </InfoCard>
  );
}; 