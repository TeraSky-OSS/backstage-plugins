import { useEffect, useState } from 'react';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { Table, TableColumn } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useTheme, Card, CardContent, Typography, Grid, Box } from '@material-ui/core';
//import './ScaleOpsDashboard.css';

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
    <CardContent>
      <Typography variant="h6">Automation Configuration</Typography>
      <Typography><strong>Automated:</strong> {workload.auto ? 'Yes' : 'No'}</Typography>
      <Typography><strong>Policy Name:</strong> {workload.policyName}</Typography>
      <Typography><strong>Overridden:</strong> {workload.overridden ? 'Yes' : 'No'}</Typography>
      <Typography><strong>Should Bin Pack:</strong> {workload.shouldBinPack ? 'Yes' : 'No'}</Typography>
      <Typography><strong>Rollout Policy Value:</strong> {workload.rolloutPolicyValue}</Typography>
    </CardContent>
  </Card>
);

const PotentialSavingsCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardContent>
      <Typography variant="h6">Potential Savings</Typography>
      <Typography><strong>Savings Available:</strong> {formatCost(workload.savingsAvailable)}</Typography>
      <Typography><strong>Active Savings:</strong> {formatCost(workload.activeSavings)}</Typography>
      <Typography><strong>Overall Available Savings:</strong> {formatCost(workload.overallAvailableSavings)}</Typography>
    </CardContent>
  </Card>
);

const ResourceConfigCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardContent>
      <Typography variant="h6">Resource Configuration</Typography>
      <Typography><strong>CPU Requests:</strong> {formatCpu(workload.cpuRequests)}</Typography>
      <Typography><strong>Memory Requests:</strong> {formatBytes(workload.memRequests)}</Typography>
      <Typography><strong>Priority Class Name:</strong> {workload.priorityClassName}</Typography>
      <Typography><strong>Replicas:</strong> {workload.replicas}</Typography>
      <Typography><strong>Has GPU:</strong> {workload.hasGPU ? 'Yes' : 'No'}</Typography>
      <Typography><strong>Has HPA:</strong> {workload.hasHpa ? 'Yes' : 'No'}</Typography>
    </CardContent>
  </Card>
);

const ResourceRecommendationsCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardContent>
      <Typography variant="h6">Resource Recommendations</Typography>
      <Typography><strong>CPU Recommended:</strong> {formatCpu(workload.cpuRecommended)}</Typography>
      <Typography><strong>Memory Recommended:</strong> {formatBytes(workload.memRecommended)}</Typography>
      <Typography><strong>Under Provisioned:</strong> {workload.isUnderProvisioned ? 'Yes' : 'No'}</Typography>
      <Typography><strong>Over Provisioned:</strong> {workload.isOverProvisioned ? 'Yes' : 'No'}</Typography>
    </CardContent>
  </Card>
);

const CostAnalysisCard = ({ aggregatedWorkload }: { aggregatedWorkload: AggregatedWorkload }) => (
  <Card className="fixed-height-card">
    <CardContent>
      <Typography variant="h6">7 Day Cost Analysis</Typography>
      <Typography><strong>Total Cost:</strong> {formatCost(aggregatedWorkload.totalCost)}</Typography>
      <Typography><strong>Hourly Cost:</strong> {formatCost(aggregatedWorkload.hourlyCost)}</Typography>
      <Typography><strong>Spot Hours:</strong> {aggregatedWorkload.spotHours}</Typography>
      <Typography><strong>Spot Percent:</strong> {aggregatedWorkload.spotPercent}</Typography>
      <Typography><strong>On-Demand Hours:</strong> {aggregatedWorkload.onDemandHours}</Typography>
      <Typography><strong>On-Demand Percent:</strong> {aggregatedWorkload.onDemandPercent}</Typography>
      <Typography><strong>Savings Available:</strong> {formatCost(aggregatedWorkload.savingsAvailable)}</Typography>
    </CardContent>
  </Card>
);

const ResourceErrorsCard = ({ workload }: { workload: Workload }) => (
  <Card className="fixed-height-card">
    <CardContent>
      <Typography variant="h6">Resource Errors</Typography>
      <Typography><strong>OOM Count Last 24h:</strong> {workload.oomCountLast24h}</Typography>
      <Typography><strong>OOM Last Timestamp:</strong> {workload.oomLastTimestamp}</Typography>
      <Typography><strong>Workload Errors:</strong> {workload.workloadErrors}</Typography>
      <Typography><strong>HPA Status Warnings:</strong> {workload.hpaStatusWarnings}</Typography>
    </CardContent>
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
  const theme = useTheme();
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
  }, [configApi, entity]);

  useEffect(() => {
    if (!selectedWorkload) return;

    const fetchAggregatedWorkload = async () => {
      const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
      if (!labelSelector) return;

      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
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
      const data = await response.json();
      const aggregatedWorkloadData = data.aggregatedWorkloads.find((w: any) => w.id.toLowerCase() === selectedWorkload.id.toLowerCase());
      setAggregatedWorkload(aggregatedWorkloadData);
    };

    fetchAggregatedWorkload();
  }, [selectedWorkload, configApi, entity]);

  useEffect(() => {
    const checkNetworkCostEnabled = async () => {
      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
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
      const data = await response.json();
      if (selectedWorkload && data.networkCostEnabled[selectedWorkload.clusterName]) {
        setNetworkCostEnabled(true);
      } else {
        setNetworkCostEnabled(false);
      }
    };

    checkNetworkCostEnabled();
  }, [selectedWorkload, configApi]);

  useEffect(() => {
    if (!selectedWorkload || !networkCostEnabled) return;

    const fetchNetworkUsage = async () => {
      const token = await identityApi.getCredentials(); 
      
      if (!token.token) {
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
      const data = await response.json();
      setNetworkUsage(data.destinations);
    };

    fetchNetworkUsage();
  }, [selectedWorkload, networkCostEnabled, configApi]);

  return (
    <>
      <Table
        title="Scaleops Workloads"
        options={{
          search: false,
          paging: false,
          rowStyle: (rowData: Workload) => ({
            backgroundColor: selectedWorkload && selectedWorkload.id === rowData.id ? theme.palette.action.selected : theme.palette.background.default,
            color: theme.palette.text.primary,
          }),
          headerStyle: {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
        }}
        columns={columns}
        data={workloads}
        onRowClick={(_, rowData) => rowData && setSelectedWorkload(rowData)}
      />
      <Box mt={3}>
        {selectedWorkload && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box display="flex" flexDirection="column" height="100%">
                <AutomationConfigCard workload={selectedWorkload} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" flexDirection="column" height="100%">
                <ResourceConfigCard workload={selectedWorkload} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" flexDirection="column" height="100%">
                <ResourceRecommendationsCard workload={selectedWorkload} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" flexDirection="column" height="100%">
                <PotentialSavingsCard workload={selectedWorkload} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" flexDirection="column" height="100%">
                <ResourceErrorsCard workload={selectedWorkload} />
              </Box>
            </Grid>
            {aggregatedWorkload && (
              <Grid item xs={12} md={6}>
                <Box display="flex" flexDirection="column" height="100%">
                  <CostAnalysisCard aggregatedWorkload={aggregatedWorkload} />
                </Box>
              </Grid>
            )}
            {networkCostEnabled && networkUsage.length > 0 && (
              <Grid item xs={12}>
                <NetworkUsageTable networkUsage={networkUsage} />
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </>
  );
};