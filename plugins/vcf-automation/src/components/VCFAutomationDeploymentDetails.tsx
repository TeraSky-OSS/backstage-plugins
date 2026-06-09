import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { vcfAutomationApiRef } from '../api/VcfAutomationClient';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
  Table,
  TableColumn,
  StructuredMetadataTable,
  Link,
} from '@backstage/core-components';
import { Grid, Typography } from '@material-ui/core';
import useAsync from 'react-use/lib/useAsync';
import { usePermission } from '@backstage/plugin-permission-react';
import { viewDeploymentHistoryPermission } from '@terasky/backstage-plugin-vcf-automation-common';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

type DeploymentEvent = {
  id: string;
  name: string;
  status: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  details: string;
  requestId: string;
  resourceIds: string[];
};

type DeploymentResource = {
  name: string;
  title: string;
  kind: string;
  type: string;
  namespace: string;
};

const eventColumns: TableColumn<DeploymentEvent>[] = [
  {
    title: 'Operation',
    field: 'name',
  },
  {
    title: 'Status',
    field: 'status',
  },
  {
    title: 'User',
    field: 'requestedBy',
  },
  {
    title: 'Created',
    field: 'createdAt',
    render: (row: DeploymentEvent) => new Date(row.createdAt).toLocaleString(),
  },
  {
    title: 'Last Updated',
    field: 'updatedAt',
    render: (row: DeploymentEvent) => new Date(row.updatedAt).toLocaleString(),
  },
  {
    title: 'Details',
    field: 'details',
  },
];

const resourceColumns: TableColumn<DeploymentResource>[] = [
  {
    title: 'Name',
    field: 'title',
    render: (row: DeploymentResource) => (
      <Link to={`/catalog/${row.namespace}/${row.kind.toLowerCase()}/${row.name}`}>
        {row.title || row.name}
      </Link>
    ),
  },
  {
    title: 'Type',
    field: 'type',
  },
];

const getEntityType = (entity: Entity): string => {
  const type = entity.spec?.type;
  if (typeof type === 'string') {
    return type;
  }
  if (typeof type === 'object' && type !== null) {
    return JSON.stringify(type);
  }
  return String(type || 'N/A');
};

export const VCFAutomationDeploymentDetails = () => {
  const { entity } = useEntity();
  const api = useApi(vcfAutomationApiRef);
  const catalogApi = useApi(catalogApiRef);
  const deploymentId = entity.metadata.name;
  const instanceName = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-instance'];

  const { allowed: hasViewPermission, loading: permissionLoading } = usePermission({
    permission: viewDeploymentHistoryPermission,
  });

  const { value: deploymentDetails, loading: detailsLoading, error: detailsError } = useAsync(async () => {
    if (!deploymentId || !hasViewPermission) {
      return undefined;
    }
    return await api.getDeploymentDetails(deploymentId, instanceName);
  }, [deploymentId, hasViewPermission, instanceName]);

  const { value: eventsResponse, loading: eventsLoading, error: eventsError } = useAsync(async () => {
    if (!deploymentId || !hasViewPermission) {
      return undefined;
    }
    const response = await api.getDeploymentEvents(deploymentId, instanceName);
    return response;
  }, [deploymentId, hasViewPermission, instanceName]);

  const { value: resources, loading: resourcesLoading, error: resourcesError } = useAsync(async () => {
    if (!deploymentId) {
      return undefined;
    }

    // Get all components that belong to this system
    const components = await catalogApi.getEntities({
      filter: {
        kind: 'Component',
        'spec.system': deploymentId,
      },
    });

    // Get all resources that belong to this system
    const resourceEntities = await catalogApi.getEntities({
      filter: {
        kind: 'Resource',
        'spec.system': deploymentId,
      },
    });

    // Combine and format the results
    const allResources: DeploymentResource[] = [
      ...components.items.map((component: Entity) => ({
        name: component.metadata.name,
        title: component.metadata.title || component.metadata.name,
        kind: component.kind,
        type: getEntityType(component),
        namespace: component.metadata.namespace || 'default',
      })),
      ...resourceEntities.items.map((resource: Entity) => ({
        name: resource.metadata.name,
        title: resource.metadata.title || resource.metadata.name,
        kind: resource.kind,
        type: getEntityType(resource),
        namespace: resource.metadata.namespace || 'default',
      })),
    ];

    return allResources;
  }, [deploymentId]);

  if (!deploymentId) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Typography>No deployment ID found for this entity.</Typography>
      </InfoCard>
    );
  }

  if (detailsLoading || eventsLoading || permissionLoading || resourcesLoading) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Progress />
      </InfoCard>
    );
  }

  if (!hasViewPermission) {
    return (
      <InfoCard title="VCF Automation Deployment">
        <Typography>You don't have permission to view deployment information.</Typography>
      </InfoCard>
    );
  }

  if (detailsError || eventsError || resourcesError) {
    return <ResponseErrorPanel error={detailsError ?? eventsError ?? resourcesError ?? new Error('Unknown error')} />;
  }

  const metadata: Record<string, any> = {
    'Basic Information': {
      Name: deploymentDetails?.name,
      Description: deploymentDetails?.description || 'No description',
      Status: deploymentDetails?.status,
      'Owner Type': deploymentDetails?.ownerType,
      'Owned By': deploymentDetails?.ownedBy,
      'Project ID': deploymentDetails?.projectId,
      'Blueprint ID': deploymentDetails?.blueprintId,
      'Organization ID': deploymentDetails?.orgId,
    },
    'Timing Information': {
      'Created By': deploymentDetails?.createdBy,
      'Created At': deploymentDetails?.createdAt ? new Date(deploymentDetails.createdAt).toLocaleString() : '',
      'Last Updated By': deploymentDetails?.lastUpdatedBy,
      'Last Updated At': deploymentDetails?.lastUpdatedAt ? new Date(deploymentDetails.lastUpdatedAt).toLocaleString() : '',
      'Lease Grace Period (Days)': deploymentDetails?.leaseGracePeriodDays,
    },
    'Expense Information': deploymentDetails?.expense ? {
      'Total Expense': deploymentDetails.expense.totalExpense !== undefined ? `${deploymentDetails.expense.totalExpense} ${deploymentDetails.expense.unit || ''}` : 'N/A',
      'Compute Expense': deploymentDetails.expense.computeExpense !== undefined ? `${deploymentDetails.expense.computeExpense} ${deploymentDetails.expense.unit || ''}` : 'N/A',
      'Storage Expense': deploymentDetails.expense.storageExpense !== undefined ? `${deploymentDetails.expense.storageExpense} ${deploymentDetails.expense.unit || ''}` : 'N/A',
      'Additional Expense': deploymentDetails.expense.additionalExpense !== undefined ? `${deploymentDetails.expense.additionalExpense} ${deploymentDetails.expense.unit || ''}` : 'N/A',
      'Last Updated': deploymentDetails.expense.lastUpdatedTime ? new Date(deploymentDetails.expense.lastUpdatedTime).toLocaleString() : 'N/A',
    } : 'No expense information available',
    'Input Parameters': deploymentDetails?.inputs || {},
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <InfoCard title="Deployment Details">
          <StructuredMetadataTable metadata={metadata} />
        </InfoCard>
      </Grid>
      <Grid item xs={12}>
        <InfoCard title="Deployment Resources">
          {resources && resources.length > 0 ? (
            <Table
              columns={resourceColumns}
              data={resources}
              options={{
                search: true,
                paging: true,
                pageSize: 10,
                padding: 'dense',
              }}
            />
          ) : (
            <Typography>No resources found for this deployment.</Typography>
          )}
        </InfoCard>
      </Grid>
      <Grid item xs={12}>
        <InfoCard title="Deployment Events">
          {eventsResponse?.content && eventsResponse.content.length > 0 ? (
            <Table
              columns={eventColumns}
              data={eventsResponse.content}
              options={{
                search: true,
                paging: true,
                pageSize: eventsResponse.pageable?.pageSize || 10,
                padding: 'dense',
              }}
            />
          ) : (
            <Typography>No deployment events available.</Typography>
          )}
        </InfoCard>
      </Grid>
    </Grid>
  );
}; 