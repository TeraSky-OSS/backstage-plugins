import { useEntity } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  StructuredMetadataTable,
  StatusOK,
  StatusError,
  StatusPending,
  Table,
  TableColumn,
} from '@backstage/core-components';
import { Card, CardBody, Flex, Grid, Text } from '@backstage/ui';

interface VMClass {
  name: string;
}

interface StorageClass {
  name: string;
  limit: string;
}

interface Zone {
  name: string;
  cpuLimit: string;
  cpuReservation: string;
  memoryLimit: string;
  memoryReservation: string;
}

interface Condition {
  type: string;
  status: string;
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

export const VCFAutomationCCINamespaceDetails = () => {
  const { entity } = useEntity();

  const resourceProperties = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-properties'];
  const supervisorNamespaceData = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-supervisor-namespace-data'];
  const namespaceEndpoint = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-namespace-endpoint'];
  const namespacePhase = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-cci-namespace-phase'];
  const resourceState = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-state'];
  const syncStatus = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-sync-status'];
  const createdAt = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-created-at'];
  const origin = entity.metadata.annotations?.['terasky.backstage.io/vcf-automation-resource-origin'];

  const isStandalone = origin === 'SUPERVISOR_NAMESPACE';
  
  // For standalone namespaces, use supervisor namespace data; for deployment-managed, use resource properties
  let namespaceData = null;
  if (isStandalone && supervisorNamespaceData) {
    try {
      namespaceData = JSON.parse(supervisorNamespaceData);
    } catch (e) {
      // Keep null if parsing fails
    }
  } else if (resourceProperties) {
    try {
      namespaceData = JSON.parse(resourceProperties);
    } catch (e) {
      // Keep null if parsing fails
    }
  }

  if (!namespaceData) {
    return (
      <InfoCard title={`CCI Supervisor Namespace Details${isStandalone ? ' (Standalone)' : ''}`}>
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
    'Namespace Name': namespaceData.name || 'Unknown',
    'Resource ID': namespaceData.id || 'Unknown',
    'Resource Link': namespaceData.resourceLink || 'Not available',
    'Phase': namespacePhase || status?.phase || 'Unknown',
    'State': resourceState || 'Unknown',
    'Sync Status': syncStatus || 'Unknown',
    'Created At': createdAt ? new Date(createdAt).toLocaleString() : 'Unknown',
    'Existing Resource': namespaceData.existing ? 'Yes' : 'No',
  };

  const infrastructureInfo = {
    'Infrastructure ID': metadata?.['infrastructure.cci.vmware.com/id'] || 'Not available',
    'Project ID': metadata?.['infrastructure.cci.vmware.com/project-id'] || 'Not available',
    'Endpoint URL': namespaceEndpoint || status?.namespaceEndpointURL || 'Not available',
  };

  const vmClassColumns: TableColumn<VMClass>[] = [
    { title: 'VM Class Name', field: 'name' },
  ];

  const storageClassColumns: TableColumn<StorageClass>[] = [
    { title: 'Storage Class Name', field: 'name' },
    { title: 'Limit', field: 'limit' },
  ];

  const zoneColumns: TableColumn<Zone>[] = [
    { title: 'Zone Name', field: 'name' },
    { title: 'CPU Limit', field: 'cpuLimit' },
    { title: 'CPU Reservation', field: 'cpuReservation' },
    { title: 'Memory Limit', field: 'memoryLimit' },
    { title: 'Memory Reservation', field: 'memoryReservation' },
  ];

  const conditionColumns: TableColumn<Condition>[] = [
    {
      title: 'Status',
      field: 'status',
      render: (rowData) => (
        <Flex align="center" gap="2">
          {renderStatusIcon(rowData.status)}
          <span>{rowData.status}</span>
        </Flex>
      ),
    },
    { title: 'Type', field: 'type' },
    { title: 'Last Transition', field: 'lastTransitionTime' },
    { title: 'Reason', field: 'reason' },
    { title: 'Message', field: 'message' },
  ];

  return (
    <Grid.Root columns="12" gap="5">
      <Grid.Item colSpan="12">
        <InfoCard title="Basic Information">
          <StructuredMetadataTable metadata={basicInfo} />
        </InfoCard>
      </Grid.Item>

      <Grid.Item colSpan="12">
        <InfoCard title="Infrastructure Details">
          <StructuredMetadataTable metadata={infrastructureInfo} />
        </InfoCard>
      </Grid.Item>

      {status?.conditions && status.conditions.length > 0 && (
        <Grid.Item colSpan="12">
          <InfoCard title="Namespace Conditions">
            <Table
              columns={conditionColumns}
              data={status.conditions}
              options={{
                search: true,
                paging: false,
                padding: 'dense',
              }}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {status?.vmClasses && status.vmClasses.length > 0 && (
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <InfoCard title="Available VM Classes">
            <Table
              columns={vmClassColumns}
              data={status.vmClasses}
              options={{
                search: true,
                paging: status.vmClasses.length > 10,
                pageSize: 10,
                padding: 'dense',
              }}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {status?.storageClasses && status.storageClasses.length > 0 && (
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <InfoCard title="Storage Classes">
            <Table
              columns={storageClassColumns}
              data={status.storageClasses}
              options={{
                search: true,
                paging: false,
                padding: 'dense',
              }}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {status?.zones && status.zones.length > 0 && (
        <Grid.Item colSpan="12">
          <InfoCard title="Resource Zones">
            <Table
              columns={zoneColumns}
              data={status.zones}
              options={{
                search: true,
                paging: false,
                padding: 'dense',
              }}
            />
          </InfoCard>
        </Grid.Item>
      )}

      {status && (
        <Grid.Item colSpan="12">
          <InfoCard title="Namespace Status Summary">
            <Grid.Root columns="12" gap="4">
              <Grid.Item colSpan={{ xs: '12', sm: '6', md: '3' }}>
                <Card>
                  <CardBody>
                    <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
                      Phase
                    </Text>
                    <Text variant="title-large" weight="bold" style={{ display: 'block' }}>
                      {status.phase || 'Unknown'}
                    </Text>
                  </CardBody>
                </Card>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6', md: '3' }}>
                <Card>
                  <CardBody>
                    <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
                      VM Classes
                    </Text>
                    <Text variant="title-large" weight="bold" style={{ display: 'block' }}>
                      {status.vmClasses?.length || 0}
                    </Text>
                  </CardBody>
                </Card>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6', md: '3' }}>
                <Card>
                  <CardBody>
                    <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
                      Storage Classes
                    </Text>
                    <Text variant="title-large" weight="bold" style={{ display: 'block' }}>
                      {status.storageClasses?.length || 0}
                    </Text>
                  </CardBody>
                </Card>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6', md: '3' }}>
                <Card>
                  <CardBody>
                    <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
                      Zones
                    </Text>
                    <Text variant="title-large" weight="bold" style={{ display: 'block' }}>
                      {status.zones?.length || 0}
                    </Text>
                  </CardBody>
                </Card>
              </Grid.Item>
            </Grid.Root>
          </InfoCard>
        </Grid.Item>
      )}
    </Grid.Root>
  );
};