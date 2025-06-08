import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Tooltip, Table, TableBody, TableCell, TableRow, TableHead } from '@material-ui/core';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import ErrorIcon from '@material-ui/icons/Error';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import CancelIcon from '@material-ui/icons/Cancel';
import { viewOverviewPermission } from '@terasky/backstage-plugin-kyverno-common';
import { usePermission } from '@backstage/plugin-permission-react';

const useStyles = makeStyles((theme: any) => ({
  card: {
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    textAlign: 'left',
  },
  pos: {
    marginBottom: 12,
  },
  success: {
    color: theme.palette.success.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  info: {
    color: theme.palette.info.main,
  },
  icon: {
    verticalAlign: 'middle',
    marginRight: theme.spacing(1),
  },
  row: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  tooltip: {
    maxWidth: 'none',
    width: '1600px',
  },
  tableRow: {
    backgroundColor: theme.palette.background.paper,
  },
}));

interface PolicyReport {
  results?: Array<{
    source: string;
    policy: string;
    result: string;
    message?: string;
    rule?: string;
  }>;
  summary?: {
    pass: number;
    fail: number;
    warn: number;
    error: number;
    skip: number;
  };
  scope?: {
    kind: string;
    name: string;
    namespace?: string;
  };
}

const KyvernoCrossplaneOverviewCard = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { entity } = useEntity();
  const kubernetesApi = useApi(kubernetesApiRef);
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
        const annotations = entity.metadata.annotations || {};
        const crossplaneVersion = annotations['terasky.backstage.io/crossplane-version'];
        const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
        const cluster = annotations['backstage.io/managed-by-location']?.split(': ')[1];
        const resourcesToFetch: any[] = [];

        if (crossplaneVersion === 'v1') {
          // Fetch claim
          const claimPlural = annotations['terasky.backstage.io/claim-plural'];
          const claimGroup = annotations['terasky.backstage.io/claim-group'];
          const claimVersion = annotations['terasky.backstage.io/claim-version'];
          const claimName = annotations['terasky.backstage.io/claim-name'];
          const namespace = labelSelector?.split(',').find(s => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];
          if (claimPlural && claimGroup && claimVersion && claimName && namespace && cluster) {
            const claimUrl = `/apis/${claimGroup}/${claimVersion}/namespaces/${namespace}/${claimPlural}/${claimName}`;
            const claimResponse = await kubernetesApi.proxy({ clusterName: cluster, path: claimUrl, init: { method: 'GET' } });
            resourcesToFetch.push(await claimResponse.json());
          }
        }

        // Fetch composite (for both v1 and v2)
        const compositePlural = annotations['terasky.backstage.io/composite-plural'];
        const compositeGroup = annotations['terasky.backstage.io/composite-group'];
        const compositeVersion = annotations['terasky.backstage.io/composite-version'];
        const compositeName = annotations['terasky.backstage.io/composite-name'];
        const compositeScope = annotations['terasky.backstage.io/crossplane-scope'];
        if (compositePlural && compositeGroup && compositeVersion && compositeName && cluster) {
          let compositeUrl;
          if (compositeScope === 'Namespaced') {
            const ns = labelSelector?.split(',').find(s => s.startsWith('crossplane.io/claim-namespace') || s.startsWith('crossplane.io/composite-namespace'))?.split('=')[1]
              || entity.metadata.namespace
              || 'default';
            compositeUrl = `/apis/${compositeGroup}/${compositeVersion}/namespaces/${ns}/${compositePlural}/${compositeName}`;
          } else {
            compositeUrl = `/apis/${compositeGroup}/${compositeVersion}/${compositePlural}/${compositeName}`;
          }
          const compositeResponse = await kubernetesApi.proxy({ clusterName: cluster, path: compositeUrl, init: { method: 'GET' } });
          resourcesToFetch.push(await compositeResponse.json());
        }

        const resources = resourcesToFetch;

        const fetchedPolicyReports = await Promise.all(resources.map(async (resource, index) => {
          if (!resource || !resource.metadata) return null;
          const { uid, namespace } = resource.metadata || {};
          if (!uid) return null;

          let url;
          if (namespace) {
            url = `/apis/wgpolicyk8s.io/v1alpha2/namespaces/${namespace}/policyreports/${uid}`;
          } else {
            url = `/apis/wgpolicyk8s.io/v1alpha2/clusterpolicyreports/${uid}`;
          }

          try {
            const response = await kubernetesApi.proxy({
              clusterName: cluster,
              path: url,
              init: { method: 'GET' },
            });
            const report = await response.json();
            return report;
          } catch (error) {
            console.error(`Failed to fetch policy report for ${uid}:`, error);
            return null;
          }
        }));

        const filteredReports = fetchedPolicyReports.filter(report => report !== null) as PolicyReport[];
        setPolicyReports(filteredReports);

        const totalChecks = filteredReports.reduce((acc, report) => acc + (report?.results?.length || 0), 0);
        const totalPass = filteredReports.reduce((acc, report) => acc + (report?.summary?.pass || 0), 0);
        const totalFail = filteredReports.reduce((acc, report) => acc + (report?.summary?.fail || 0), 0);
        const totalError = filteredReports.reduce((acc, report) => acc + (report?.summary?.error || 0), 0);
        const totalSkip = filteredReports.reduce((acc, report) => acc + (report?.summary?.skip || 0), 0);
        const totalWarn = filteredReports.reduce((acc, report) => acc + (report?.summary?.warn || 0), 0);

        setOverviewData({
          totalResources: resources.length,
          totalChecks,
          totalPass,
          totalFail,
          totalError,
          totalSkip,
          totalWarn,
        });
      } catch (error) {
        console.error('Failed to fetch overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [kubernetesApi, entity]);

  const renderTooltipContent = (type: 'pass' | 'fail' | 'warn' | 'error' | 'skip') => {
      const relevantResults = policyReports.flatMap(report => report.results?.filter(result => result.result === type).map(result => ({
        ...result,
        kind: report.scope?.kind,
        name: report.scope?.name,
        namespace: report.scope?.namespace,
      })) || []);
      if (relevantResults.length === 0) return <></>;
  
      return (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>Kind</TableCell>
              <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>Name</TableCell>
              <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>Namespace</TableCell>
              <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>Policy</TableCell>
              {type !== 'pass' && <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>Rule</TableCell>}
              {type !== 'pass' && <TableCell style={{ width: '100%' }}>Message</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {relevantResults.map((result, index) => (
              <TableRow key={index} className={classes.tableRow}>
                <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>{result.kind || ''}</TableCell>
                <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>{result.name || ''}</TableCell>
                <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>{result.namespace || ''}</TableCell>
                <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>{result.policy || ''}</TableCell>
                {type !== 'pass' && <TableCell style={{ whiteSpace: 'nowrap', width: 'auto' }}>{result.rule || ''}</TableCell>}
                {type !== 'pass' && <TableCell style={{ width: '100%' }}>{result.message || ''}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    };
  if (!canViewOverview) {
    return (
      <Card className={classes.card}>
      <CardContent>
        <Typography variant="h5" component="h1" align="left">
          Kyverno Policy Overview
        </Typography>
      <Box m={2}>
        <Typography variant="h5" gutterBottom>
          You don't have permissions to view Kyverno Policy Reports
        </Typography>
      </Box>
      </CardContent>
      </Card>
    );
  }
  return (
    <Card className={classes.card}>
      <CardContent>
        <Typography variant="h5" component="h1" align="left">
          Kyverno Policy Overview
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="h5" component="h2">
              Kubernetes Resource Checked: {overviewData.totalResources}
            </Typography>
            <Typography variant="h5" component="h2" className={classes.pos} color="textSecondary">
              Total Checks Run: {overviewData.totalChecks}
            </Typography>
            <Box className={classes.row}>
            {overviewData.totalError > 0 ? (
              <Tooltip classes={{ tooltip: classes.tooltip }} title={overviewData.totalError > 0 ? renderTooltipContent('error') : <></>}>
                <Box>
                  <ErrorIcon className={classes.icon} style={{ color: theme.palette.error.main }} />
                  <Typography variant="body2" component="p" className={classes.error}>
                    Error: {overviewData.totalError}
                  </Typography>
                </Box>
              </Tooltip>
            ):(
              <Box>
                <ErrorIcon className={classes.icon} style={{ color: theme.palette.error.main }} />
                <Typography variant="body2" component="p" className={classes.error}>
                  Error: {overviewData.totalError}
                </Typography>
              </Box>
            )}
            {overviewData.totalFail > 0 ? (
              <Tooltip classes={{ tooltip: classes.tooltip }} title={overviewData.totalFail > 0 ? renderTooltipContent('fail') : <></>}>
                <Box>
                  <CancelIcon className={classes.icon} style={{ color: theme.palette.error.main }} />
                  <Typography variant="body2" component="p" className={classes.error}>
                    Fail: {overviewData.totalFail}
                  </Typography>
                </Box>
              </Tooltip>
              ):(
                <Box>
                  <CancelIcon className={classes.icon} style={{ color: theme.palette.error.main }} />
                  <Typography variant="body2" component="p" className={classes.error}>
                    Fail: {overviewData.totalFail}
                  </Typography>
                </Box>
              )}
              {overviewData.totalWarn > 0 ? (
              <Tooltip classes={{ tooltip: classes.tooltip }} title={overviewData.totalWarn > 0 ? renderTooltipContent('warn') : <></>}>
                <Box>
                  <WarningIcon className={classes.icon} style={{ color: theme.palette.warning.main }} />
                  <Typography variant="body2" component="p" className={classes.warning}>
                    Warn: {overviewData.totalWarn}
                  </Typography>
                </Box>
              </Tooltip>
              ):(
                <Box>
                  <WarningIcon className={classes.icon} style={{ color: theme.palette.warning.main }} />
                  <Typography variant="body2" component="p" className={classes.warning}>
                    Warn: {overviewData.totalWarn}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box className={classes.row}>
            {overviewData.totalSkip > 0 ? (
              <Tooltip classes={{ tooltip: classes.tooltip }} title={overviewData.totalSkip > 0 ? renderTooltipContent('skip') : <></>}>
                <Box>
                  <SkipNextIcon className={classes.icon} style={{ color: theme.palette.info.main }} />
                  <Typography variant="body2" component="p" className={classes.info}>
                    Skip: {overviewData.totalSkip}
                  </Typography>
                </Box>
              </Tooltip>
            ):(
              <Box>
                <SkipNextIcon className={classes.icon} style={{ color: theme.palette.info.main }} />
                <Typography variant="body2" component="p" className={classes.info}>
                  Skip: {overviewData.totalSkip}
                </Typography>
              </Box>
              )}
              {overviewData.totalPass > 0 ? (
              <Tooltip classes={{ tooltip: classes.tooltip }} title={overviewData.totalPass > 0 ? renderTooltipContent('pass') : <></>}>
                <Box>
                  <CheckCircleIcon className={classes.icon} style={{ color: theme.palette.success.main }} />
                  <Typography variant="body2" component="p" className={classes.success}>
                    Pass: {overviewData.totalPass}
                  </Typography>
                </Box>
              </Tooltip>
              ):(
                <Box>
                  <CheckCircleIcon className={classes.icon} style={{ color: theme.palette.success.main }} />
                  <Typography variant="body2" component="p" className={classes.success}>
                    Pass: {overviewData.totalPass}
                  </Typography>
                </Box>
                )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default KyvernoCrossplaneOverviewCard;