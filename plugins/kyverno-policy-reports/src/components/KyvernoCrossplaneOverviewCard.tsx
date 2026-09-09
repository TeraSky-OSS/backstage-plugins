import { useEffect, useState } from 'react';
import { Box, Card, CardBody, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { RiErrorWarningLine, RiAlertLine, RiCheckboxCircleLine, RiSkipForwardLine, RiCloseCircleLine } from '@remixicon/react';
import { viewOverviewPermission, PolicyReport } from '@terasky/backstage-plugin-kyverno-common';
import { usePermission } from '@backstage/plugin-permission-react';
import { kyvernoApiRef } from '../api/KyvernoApi';
import styles from './KyvernoOverviewCard.module.css';

type ResultType = 'pass' | 'fail' | 'warn' | 'error' | 'skip';

const RESULT_META: Record<ResultType, { label: string; Icon: typeof RiErrorWarningLine; color: string }> = {
  error: { label: 'Error', Icon: RiErrorWarningLine, color: 'var(--bui-fg-negative)' },
  fail: { label: 'Fail', Icon: RiCloseCircleLine, color: 'var(--bui-fg-negative)' },
  warn: { label: 'Warn', Icon: RiAlertLine, color: 'var(--bui-fg-warning)' },
  skip: { label: 'Skip', Icon: RiSkipForwardLine, color: 'var(--bui-fg-announcement)' },
  pass: { label: 'Pass', Icon: RiCheckboxCircleLine, color: 'var(--bui-fg-positive)' },
};

const KyvernoCrossplaneOverviewCard = () => {
  const { entity } = useEntity();
  const kyvernoApi = useApi(kyvernoApiRef);
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kyverno.enablePermissions') ?? false;
  const canViewOverviewTemp = usePermission({ permission: viewOverviewPermission }).allowed;
  const canViewOverview = !enablePermissions ? canViewOverviewTemp : true;

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState({
    totalResources: 0,
    totalChecks: 0,
    totalPass: 0,
    totalFail: 0,
    totalError: 0,
    totalSkip: 0,
    totalWarn: 0,
  });
  const [policyReports, setPolicyReports] = useState<PolicyReport[]>([]);

  useEffect(() => {
    if (!canViewOverview) {
      setLoading(false);
      return;
    }
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const response = await kyvernoApi.getCrossplanePolicyReports({
          entity: {
            metadata: entity.metadata,
          },
        });

        const filteredReports = response.items;
        setPolicyReports(filteredReports);

        const totalChecks = filteredReports.reduce((acc, report) => acc + (report?.results?.length || 0), 0);
        const totalPass = filteredReports.reduce((acc, report) => acc + (report?.summary?.pass || 0), 0);
        const totalFail = filteredReports.reduce((acc, report) => acc + (report?.summary?.fail || 0), 0);
        const totalError = filteredReports.reduce((acc, report) => acc + (report?.summary?.error || 0), 0);
        const totalSkip = filteredReports.reduce((acc, report) => acc + (report?.summary?.skip || 0), 0);
        const totalWarn = filteredReports.reduce((acc, report) => acc + (report?.summary?.warn || 0), 0);

        setOverviewData({
          totalResources: filteredReports.length,
          totalChecks,
          totalPass,
          totalFail,
          totalError,
          totalSkip,
          totalWarn,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [kyvernoApi, entity, canViewOverview]);

  const renderTooltipContent = (type: ResultType) => {
    const relevantResults = policyReports.flatMap(report => report.results?.filter(result => result.result === type).map(result => ({
      ...result,
      kind: report.scope?.kind,
      name: report.scope?.name,
      namespace: report.metadata?.namespace,
    })) || []);
    if (relevantResults.length === 0) return null;

    return (
      <table className={styles.detailTable}>
        <thead>
          <tr>
            <th>Kind</th>
            <th>Name</th>
            <th>Namespace</th>
            <th>Policy</th>
            {type !== 'pass' && <th>Rule</th>}
            {type !== 'pass' && <th className={styles.messageCol}>Message</th>}
          </tr>
        </thead>
        <tbody>
          {relevantResults.map((result, index) => (
            <tr key={index}>
              <td>{result.kind || ''}</td>
              <td>{result.name || ''}</td>
              <td>{result.namespace || ''}</td>
              <td>{result.policy || ''}</td>
              {type !== 'pass' && <td>{result.rule || ''}</td>}
              {type !== 'pass' && <td className={styles.messageCol}>{result.message || ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderStat = (type: ResultType, count: number) => {
    const { label, Icon, color } = RESULT_META[type];
    const content = (
      <Box className={styles.metricBox}>
        <Icon style={{ color }} />
        <Text style={{ color }}>{label}: {count}</Text>
      </Box>
    );
    if (count === 0) return content;
    return (
      <TooltipTrigger key={type}>
        {content}
        <Tooltip className={styles.wideTooltip}>{renderTooltipContent(type)}</Tooltip>
      </TooltipTrigger>
    );
  };

  if (!canViewOverview) {
    return (
      <Card>
        <CardBody>
          <Text variant="title-medium" weight="bold" style={{ display: 'block' }}>
            Kyverno Policy Overview
          </Text>
          <Box mt="4">
            <Text variant="title-small" style={{ display: 'block' }}>
              You don't have permissions to view Kyverno Policy Reports
            </Text>
          </Box>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardBody>
        <Text variant="title-medium" weight="bold" style={{ display: 'block' }}>
          Kyverno Policy Overview
        </Text>
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center' }}>
            <Progress />
          </Box>
        ) : (
          <>
            <Text variant="title-small" style={{ display: 'block' }}>
              Kubernetes Resource Checked: {overviewData.totalResources}
            </Text>
            <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-2)' }}>
              Total Checks Run: {overviewData.totalChecks}
            </Text>
            <div className={styles.row}>
              {renderStat('error', overviewData.totalError)}
              {renderStat('fail', overviewData.totalFail)}
              {renderStat('warn', overviewData.totalWarn)}
            </div>
            <div className={styles.row}>
              {renderStat('skip', overviewData.totalSkip)}
              {renderStat('pass', overviewData.totalPass)}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default KyvernoCrossplaneOverviewCard;
