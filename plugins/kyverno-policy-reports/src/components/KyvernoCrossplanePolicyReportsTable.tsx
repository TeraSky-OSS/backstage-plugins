import { useState, useEffect } from 'react';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { Alert, Badge, Box, Button, ButtonIcon, Flex, Text } from '@backstage/ui';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { RiCloseLine } from '@remixicon/react';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
// `useTheme` is kept narrowly to feed `react-syntax-highlighter`, a third-party library that
// needs a real JS style object, not a CSS custom property.
import { useTheme, Drawer } from '@material-ui/core';
import {
  StatusAborted,
  StatusError,
  StatusOK,
  StatusWarning,
  Table,
  TableColumn,
  CopyTextButton,
  Progress,
} from '@backstage/core-components';
import YAML from 'js-yaml';
import { saveAs } from 'file-saver';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {
  showKyvernoReportsPermission,
  viewPolicyYAMLPermission,
  PolicyReport,
  isDeprecatedPolicy,
  isDeprecatedPolicySource,
} from '@terasky/backstage-plugin-kyverno-common';
import { usePermission } from '@backstage/plugin-permission-react';
import { kyvernoApiRef } from '../api/KyvernoApi';
import styles from './KyvernoPolicyReportsTable.module.css';

const SOURCE_LABEL_MAP: Record<string, string> = {
  kyverno: 'ClusterPolicy / Policy',
  KyvernoValidatingPolicy: 'ValidatingPolicy',
  KyvernoNamespacedValidatingPolicy: 'NamespacedValidatingPolicy',
  KyvernoMutatingPolicy: 'MutatingPolicy',
  KyvernoNamespacedMutatingPolicy: 'NamespacedMutatingPolicy',
  KyvernoDeletingPolicy: 'DeletingPolicy',
  KyvernoNamespacedDeletingPolicy: 'NamespacedDeletingPolicy',
  KyvernoGeneratingPolicy: 'GeneratingPolicy',
  KyvernoNamespacedGeneratingPolicy: 'NamespacedGeneratingPolicy',
  KyvernoImageValidatingPolicy: 'ImageValidatingPolicy',
  KyvernoNamespacedImageValidatingPolicy: 'NamespacedImageValidatingPolicy',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'var(--bui-fg-negative)',
  critical: 'var(--bui-fg-negative)',
  medium: 'var(--bui-fg-warning)',
  low: 'var(--bui-fg-positive)',
  info: 'var(--bui-fg-announcement)',
};

const PolicyTypeChip = ({ source }: { source?: string }) => {
  if (!source) return null;
  const label = SOURCE_LABEL_MAP[source] ?? source;
  const color = isDeprecatedPolicySource(source) ? 'var(--bui-fg-warning)' : 'var(--bui-fg-announcement)';
  return <Badge style={{ color }}>{label}</Badge>;
};

const removeManagedFields = (resource: KubernetesObject) => {
  const resourceCopy = JSON.parse(JSON.stringify(resource)); // Deep copy the resource
  if (resourceCopy.metadata) {
    if (resourceCopy.metadata.managedFields) {
      delete resourceCopy.metadata.managedFields;
    }
    if (resourceCopy.metadata.annotations && resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) {
      delete resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"];
    }
  }
  return resourceCopy;
};

const StatusComponent = ({ status }: { status: string | undefined }) => {
  switch (status) {
    case 'pass':
      return <StatusOK>PASS</StatusOK>;
    case 'error':
      return <StatusError>ERROR</StatusError>;
    case 'fail':
      return <StatusError>FAIL</StatusError>;
    case 'skip':
      return <StatusAborted>SKIP</StatusAborted>;
    case 'warn':
      return <StatusWarning>WARN</StatusWarning>;
    default:
      return null;
  }
};

const SeverityComponent = ({ severity }: { severity?: string }) => {
  if (!severity || !SEVERITY_COLORS[severity]) return null;
  return <Badge style={{ color: SEVERITY_COLORS[severity] }}>{severity}</Badge>;
};

const KyvernoCrossplanePolicyReportsTable = () => {
  const { entity } = useEntity();
  const kyvernoApi = useApi(kyvernoApiRef);
  const [policyReports, setPolicyReports] = useState<PolicyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [policyYaml, setPolicyYaml] = useState<string | null>(null);
  const [isPolicyDeprecated, setIsPolicyDeprecated] = useState(false);
  const theme = useTheme();
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kyverno.enablePermissions') ?? false;
  const canSeeReportsTemp = usePermission({ permission: showKyvernoReportsPermission }).allowed;
  const canViewYamlTemp = usePermission({ permission: viewPolicyYAMLPermission }).allowed;

  const canSeeReports = !enablePermissions ? canSeeReportsTemp : true;
  const canViewYaml = !enablePermissions ? canViewYamlTemp : true;

  useEffect(() => {
    if (!canSeeReports) {
      setLoading(false);
      return;
    }

    const fetchPolicyReports = async () => {
      setLoading(true);
      try {
        const response = await kyvernoApi.getCrossplanePolicyReports({
          entity: {
            metadata: entity.metadata,
          },
        });
        setPolicyReports(response.items);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch policy reports:', error);
      }
      setLoading(false);
    };

    fetchPolicyReports();
  }, [kyvernoApi, entity, canSeeReports]);

  const handlePolicyClick = async (policyName: string, clusterName: string, namespace: string, source?: string) => {
    setDrawerOpen(true);
    setSelectedPolicy(policyName);
    setIsPolicyDeprecated(false);
    try {
      const response = await kyvernoApi.getPolicy({ clusterName, namespace, policyName, source });
      setPolicyYaml(YAML.dump(removeManagedFields(response.policy)));
      setIsPolicyDeprecated(isDeprecatedPolicy(response.policy as any));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch policy ${policyName}:`, error);
      setPolicyYaml(null);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedPolicy(null);
    setPolicyYaml(null);
    setIsPolicyDeprecated(false);
  };

  const handleDownloadYaml = () => {
    if (policyYaml && selectedPolicy) {
      const blob = new Blob([policyYaml], { type: 'text/yaml;charset=utf-8' });
      const fileName = `${selectedPolicy}.yaml`;
      saveAs(blob, fileName);
    }
  };

  const groupedReports = policyReports.reduce((acc: { [key: string]: PolicyReport[] }, report: PolicyReport) => {
    const { clusterName } = report;
    if (!acc[clusterName]) {
      acc[clusterName] = [];
    }
    acc[clusterName].push(report);
    return acc;
  }, {});

  const renderDetailPanel = (report: PolicyReport) => (
    <Box className={styles.detailPanel}>
      <Text weight="bold" variant="title-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        Policy Report Details
      </Text>
      <table className={styles.detailTable}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Result</th>
            <th>Policy</th>
            <th>Policy Type</th>
            <th>Severity</th>
            <th className={styles.messageCol}>Message</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {report.results?.map((result, index) => (
            <tr key={index}>
              <td>{result.category || ''}</td>
              <td><StatusComponent status={result.result} /></td>
              <td>
                <div className={styles.policyCell}>
                  {canViewYaml ? (
                    <Button
                      size="small"
                      variant="tertiary"
                      onPress={() => handlePolicyClick(result.policy, report.clusterName, report.metadata.namespace || '', result.source)}
                    >
                      {result.policy}
                    </Button>
                  ) : (
                    result.policy
                  )}
                  {isDeprecatedPolicySource(result.source) && (
                    <Badge style={{ color: 'var(--bui-fg-warning)' }}>deprecated</Badge>
                  )}
                </div>
              </td>
              <td><PolicyTypeChip source={result.source} /></td>
              <td><SeverityComponent severity={result.severity} /></td>
              <td className={styles.messageCol}>{result.message}</td>
              <td>{result.timestamp ? new Date(result.timestamp.seconds * 1000).toLocaleString() : ''}</td>
            </tr>
          )) || (
            <tr>
              <td colSpan={7}>No results found</td>
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  );

  if (!canSeeReports) {
    return (
      <Box p="4">
        <Text variant="title-medium" style={{ display: 'block' }}>
          You don't have permissions to view the Kyverno Policy Reports
        </Text>
      </Box>
    );
  }
  return (
    <Box p="4">
      <Text variant="title-medium" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        Policy Report Results
      </Text>
      {loading ? (
        <Progress />
      ) : (
        Object.keys(groupedReports).map(clusterName => {
          const columns: TableColumn<PolicyReport>[] = [
            { title: 'Type', field: 'scope.kind' },
            { title: 'Name', field: 'scope.name' },
            { title: 'Namespace', render: r => r.metadata.namespace || 'Cluster Scoped' },
            { title: 'Error Count', field: 'summary.error' },
            { title: 'Fail Count', field: 'summary.fail' },
            { title: 'Pass Count', field: 'summary.pass' },
            { title: 'Skip Count', field: 'summary.skip' },
            { title: 'Warn Count', field: 'summary.warn' },
          ];
          const data = groupedReports[clusterName]
            .filter(report => report.metadata && report.scope?.kind && report.scope?.name && report.summary);

          return (
            <Box key={clusterName} mb="6">
              <Text variant="title-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
                Cluster: {clusterName}
              </Text>
              <Table
                options={{ search: false, paging: false }}
                columns={columns}
                data={data}
                detailPanel={({ rowData }: { rowData: PolicyReport }) => renderDetailPanel(rowData)}
              />
            </Box>
          );
        })
      )}
      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
        <div style={{ width: '50vw', padding: 'var(--bui-space-4)' }}>
          <ButtonIcon aria-label="Close" icon={<RiCloseLine />} onPress={handleCloseDrawer} />
          {policyYaml && selectedPolicy && (
            <>
              {isPolicyDeprecated && (
                <Alert
                  status="warning"
                  description="This policy uses the deprecated Kyverno Policy/ClusterPolicy API (kyverno.io/v1). Consider migrating to the new policy types (policies.kyverno.io/v1)."
                  style={{ marginBottom: 'var(--bui-space-4)' }}
                />
              )}
              <Flex justify="between" align="center" mb="4">
                <CopyTextButton text={policyYaml} aria-label="Copy policy YAML to clipboard" />
                <Button variant="primary" onPress={handleDownloadYaml}>
                  Download YAML
                </Button>
              </Flex>
              <SyntaxHighlighter language="yaml" style={theme.palette.type === 'dark' ? dark : docco}>
                {policyYaml}
              </SyntaxHighlighter>
            </>
          )}
        </div>
      </Drawer>
    </Box>
  );
};

export default KyvernoCrossplanePolicyReportsTable;
