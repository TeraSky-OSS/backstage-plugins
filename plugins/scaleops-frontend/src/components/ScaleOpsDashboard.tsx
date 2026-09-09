import { useEffect, useState } from 'react';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { Table, TableColumn } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Box, Card, CardBody, Flex, Grid, Text } from '@backstage/ui';
// import './ScaleOpsDashboard.css';

interface Workload {
  id: string;
  clusterName: string;
  namespace: string;
  workloadName: string;
  type: string;
  policyName: string;
  auto: boolean;
  overridden: boolean;
  shouldBinPack: boolean;
  rolloutPolicyValue: string;
  cpuRequests: number;
  memRequests: number;
  priorityClassName: string;
  replicas: number;
  hasGPU: boolean;
  hasHpa: boolean;
  cpuRecommended: number;
  memRecommended: number;
  isUnderProvisioned: boolean;
  isOverProvisioned: boolean;
  savingsAvailable: number;
  activeSavings: number;
  overallAvailableSavings: number;
  oomCountLast24h: number;
  oomLastTimestamp: string;
  workloadErrors: string | null;
  hpaStatusWarnings: string | null;
}

interface AggregatedWorkload {
  id: string;
  totalCost: number;
  hourlyCost: number;
  spotHours: number;
  spotPercent: number;
  onDemandHours: number;
  onDemandPercent: number;
  savingsAvailable: number;
}

interface NetworkUsage {
  Name: string;
  Namespace: string;
  WorkloadType: string;
  totalCost: { total: number; egress: number; ingress: number };
  intraAZCost: { total: number; egress: number; ingress: number };
  crossAZCost: { total: number; egress: number; ingress: number };
  replicas: number;
  totalTraffic: { total: number; egress: number; ingress: number };
  intraAZTraffic: { total: number; egress: number; ingress: number };
  crossAZTraffic: { total: number; egress: number; ingress: number };
}

const formatBytes = (bytes: number | undefined | null): string => {
  if (bytes === undefined || bytes === null) return 'N/A';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(3)} GiB`;
  } 
    return `${(bytes / 1024 / 1024).toFixed(3)} MiB`;
  
};

const formatCost = (cost: number | undefined | null): string => {
  if (cost === undefined || cost === null) return 'N/A';
  return `$${cost.toFixed(3)}`;
};

const formatCpu = (millicores: number | undefined | null): string => {
  if (millicores === undefined || millicores === null) return 'N/A';
  return (millicores / 1000).toFixed(3);
};

const networkColumns: TableColumn<NetworkUsage>[] = [
  { title: 'Name', field: 'Name' },
  { title: 'Namespace', field: 'Namespace' },
  { title: 'Workload Type', field: 'WorkloadType' },
  { title: 'Total Cost', field: 'totalCost.total', render: rowData => formatCost(rowData.totalCost.total) },
  { title: 'Egress Cost', field: 'totalCost.egress', render: rowData => formatCost(rowData.totalCost.egress) },
  { title: 'Ingress Cost', field: 'totalCost.ingress', render: rowData => formatCost(rowData.totalCost.ingress) },
  { title: 'Total Traffic', field: 'totalTraffic.total', render: rowData => formatBytes(rowData.totalTraffic.total) },
  { title: 'Egress Traffic', field: 'totalTraffic.egress', render: rowData => formatBytes(rowData.totalTraffic.egress) },
  { title: 'Ingress Traffic', field: 'totalTraffic.ingress', render: rowData => formatBytes(rowData.totalTraffic.ingress) },
];

const AutomationConfigCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardBody>
      <Flex direction="column" gap="2">
        <Text variant="title-small" weight="bold">Automation Configuration</Text>
        <Text><strong>Automated:</strong> {workload.auto ? 'Yes' : 'No'}</Text>
        <Text><strong>Policy Name:</strong> {workload.policyName}</Text>
        <Text><strong>Overridden:</strong> {workload.overridden ? 'Yes' : 'No'}</Text>
        <Text><strong>Should Bin Pack:</strong> {workload.shouldBinPack ? 'Yes' : 'No'}</Text>
        <Text><strong>Rollout Policy Value:</strong> {workload.rolloutPolicyValue}</Text>
      </Flex>
    </CardBody>
  </Card>
);

const PotentialSavingsCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardBody>
      <Flex direction="column" gap="2">
        <Text variant="title-small" weight="bold">Potential Savings</Text>
        <Text><strong>Savings Available:</strong> {formatCost(workload.savingsAvailable)}</Text>
        <Text><strong>Active Savings:</strong> {formatCost(workload.activeSavings)}</Text>
        <Text><strong>Overall Available Savings:</strong> {formatCost(workload.overallAvailableSavings)}</Text>
      </Flex>
    </CardBody>
  </Card>
);

const ResourceConfigCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardBody>
      <Flex direction="column" gap="2">
        <Text variant="title-small" weight="bold">Resource Configuration</Text>
        <Text><strong>CPU Requests:</strong> {formatCpu(workload.cpuRequests)}</Text>
        <Text><strong>Memory Requests:</strong> {formatBytes(workload.memRequests)}</Text>
        <Text><strong>Priority Class Name:</strong> {workload.priorityClassName}</Text>
        <Text><strong>Replicas:</strong> {workload.replicas}</Text>
        <Text><strong>Has GPU:</strong> {workload.hasGPU ? 'Yes' : 'No'}</Text>
        <Text><strong>Has HPA:</strong> {workload.hasHpa ? 'Yes' : 'No'}</Text>
      </Flex>
    </CardBody>
  </Card>
);

const ResourceRecommendationsCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardBody>
      <Flex direction="column" gap="2">
        <Text variant="title-small" weight="bold">Resource Recommendations</Text>
        <Text><strong>CPU Recommended:</strong> {formatCpu(workload.cpuRecommended)}</Text>
        <Text><strong>Memory Recommended:</strong> {formatBytes(workload.memRecommended)}</Text>
        <Text><strong>Under Provisioned:</strong> {workload.isUnderProvisioned ? 'Yes' : 'No'}</Text>
        <Text><strong>Over Provisioned:</strong> {workload.isOverProvisioned ? 'Yes' : 'No'}</Text>
      </Flex>
    </CardBody>
  </Card>
);

const CostAnalysisCard = ({ aggregatedWorkload }: { aggregatedWorkload: AggregatedWorkload }) => (
  <Card className="fixed-height-card">
    <CardBody>
      <Flex direction="column" gap="2">
        <Text variant="title-small" weight="bold">7 Day Cost Analysis</Text>
        <Text><strong>Total Cost:</strong> {formatCost(aggregatedWorkload.totalCost)}</Text>
        <Text><strong>Hourly Cost:</strong> {formatCost(aggregatedWorkload.hourlyCost)}</Text>
        <Text><strong>Spot Hours:</strong> {aggregatedWorkload.spotHours}</Text>
        <Text><strong>Spot Percent:</strong> {aggregatedWorkload.spotPercent}</Text>
        <Text><strong>On-Demand Hours:</strong> {aggregatedWorkload.onDemandHours}</Text>
        <Text><strong>On-Demand Percent:</strong> {aggregatedWorkload.onDemandPercent}</Text>
        <Text><strong>Savings Available:</strong> {formatCost(aggregatedWorkload.savingsAvailable)}</Text>
      </Flex>
    </CardBody>
  </Card>
);

const ResourceErrorsCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardBody>
      <Flex direction="column" gap="2">
        <Text variant="title-small" weight="bold">Resource Errors</Text>
        <Text><strong>OOM Count Last 24h:</strong> {workload.oomCountLast24h}</Text>
        <Text><strong>OOM Last Timestamp:</strong> {workload.oomLastTimestamp}</Text>
        <Text><strong>Workload Errors:</strong> {workload.workloadErrors}</Text>
        <Text><strong>HPA Status Warnings:</strong> {workload.hpaStatusWarnings}</Text>
      </Flex>
    </CardBody>
  </Card>
);


const NetworkUsageTable = ({ networkUsage }: { networkUsage: NetworkUsage[] }) => (
  <Table
    title="Network Usage"
    options={{ search: false, paging: false }}
    columns={networkColumns}
    data={networkUsage}
  />
);

export const ScaleOpsDashboard = () => {
  const configApi = useApi(configApiRef);
  const identityApi = useApi(identityApiRef);
  const { entity } = useEntity();
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [selectedWorkload, setSelectedWorkload] = useState<Workload | null>(null);
  const [aggregatedWorkload, setAggregatedWorkload] = useState<AggregatedWorkload | null>(null);
  const [networkUsage, setNetworkUsage] = useState<NetworkUsage[]>([]);
  const [networkCostEnabled, setNetworkCostEnabled] = useState(false);

  const linkToDashboard = configApi.getOptionalBoolean('scaleops.linkToDashboard');
  const baseUrl = configApi.getOptionalString('scaleops.baseUrl');

  const columns: TableColumn<Workload>[] = [
    { title: 'Cluster Name', field: 'clusterName' },
    { title: 'Namespace', field: 'namespace' },
    { title: 'Workload Name', field: 'workloadName' },
    { title: 'Type', field: 'type' },
    ...(linkToDashboard ? [{
      title: 'Dashboard Link',
      field: 'dashboardLink',
      render: (rowData: Workload) => {
        const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
        const labelsQuery = labelSelector ? labelSelector.split(',').map((label: string) => `labels=${encodeURIComponent(label)}`).join('&') : '';
        const dashboardUrl = `${baseUrl}/cost-report/compute?searchTerms=${rowData.workloadName}&selectedTable=Workloads&groupByCluster=0&groupByNamespace=0&logicalLabel=AND&${labelsQuery}`;
        return <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">View Dashboard</a>;
      }
    }] : [])
  ];

  // Note: Authentication is now handled by the backend plugin
  // No need for frontend authentication logic

  useEffect(() => {
    const fetchWorkloads = async () => {
      const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
      if (!labelSelector) return;
    
      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
        // eslint-disable-next-line no-console
        console.error('No Backstage token available');
        return;
      }
      
      const backendUrl = configApi.getString('backend.baseUrl');
      const baseURL = `${backendUrl}/api/scaleops`;

      const response = await fetch(`${baseURL}/api/api/v1/dashboard/byNamespace?multiCluster=true&logicalLabel=AND`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token.token}` 
        },
        body: JSON.stringify({ label: labelSelector.split(',') }),
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error(`ScaleOps workloads request failed: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      if (!data.workloads || !Array.isArray(data.workloads) || data.workloads.length === 0) {
        setWorkloads([]);
        return;
      }
      const workloadsData = data.workloads.map((w: any) => ({
        id: w.id,
        clusterName: w.clusterName ?? 'N/A',
        namespace: w.namespace ?? 'N/A',
        workloadName: w.workloadName ?? 'N/A',
        type: w.type ?? 'N/A',
        policyName: w.policyName ?? 'N/A',
        auto: w.auto ?? 'N/A',
        overridden: w.overridden ?? false,
        shouldBinPack: w.shouldBinPack ?? false,
        rolloutPolicyValue: w.rollingStrategyDetails?.rolloutPolicyValue ?? 'N/A',
        cpuRequests: w.cpuRequests ?? 0,
        memRequests: w.memRequests ?? 0,
        priorityClassName: w.priorityClassName ?? 'N/A',
        replicas: w.replicas ?? 0,
        hasGPU: w.hasGPU ?? false,
        hasHpa: w.hasHpa ?? false,
        cpuRecommended: w.cpuRecommended ?? 0,
        memRecommended: w.memRecommended ?? 0,
        isUnderProvisioned: w.isUnderProvisioned ?? false,
        isOverProvisioned: w.isOverProvisioned ?? false,
        savingsAvailable: w.savingsAvailable ?? 0,
        activeSavings: w.activeSavings ?? 0,
        overallAvailableSavings: w.overallAvailableSavings ?? 0,
        oomCountLast24h: w.oomCountLast24h ?? 0,
        oomLastTimestamp: w.oomLastTimestamp ?? 'N/A',
        workloadErrors: w.workloadErrors ?? 'N/A',
        hpaStatusWarnings: w.hpaStatusWarnings ?? 'N/A',
      }));

      setWorkloads(workloadsData);
      setSelectedWorkload(workloadsData[0]);
    };

    fetchWorkloads();
  }, [configApi, entity, identityApi]);

  useEffect(() => {
    if (!selectedWorkload) return;

    const fetchAggregatedWorkload = async () => {
      const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
      if (!labelSelector) return;

      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
        // eslint-disable-next-line no-console
        console.error('No Backstage token available');
        return;
      }

      const backendUrl = configApi.getString('backend.baseUrl');
      const baseURL = `${backendUrl}/api/scaleops`;

      const response = await fetch(`${baseURL}/api/detailedCostReport/getWorkloads?multiCluster=true&range=7d`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Scaleops-Cluster': selectedWorkload.clusterName, 
          Authorization: `Bearer ${token.token}` 
        },
        body: JSON.stringify({
          clusterFilters: [selectedWorkload.clusterName],
          namespaces: [selectedWorkload.namespace],
          workloadTypes: [selectedWorkload.type],
          labels: labelSelector.split(','),
        }),
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error(`ScaleOps cost report request failed: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      const aggregatedWorkloadData = data.aggregatedWorkloads.find((w: any) => w.id.toLowerCase() === selectedWorkload.id.toLowerCase());
      setAggregatedWorkload(aggregatedWorkloadData);
    };

    fetchAggregatedWorkload();
  }, [selectedWorkload, configApi, entity, identityApi]);

  useEffect(() => {
    const checkNetworkCostEnabled = async () => {
      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
        // eslint-disable-next-line no-console
        console.error('No Backstage token available');
        return;
      }

      const backendUrl = configApi.getString('backend.baseUrl');
      const baseURL = `${backendUrl}/api/scaleops`;

      const response = await fetch(`${baseURL}/api/api/v1/networkCost/networkCostEnabled?multiCluster=true`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token.token}` 
        },
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error(`ScaleOps network cost check failed: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      if (selectedWorkload && data.networkCostEnabled[selectedWorkload.clusterName]) {
        setNetworkCostEnabled(true);
      } else {
        setNetworkCostEnabled(false);
      }
    };

    checkNetworkCostEnabled();
  }, [selectedWorkload, configApi, identityApi]);

  useEffect(() => {
    if (!selectedWorkload || !networkCostEnabled) return;

    const fetchNetworkUsage = async () => {
      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
        // eslint-disable-next-line no-console
        console.error('No Backstage token available');
        return;
      }

      const backendUrl = configApi.getString('backend.baseUrl');
      const baseURL = `${backendUrl}/api/scaleops`;

      const now = Date.now();
      const from = now - 24 * 60 * 60 * 1000; // 24 hours ago
      const to = now;
      const response = await fetch(`${baseURL}/api/api/v1/workload-network?name=${selectedWorkload.workloadName}&namespace=${selectedWorkload.namespace}&workloadType=${selectedWorkload.type}&from=${from}&to=${to}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Scaleops-Cluster': selectedWorkload.clusterName, 
          Authorization: `Bearer ${token.token}` 
        },
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error(`ScaleOps network usage request failed: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      setNetworkUsage(data.destinations);
    };

    fetchNetworkUsage();
  }, [selectedWorkload, networkCostEnabled, configApi, identityApi]);

  return (
    <>
      <Table
        title="Scaleops Workloads"
        options={{
          search: false,
          paging: false,
          rowStyle: (rowData: Workload) => ({
            backgroundColor: selectedWorkload && selectedWorkload.id === rowData.id ? 'var(--bui-bg-neutral-2)' : 'var(--bui-bg-app)',
            color: 'var(--bui-fg-primary)',
          }),
          headerStyle: {
            backgroundColor: 'var(--bui-bg-app)',
            color: 'var(--bui-fg-primary)',
          },
        }}
        columns={columns}
        data={workloads}
        onRowClick={(_, rowData) => rowData && setSelectedWorkload(rowData)}
      />
      <Box mt="5">
        {selectedWorkload && (
          <Grid.Root columns="12" gap="5">
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <AutomationConfigCard workload={selectedWorkload} />
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <ResourceConfigCard workload={selectedWorkload} />
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <ResourceRecommendationsCard workload={selectedWorkload} />
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <PotentialSavingsCard workload={selectedWorkload} />
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <ResourceErrorsCard workload={selectedWorkload} />
            </Grid.Item>
            {aggregatedWorkload && (
              <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                <CostAnalysisCard aggregatedWorkload={aggregatedWorkload} />
              </Grid.Item>
            )}
            {networkCostEnabled && networkUsage.length > 0 && (
              <Grid.Item colSpan="12">
                <NetworkUsageTable networkUsage={networkUsage} />
              </Grid.Item>
            )}
          </Grid.Root>
        )}
      </Box>
    </>
  );
};