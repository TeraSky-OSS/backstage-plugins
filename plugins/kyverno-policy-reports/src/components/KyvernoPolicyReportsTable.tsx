import { Fragment, useState, useEffect } from 'react';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Box, Collapse, Typography, LinearProgress, Chip, Drawer, Button, useTheme } from '@material-ui/core';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { ExpandMore, ExpandLess, Close as CloseIcon } from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import {
  StatusAborted,
  StatusError,
  StatusOK,
  StatusWarning,
} from '@backstage/core-components';
import YAML from 'js-yaml';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { saveAs } from 'file-saver';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { usePermission } from '@backstage/plugin-permission-react';
import { Alert } from '@material-ui/lab';
import {
  showKyvernoReportsPermission,
  viewPolicyYAMLPermission,
  PolicyReport,
  isDeprecatedPolicy,
  isDeprecatedPolicySource,
} from '@terasky/backstage-plugin-kyverno-common';
import { kyvernoApiRef } from '../api/KyvernoApi';


const useStyles = makeStyles((theme: any) => ({
  error: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
  success: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  warning: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
  },
  info: {
    backgroundColor: theme.palette.info.main,
    color: theme.palette.info.contrastText,
  },
  policyTypeNew: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  policyTypeDeprecated: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
  },
}));

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

const PolicyTypeChip = ({ source, classes }: { source?: string; classes: any }) => {
    if (!source) return null;
    const label = SOURCE_LABEL_MAP[source] ?? source;
    const className = isDeprecatedPolicySource(source) ? classes.policyTypeDeprecated : classes.policyTypeNew;
    return <Chip label={label} size="small" className={className} />;
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

const KyvernoPolicyReportsTable = () => {
    const { entity } = useEntity();
    const kyvernoApi = useApi(kyvernoApiRef);
    const [policyReports, setPolicyReports] = useState<PolicyReport[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
    const [policyYaml, setPolicyYaml] = useState<string | null>(null);
    const [isPolicyDeprecated, setIsPolicyDeprecated] = useState(false);
    const classes = useStyles();
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
                if (!entity.metadata.namespace) {
                    throw new Error('Entity must have a namespace');
                }
                const response = await kyvernoApi.getPolicyReports({
                    entity: {
                        metadata: entity.metadata,
                    }
                });
                setPolicyReports(response.items);
            } catch (error) {
                console.error('Failed to fetch policy reports:', error);
            }
            setLoading(false);
        };

        fetchPolicyReports();
    }, [kyvernoApi, entity, canSeeReports]);

    const handleRowClick = (uid: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) {
                newSet.delete(uid);
            } else {
                newSet.add(uid);
            }
            return newSet;
        });
    };

    const handlePolicyClick = async (policyName: string, clusterName: string, namespace: string, source?: string) => {
        setDrawerOpen(true);
        setSelectedPolicy(policyName);
        setIsPolicyDeprecated(false);
        try {
            const response = await kyvernoApi.getPolicy({ clusterName, namespace, policyName, source });
            setPolicyYaml(YAML.dump(removeManagedFields(response.policy)));
            setIsPolicyDeprecated(isDeprecatedPolicy(response.policy as any));
        } catch (error) {
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

    const StatusComponent = ({ status }: { status: string }) => {
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

    const SeverityComponent = ({ severity }: { severity: string }) => {
        switch (severity) {
            case 'high':
                return <Chip label={severity} className={classes.error} />;
            case 'low':
                return <Chip label={severity} className={classes.success} />;
            case 'medium':
                return <Chip label={severity} className={classes.warning} />;
            case 'info':
                return <Chip label={severity} className={classes.info} />;
            case 'critical':
                return <Chip label={severity} className={classes.error} />;
            default:
                return null;
        }
    };

    if (!canSeeReports) {
        return (
            <Box m={2}>
                <Typography variant="h5" gutterBottom>
                    You don't have permissions to view the Kyverno Policy Reports
                </Typography>
            </Box>
        );
    }

    return (
        <Box m={2}>
            <Typography variant="h5" gutterBottom>
                Policy Report Results
            </Typography>
            {loading ? (
                <LinearProgress />
            ) : (
                Object.keys(groupedReports).map(clusterName => (
                    <Box key={clusterName} mb={4}>
                        <Typography variant="h6" gutterBottom>
                            Cluster: {clusterName}
                        </Typography>
                        <Paper>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Namespace</TableCell>
                                        <TableCell>Error Count</TableCell>
                                        <TableCell>Fail Count</TableCell>
                                        <TableCell>Pass Count</TableCell>
                                        <TableCell>Skip Count</TableCell>
                                        <TableCell>Warn Count</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groupedReports[clusterName]
                                        .filter(report => report.metadata.namespace && report.scope?.kind && report.scope?.name && report.summary)
                                        .map((report: PolicyReport) => (
                                        <Fragment key={report.metadata.uid}>
                                            <TableRow onClick={() => handleRowClick(report.metadata.uid)}>
                                                <TableCell>{report.scope.kind}</TableCell>
                                                <TableCell>{report.scope.name}</TableCell>
                                                <TableCell>{report.metadata.namespace || "Cluster Scoped"}</TableCell>
                                                <TableCell>{report.summary.error}</TableCell>
                                                <TableCell>{report.summary.fail}</TableCell>
                                                <TableCell>{report.summary.pass}</TableCell>
                                                <TableCell>{report.summary.skip}</TableCell>
                                                <TableCell>{report.summary.warn}</TableCell>
                                                <TableCell>
                                                    <IconButton>
                                                        {expandedRows.has(report.metadata.uid) ? <ExpandLess /> : <ExpandMore />}
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={9} style={{ paddingBottom: 0, paddingTop: 0 }}>
                                                    <Collapse in={expandedRows.has(report.metadata.uid)} timeout="auto" unmountOnExit>
                                                        <Box margin={1}>
                                                            <Typography variant="h6" gutterBottom component="div">
                                                                Policy Report Details
                                                            </Typography>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Category</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Result</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Policy</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Policy Type</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Severity</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Message</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Timestamp</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {report.results?.map((result, index) => (
                                                                        <TableRow key={index}>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>{result.category}</TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <StatusComponent status={result.result} />
                                                                            </TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                                                                                    {canViewYaml ? (
                                                                                        <Button size="small" onClick={() => handlePolicyClick(result.policy, report.clusterName, report.metadata.namespace, result.source)}>
                                                                                            {result.policy}
                                                                                        </Button>
                                                                                    ) : (
                                                                                        result.policy
                                                                                    )}
                                                                                    {isDeprecatedPolicySource(result.source) && (
                                                                                        <Chip
                                                                                            label="deprecated"
                                                                                            size="small"
                                                                                            className={classes.warning}
                                                                                        />
                                                                                    )}
                                                                                </Box>
                                                                            </TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <PolicyTypeChip source={result.source} classes={classes} />
                                                                            </TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <SeverityComponent severity={result.severity} />
                                                                            </TableCell>
                                                                            <TableCell style={{ maxWidth: 300, wordBreak: 'break-word' }}>{result.message}</TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>{new Date(result.timestamp.seconds * 1000).toLocaleString()}</TableCell>
                                                                        </TableRow>
                                                                    )) || (
                                                                        <TableRow>
                                                                            <TableCell colSpan={7}>No results found</TableCell>
                                                                        </TableRow>
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Box>
                ))
            )}
            <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
                <div style={{ width: '50vw', padding: '16px' }}>
                    <IconButton onClick={handleCloseDrawer}>
                        <CloseIcon />
                    </IconButton>
                    {policyYaml && selectedPolicy && (
                        <>
                            {isPolicyDeprecated && (
                                <Alert severity="warning" style={{ marginBottom: 16 }}>
                                    This policy uses the deprecated Kyverno Policy/ClusterPolicy API (kyverno.io/v1).
                                    Consider migrating to the new policy types (policies.kyverno.io/v1).
                                </Alert>
                            )}
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <CopyToClipboard text={policyYaml}>
                                    <Button variant="contained" color="primary">Copy to Clipboard</Button>
                                </CopyToClipboard>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadYaml}
                                >
                                    Download YAML
                                </Button>
                            </Box>
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

export default KyvernoPolicyReportsTable;