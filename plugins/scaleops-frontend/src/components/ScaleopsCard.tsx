import { useEffect, useState } from 'react';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { Table, TableColumn, Link } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

interface Workload {
  clusterName: string;
  workloadName: string;
  type: string;
  policyName: string;
  auto: boolean;
  isUnderProvisioned: boolean;
  isOverProvisioned: boolean;
  totalCost: number;
  cpuRequests: number;
  memRequests: number;
  cpuRecommended: number;
  memRecommended: number;
  availableSavings: number;
  overallAvailableSavings: number;
  memoryDiffPercent: number;
  cpuDiffPercent: number;
}

const columns: TableColumn<Workload>[] = [
  { title: 'Cluster Name', field: 'clusterName' },
  { title: 'Workload Name', field: 'workloadName' },
  { title: 'Type', field: 'type' },
  { title: 'Automated', field: 'auto', type: 'boolean' },
  { title: 'Policy Name', field: 'policyName' },
  { title: 'Available Savings', field: 'availableSavings', type: 'string' },
  { title: 'Active Savings', field: 'activeSavings', type: 'string' },
  { title: 'Memory Requests (MB)', field: 'memRequests', type: 'numeric' },
  { title: 'Memory Recommended (MB)', field: 'memRecommended', type: 'numeric' },
  { title: 'CPU Requests', field: 'cpuRequests', type: 'numeric' },
  { title: 'CPU Recommended', field: 'cpuRecommended', type: 'numeric' },
  { title: 'Memory Diff (%)', field: 'memoryDiffPercent', type: 'numeric' },
  { title: 'CPU Diff (%)', field: 'cpuDiffPercent', type: 'numeric' },
];

export const ScaleopsCard = () => {
  const configApi = useApi(configApiRef);
  const identityApi = useApi(identityApiRef);
  const { entity } = useEntity();
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [linkToDashboard, setLinkToDashboard] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkloads = async () => {
      const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
      if (!labelSelector) return;

      const labelsQuery = labelSelector.split(',').map(label => `labels=${encodeURIComponent(label)}`).join('&');

      const token = await identityApi.getCredentials();
      
      if (!token.token) {
        console.error('No Backstage token available');
        return;
      }

      const backendUrl = configApi.getString('backend.baseUrl');
      const baseURL = `${backendUrl}/api/scaleops`;
      const scaleopsConfig = configApi.getConfig('scaleops');
      const currencyPrefix = scaleopsConfig?.getString('currencyPrefix');
      const dashboardURL = scaleopsConfig?.getString('baseUrl');
      setLinkToDashboard(scaleopsConfig?.getBoolean('linkToDashboard') || false);
      setDashboardUrl(`${dashboardURL}/cost-report/compute?searchTerms=&selectedTable=Workloads&groupByCluster=0&groupByNamespace=0&logicalLabel=AND&${labelsQuery}`);
      
      // Authentication is now handled by the backend plugin
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
      const workloadsData = data.workloads.map((w: any) => {
        const memRequests = w.memRequests ? (w.memRequests / 1024 / 1024).toFixed(2) : '0';
        const cpuRequests = w.cpuRequests ?? 'N/A';
        const memRecommended = w.memRecommended ? (w.memRecommended / 1024 / 1024).toFixed(2) : 'N/A';
        const cpuRecommended = w.cpuRecommended ?? 'N/A';

        const memoryDiffPercent = w.memRequests && w.memRequests !== 0 ? ((w.memoryDiff / w.memRequests) * 100).toFixed(2) : 'N/A';
        const cpuDiffPercent = w.cpuRequests && w.cpuRequests !== 0 ? ((w.cpuDiff / w.cpuRequests) * 100).toFixed(2) : 'N/A';

        return {
          clusterName: w.clusterName ?? 'N/A',
          workloadName: w.workloadName ?? 'N/A',
          type: w.type ?? 'N/A',
          policyName: w.policyName ?? 'N/A',
          auto: w.auto ?? 'N/A',
          cpuRequests,
          memRequests,
          cpuRecommended,
          memRecommended,
          availableSavings: currencyPrefix + (w.savingsAvailable)?.toFixed(2),
          activeSavings: currencyPrefix + (w.activeSavings)?.toFixed(2),
          memoryDiffPercent,
          cpuDiffPercent,
        };
      });

      setWorkloads(workloadsData);
    };

    fetchWorkloads();
  }, [configApi, identityApi, entity]);

  return (
    <>
      <Table
        title="Scaleops Workloads"
        options={{ search: false, paging: false }}
        columns={columns}
        data={workloads}
      />
      {linkToDashboard && dashboardUrl && (
        <Link to={dashboardUrl}>View In ScaleOps</Link>
      )}
    </>
  );
};

export const isScaleopsAvailable = (entity: Entity): boolean => {
  return Boolean(entity.metadata.annotations?.['backstage.io/kubernetes-label-selector']);
};