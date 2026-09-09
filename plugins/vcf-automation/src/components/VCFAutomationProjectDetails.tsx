import { useEntity, catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
  StructuredMetadataTable,
  Table,
  Link,
} from '@backstage/core-components';
import { Grid } from '@backstage/ui';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import { viewProjectDetailsPermission } from '@terasky/backstage-plugin-vcf-automation-common';
import { usePermission } from '@backstage/plugin-permission-react';
import { VcfProjectZone } from '../types';

type ProjectMember = {
  email: string;
  type: string;
};

type SystemDeployment = {
  name: string;
  title: string;
  owner: string;
  vmCount: number;
  resourceCount: number;
  entityRef: string;
};

export const VCFAutomationProjectDetails = () => {
  const { entity } = useEntity();
  const vcfAutomationApi = useApi(vcfAutomationApiRef);
  const catalogApi = useApi(catalogApiRef);
  const projectId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  const { allowed } = usePermission({
    permission: viewProjectDetailsPermission,
  });

  const { value: projectData, loading: projectLoading, error: projectError } = useAsync(async () => {
    if (!projectId || !allowed) return undefined;
    return await vcfAutomationApi.getProjectDetails(projectId, instanceName);
  }, [projectId, allowed, instanceName]);

  const { value: systemsData, loading: systemsLoading } = useAsync(async () => {
    if (!projectId || !allowed) return undefined;

    // Get all systems that belong to this project's domain
    const systems = await catalogApi.getEntities({
      filter: {
        kind: 'System',
        'spec.domain': projectId,
      },
    });

    const deployments = await Promise.all(
      systems.items.map(async (system) => {
        // Get VMs belonging to this system
        const vms = await catalogApi.getEntities({
          filter: {
            kind: 'Component',
            'spec.type': 'Cloud.vSphere.Machine',
            'spec.system': system.metadata.name,
          },
        });

        // Get other resources belonging to this system
        const resources = await catalogApi.getEntities({
          filter: {
            kind: 'Resource',
            'spec.system': system.metadata.name,
          },
        });

        const owner = system.spec?.owner;
        return {
          name: system.metadata.name,
          title: system.metadata.title || system.metadata.name,
          owner: typeof owner === 'string' ? owner : 'N/A',
          vmCount: vms.items.length,
          resourceCount: resources.items.length,
          entityRef: `/catalog/${system.metadata.namespace || 'default'}/system/${system.metadata.name}`,
        } as SystemDeployment;
      }),
    );

    return deployments;
  }, [projectId, allowed]);

  if (projectError) {
    return <ResponseErrorPanel error={projectError} />;
  }

  if (projectLoading || systemsLoading) {
    return <Progress />;
  }

  if (!projectId) {
    return <InfoCard title="No project ID found">This entity is not associated with a VCF project.</InfoCard>;
  }

  if (!allowed) {
    return <InfoCard title="Permission Denied">You don't have permission to view project details.</InfoCard>;
  }

  if (!projectData) {
    return <InfoCard title="No Data">No project details available.</InfoCard>;
  }

  const renderMemberTable = (members: ProjectMember[], title: string) => (
    <Grid.Item colSpan={{ xs: '12', md: '6' }}>
      <InfoCard title={title}>
        <Table
          columns={[
            { title: 'Email', field: 'email' },
            { title: 'Type', field: 'type' },
          ]}
          data={members}
          options={{ search: false, paging: false }}
        />
      </InfoCard>
    </Grid.Item>
  );

  return (
    <Grid.Root columns="12" gap="5">
      <Grid.Item colSpan="12">
        <InfoCard title="Project Overview">
          <StructuredMetadataTable
            metadata={{
              'Project Name': projectData.name,
              'Project ID': projectData.id,
              Description: projectData.description,
              'Organization ID': projectData.organizationId || projectData.orgId,
              'Operation Timeout': `${projectData.operationTimeout} seconds`,
              'Machine Naming Template': projectData.machineNamingTemplate || 'N/A',
              'Shared Resources': projectData.sharedResources ? 'Yes' : 'No',
            }}
          />
        </InfoCard>
      </Grid.Item>

      <Grid.Item colSpan="12">
        <InfoCard title="Project Deployments">
          <Table
            columns={[
              { 
                title: 'Name', 
                field: 'title',
                render: (row: SystemDeployment) => (
                  <Link to={row.entityRef}>{row.title}</Link>
                ),
              },
              { title: 'Owner', field: 'owner' },
              { 
                title: 'VMs', 
                field: 'vmCount',
                align: 'right',
              },
              { 
                title: 'Additional Resources', 
                field: 'resourceCount',
                align: 'right',
              },
            ]}
            data={systemsData || []}
            options={{
              search: true,
              paging: true,
            }}
          />
        </InfoCard>
      </Grid.Item>

      <Grid.Item colSpan="12">
        <InfoCard title="Project Members">
          <Grid.Root columns="12" gap="5">
            {renderMemberTable(projectData.administrators || [], 'Administrators')}
            {renderMemberTable(projectData.members || [], 'Members')}
            {renderMemberTable(projectData.viewers || [], 'Viewers')}
            {renderMemberTable(projectData.supervisors || [], 'Supervisors')}
            {projectData.users && projectData.users.length > 0 && renderMemberTable(projectData.users, 'Users')}
            {projectData.auditors && projectData.auditors.length > 0 && renderMemberTable(projectData.auditors, 'Auditors')}
          </Grid.Root>
        </InfoCard>
      </Grid.Item>

      {projectData.zones && projectData.zones.length > 0 && (
        <Grid.Item colSpan="12">
          <InfoCard title="Project Zones">
            <Table
              columns={[
                { title: 'Zone ID', field: 'zoneId' },
                { title: 'Priority', field: 'priority' },
                { 
                  title: 'Instances', 
                  field: 'instances',
                  render: (row: VcfProjectZone) => `${row.allocatedInstancesCount}/${row.maxNumberInstances || '∞'}`,
                },
                { 
                  title: 'Memory (MB)', 
                  field: 'memory',
                  render: (row: VcfProjectZone) => `${row.allocatedMemoryMB}/${row.memoryLimitMB || '∞'}`,
                },
                { 
                  title: 'CPU', 
                  field: 'cpu',
                  render: (row: VcfProjectZone) => `${row.allocatedCpu}/${row.cpuLimit || '∞'}`,
                },
                { 
                  title: 'Storage (GB)', 
                  field: 'storage',
                  render: (row: VcfProjectZone) => `${row.allocatedStorageGB}/${row.storageLimitGB || '∞'}`,
                },
              ]}
              data={projectData.zones}
              options={{
                search: true,
                paging: true,
              }}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {projectData.constraints && Object.keys(projectData.constraints).length > 0 && (
        <Grid.Item colSpan="12">
          <InfoCard title="Constraints">
            <StructuredMetadataTable
              metadata={projectData.constraints}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {projectData.customProperties && Object.keys(projectData.customProperties).length > 0 && (
        <Grid.Item colSpan="12">
          <InfoCard title="Custom Properties">
            <StructuredMetadataTable
              metadata={projectData.customProperties}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {projectData.properties && Object.keys(projectData.properties).length > 0 && (
        <Grid.Item colSpan="12">
          <InfoCard title="Properties">
            <StructuredMetadataTable
              metadata={projectData.properties}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {projectData.orgId && (
        <Grid.Item colSpan="12">
          <InfoCard title="Organization Information">
            <StructuredMetadataTable
              metadata={{
                'Organization ID': projectData.orgId,
                'Operation Timeout': projectData.operationTimeout ? `${projectData.operationTimeout} minutes` : 'Not configured',
              }}
            />
          </InfoCard>
        </Grid.Item>
      )}
    </Grid.Root>
  );
}; 