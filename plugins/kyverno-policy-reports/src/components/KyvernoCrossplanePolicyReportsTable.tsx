import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Box, Collapse, Typography, LinearProgress, Chip, Drawer, Button, useTheme } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
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

interface PolicyReport {
    metadata: {
        uid: string;
        namespace?: string;
    };
    scope: {
        kind: string;
        name: string;
    };
    summary: {
        error: number;
        fail: number;
        pass: number;
        skip: number;
        warn: number;
    };
    results?: Array<{
        category: string;
        message: string;
        policy: string;
        result: string;
        rule: string;
        severity: string;
        timestamp: {
            seconds: number;
        };
    }>;
    clusterName: string;
}

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
}));

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

const KyvernoCrossplanePolicyReportsTable = () => {
    const { entity } = useEntity();
    const kubernetesApi = useApi(kubernetesApiRef);
    const [resources, setResources] = useState<Array<{
        metadata: any; resource: KubernetesObject 
}>>([]);
    const [policyReports, setPolicyReports] = useState<PolicyReport[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
    const [policyYaml, setPolicyYaml] = useState<string | null>(null);
    const classes = useStyles();
    const theme = useTheme();

    useEffect(() => {
        const fetchResources = async () => {
          setLoading(true);
          try {
            const annotations = entity.metadata.annotations || {};
            const claimPlural = annotations['terasky.backstage.io/claim-plural'];
            const claimGroup = annotations['terasky.backstage.io/claim-group'];
            const claimVersion = annotations['terasky.backstage.io/claim-version'];
            const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
            const namespace = labelSelector.split(',').find((s: string) => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];
            const clusterOfClaim = annotations['backstage.io/managed-by-location'].split(": ")[1];

            if (!claimPlural || !claimGroup || !claimVersion || !namespace || !clusterOfClaim) {
              return;
            }

            const claimResourceName = entity.metadata.name;
            const claimUrl = `/apis/${claimGroup}/${claimVersion}/namespaces/${namespace}/${claimPlural}/${claimResourceName}`;

            const claimResponse = await kubernetesApi.proxy({
              clusterName: clusterOfClaim,
              path: claimUrl,
              init: { method: 'GET' },
            });
            const claimResource = await claimResponse.json();

            const compositePlural = annotations['terasky.backstage.io/composite-plural'];
            const compositeGroup = annotations['terasky.backstage.io/composite-group'];
            const compositeVersion = annotations['terasky.backstage.io/composite-version'];
            const compositeName = annotations['terasky.backstage.io/composite-name'];
            const clusterOfComposite = annotations['backstage.io/managed-by-location'].split(": ")[1];

            if (!compositePlural || !compositeGroup || !compositeVersion || !compositeName || !clusterOfComposite) {
              return;
            }

            const compositeUrl = `/apis/${compositeGroup}/${compositeVersion}/${compositePlural}/${compositeName}`;

            const compositeResponse = await kubernetesApi.proxy({
              clusterName: clusterOfComposite,
              path: compositeUrl,
              init: { method: 'GET' },
            });
            const compositeResource = await compositeResponse.json();

            const fetchedResources = [claimResource, compositeResource];

            setResources([claimResource, compositeResource]);
            console.log(`fetchedResources: ${JSON.stringify(fetchedResources)}`);
            setLoading(false);
          } catch (error) {
            console.error('Failed to fetch resources:', error);
            setLoading(false);
          }
        };

        fetchResources();
    }, [kubernetesApi, entity]);

    useEffect(() => {
        const fetchPolicyReports = async () => {
            setLoading(true);
            const annotations = entity.metadata.annotations || {};
            const clusterName = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const reports = await Promise.all(resources.map(async (resource) => {
                
                console.log(resource)
                if (!resource || !resource.metadata) return null;
                const { uid, namespace } = resource.metadata;
                if (!uid) return null;

                const url = namespace
                    ? `/apis/wgpolicyk8s.io/v1alpha2/namespaces/${namespace}/policyreports/${uid}`
                    : `/apis/wgpolicyk8s.io/v1alpha2/clusterpolicyreports/${uid}`;
                try {
                    const response = await kubernetesApi.proxy({
                        clusterName,
                        path: url,
                        init: { method: 'GET' },
                    });
                    const report = await response.json();
                    return { ...report, clusterName };
                } catch (error) {
                    console.error(`Failed to fetch policy report for ${uid}:`, error);
                    return null;
                }
            }));

            setPolicyReports(reports.filter(report => report !== null) as PolicyReport[]);
            setLoading(false);
        };

        if (resources.length > 0) {
            fetchPolicyReports();
        }
    }, [resources, kubernetesApi]);

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

    const handlePolicyClick = async (policyName: string, clusterName: string, namespace: string) => {
        setDrawerOpen(true);
        setSelectedPolicy(policyName);
        try {
            const clusterPolicyUrl = `/apis/kyverno.io/v1/clusterpolicies/${policyName}`;
            const policyUrl = `/apis/kyverno.io/v1/namespaces/${namespace}/policies/${policyName}`;

            let response = await kubernetesApi.proxy({
                clusterName,
                path: clusterPolicyUrl,
                init: { method: 'GET' },
            });

            if (response.status === 404) {
                response = await kubernetesApi.proxy({
                    clusterName,
                    path: policyUrl,
                    init: { method: 'GET' },
                });
            }

            const policy = await response.json();
            setPolicyYaml(YAML.dump(removeManagedFields(policy)));
        } catch (error) {
            console.error(`Failed to fetch policy ${policyName}:`, error);
            setPolicyYaml(null);
        }
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedPolicy(null);
        setPolicyYaml(null);
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
                                        .filter(report => report.metadata && report.scope?.kind && report.scope?.name && report.summary)
                                        .map((report: PolicyReport) => (
                                        <React.Fragment key={report.metadata.uid}>
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
                                                                        <TableCell>Category</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Result</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Policy</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Rule</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Severity</TableCell>
                                                                        <TableCell style={{ whiteSpace: 'nowrap' }}>Message</TableCell>
                                                                        <TableCell>Timestamp</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {report.results?.map((result, index) => (
                                                                        <TableRow key={index}>
                                                                            <TableCell>{result.category}</TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <StatusComponent status={result.result} />
                                                                            </TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <Button onClick={() => handlePolicyClick(result.policy, report.clusterName, report.metadata.namespace || '')}>
                                                                                    {result.policy}
                                                                                </Button>
                                                                            </TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>{result.rule}</TableCell>
                                                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                                                <SeverityComponent severity={result.severity} />
                                                                            </TableCell>
                                                                            <TableCell>{result.message}</TableCell>
                                                                            <TableCell>{new Date(result.timestamp.seconds * 1000).toLocaleString()}</TableCell>
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
                                        </React.Fragment>
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

export default KyvernoCrossplanePolicyReportsTable;