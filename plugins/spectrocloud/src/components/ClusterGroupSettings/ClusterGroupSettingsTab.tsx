import { useState, useEffect } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  Progress,
} from '@backstage/core-components';
import {
  Grid,
  Typography,
  makeStyles,
  Box,
  Divider,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import StorageIcon from '@material-ui/icons/Storage';
import MemoryIcon from '@material-ui/icons/Memory';
import SpeedIcon from '@material-ui/icons/Speed';
import SettingsIcon from '@material-ui/icons/Settings';
import SyncIcon from '@material-ui/icons/Sync';
import ExtensionIcon from '@material-ui/icons/Extension';
import SecurityIcon from '@material-ui/icons/Security';
import NetworkCheckIcon from '@material-ui/icons/NetworkCheck';
import CodeIcon from '@material-ui/icons/Code';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@material-ui/core/styles';
import yaml from 'js-yaml';
import { spectroCloudApiRef } from '../../api';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  card: {
    height: '100%',
  },
  infoRow: {
    marginBottom: theme.spacing(1.5),
  },
  label: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  value: {
    color: theme.palette.text.primary,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  codeContainer: {
    maxHeight: 600,
    overflow: 'auto',
    borderRadius: 4,
    '& pre': {
      margin: '0 !important',
      fontSize: '13px !important',
    },
  },
  accordion: {
    marginTop: theme.spacing(2),
  },
  accordionSummary: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
  },
  statusIcon: {
    verticalAlign: 'middle',
    marginRight: theme.spacing(0.5),
  },
  syncTable: {
    '& .MuiTableCell-root': {
      padding: theme.spacing(1),
      borderBottom: 'none',
    },
  },
  subSection: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
}));

export const ClusterGroupSettingsTab = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);
  const spectroCloudApi = useApi(spectroCloudApiRef);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [clusterGroupDetails, setClusterGroupDetails] = useState<any>(null);
  
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';
  
  const annotations = entity.metadata.annotations || {};
  const clusterGroupUid = annotations[`${annotationPrefix}/cluster-group-id`];
  const projectUid = annotations[`${annotationPrefix}/project-id`];
  const instanceName = annotations[`${annotationPrefix}/instance`];

  useEffect(() => {
    const fetchClusterGroupDetails = async () => {
      if (!clusterGroupUid) {
        setError('Cluster group UID not found');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(undefined);
      
      try {
        const details = await spectroCloudApi.getClusterGroupDetails(
          clusterGroupUid,
          projectUid,
          instanceName
        );
        setClusterGroupDetails(details);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cluster group details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClusterGroupDetails();
  }, [clusterGroupUid, projectUid, instanceName, spectroCloudApi]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!clusterGroupDetails) {
    return <Alert severity="warning">No cluster group details available</Alert>;
  }

  const limitConfig = clusterGroupDetails.spec?.clustersConfig?.limitConfig;
  const endpointType = clusterGroupDetails.spec?.clustersConfig?.endpointType || 'N/A';
  const kubernetesDistroType = clusterGroupDetails.spec?.clustersConfig?.kubernetesDistroType || 'N/A';
  const vclusterConfigYaml = clusterGroupDetails.spec?.clustersConfig?.values || '';
  const overSubscription = limitConfig?.overSubscription || 100;

  // Parse YAML configuration
  let vclusterConfig: any = {};
  try {
    if (vclusterConfigYaml) {
      vclusterConfig = yaml.load(vclusterConfigYaml) as any;
    }
  } catch (err) {
    console.error('Failed to parse vCluster config YAML:', err);
  }

  // Extract settings from parsed config
  const syncToHost = vclusterConfig?.sync?.toHost || {};
  const syncFromHost = vclusterConfig?.sync?.fromHost || {};
  const controlPlane = vclusterConfig?.controlPlane || {};
  const distro = controlPlane?.distro || {};
  const k8sDistro = distro?.k8s || {};
  const deploySettings = vclusterConfig?.deploy || {};
  const policies = vclusterConfig?.policies || {};
  const plugins = vclusterConfig?.plugin || {};
  
  // Extract versions
  const k8sVersion = k8sDistro?.image?.tag || k8sDistro?.apiServer?.image?.tag || 'N/A';
  const vclusterVersion = controlPlane?.statefulSet?.image?.tag || 'N/A';

  // Helper function to render enabled/disabled status
  const renderStatus = (enabled: boolean | string) => {
    const isEnabled = enabled === true || enabled === 'true' || enabled === 'auto';
    return (
      <Box display="flex" alignItems="center">
        {isEnabled ? (
          <>
            <CheckCircleIcon className={classes.statusIcon} style={{ color: '#4caf50' }} />
            <Typography variant="body2">Enabled</Typography>
          </>
        ) : (
          <>
            <CancelIcon className={classes.statusIcon} style={{ color: '#f44336' }} />
            <Typography variant="body2">Disabled</Typography>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box className={classes.root}>
      <Grid container spacing={3}>
        {/* Versions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className={classes.sectionTitle}>
                <CodeIcon />
                Versions
              </Typography>

              <Box className={classes.infoRow}>
                <Typography variant="body2" className={classes.label}>
                  Kubernetes Version
                </Typography>
                <Chip label={k8sVersion} size="small" color="primary" />
              </Box>

              <Box className={classes.infoRow}>
                <Typography variant="body2" className={classes.label}>
                  vCluster Version
                </Typography>
                <Chip label={vclusterVersion} size="small" color="secondary" />
              </Box>

              <Box className={classes.infoRow}>
                <Typography variant="body2" className={classes.label}>
                  Kubernetes Distribution
                </Typography>
                <Chip label={kubernetesDistroType} size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Basic Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className={classes.sectionTitle}>
                <SettingsIcon />
                Basic Configuration
              </Typography>

              <Box className={classes.infoRow}>
                <Typography variant="body2" className={classes.label}>
                  Endpoint Type
                </Typography>
                <Chip label={endpointType} size="small" color="primary" />
                <Typography variant="caption" color="textSecondary" display="block">
                  How virtual clusters expose their API endpoints
                </Typography>
              </Box>

              <Box className={classes.infoRow}>
                <Typography variant="body2" className={classes.label}>
                  Member Clusters
                </Typography>
                <Typography variant="body2" className={classes.value}>
                  {clusterGroupDetails.spec?.clusterRefs?.length || 0} cluster(s)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Resource Limits */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className={classes.sectionTitle}>
                <MemoryIcon />
                Virtual Cluster Resource Limits
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Per virtual cluster limits
              </Typography>
              
              {limitConfig ? (
                <>
                  <Box className={classes.infoRow}>
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <SpeedIcon fontSize="small" style={{ marginRight: 8 }} />
                      <Typography variant="body2" className={classes.label}>
                        CPU Limit
                      </Typography>
                    </Box>
                    <Typography variant="h6" className={classes.value}>
                      {limitConfig.cpu || limitConfig.cpuMilliCore ? 
                        `${limitConfig.cpu || (limitConfig.cpuMilliCore / 1000)} cores` : 
                        'N/A'}
                    </Typography>
                  </Box>

                  <Box className={classes.infoRow}>
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <MemoryIcon fontSize="small" style={{ marginRight: 8 }} />
                      <Typography variant="body2" className={classes.label}>
                        Memory Limit
                      </Typography>
                    </Box>
                    <Typography variant="h6" className={classes.value}>
                      {limitConfig.memory || limitConfig.memoryMiB ? 
                        `${limitConfig.memory || limitConfig.memoryMiB} MiB` : 
                        'N/A'}
                    </Typography>
                  </Box>

                  <Box className={classes.infoRow}>
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <StorageIcon fontSize="small" style={{ marginRight: 8 }} />
                      <Typography variant="body2" className={classes.label}>
                        Storage Limit
                      </Typography>
                    </Box>
                    <Typography variant="h6" className={classes.value}>
                      {limitConfig.storageGiB ? `${limitConfig.storageGiB} GiB` : 'N/A'}
                    </Typography>
                  </Box>

                  <Divider style={{ margin: '16px 0' }} />

                  <Box className={classes.infoRow}>
                    <Typography variant="body2" className={classes.label}>
                      Over-subscription
                    </Typography>
                    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                      <Typography variant="h6" className={classes.value}>
                        {overSubscription}%
                      </Typography>
                      <Chip 
                        label={overSubscription > 100 ? 'Enabled' : 'Disabled'} 
                        size="small" 
                        color={overSubscription > 100 ? 'secondary' : 'default'}
                      />
                    </Box>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No resource limits configured
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Deploy Components */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className={classes.sectionTitle}>
                <NetworkCheckIcon />
                Deployed Components
              </Typography>

              <Table size="small" className={classes.syncTable}>
                <TableBody>
                  <TableRow>
                    <TableCell><Typography variant="body2">Local Path Provisioner</Typography></TableCell>
                    <TableCell align="right">{renderStatus(deploySettings?.localPathProvisioner?.enabled)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography variant="body2">CNI (Flannel)</Typography></TableCell>
                    <TableCell align="right">{renderStatus(deploySettings?.cni?.flannel?.enabled)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography variant="body2">Kube Proxy</Typography></TableCell>
                    <TableCell align="right">{renderStatus(deploySettings?.kubeProxy?.enabled)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography variant="body2">MetalLB</Typography></TableCell>
                    <TableCell align="right">{renderStatus(deploySettings?.metallb?.enabled)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography variant="body2">Ingress NGINX</Typography></TableCell>
                    <TableCell align="right">{renderStatus(deploySettings?.ingressNginx?.enabled)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography variant="body2">Metrics Server</Typography></TableCell>
                    <TableCell align="right">{renderStatus(deploySettings?.metricsServer?.enabled)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" className={classes.sectionTitle}>
                <SyncIcon />
                Resource Sync Configuration
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" className={classes.subSection}>
                    Synced to Host Cluster
                  </Typography>
                  <Table size="small" className={classes.syncTable}>
                    <TableBody>
                      <TableRow>
                        <TableCell><Typography variant="body2">Services</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.services?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">Endpoints</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.endpoints?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">PersistentVolumeClaims</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.persistentVolumeClaims?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">ConfigMaps</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.configMaps?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">Secrets</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.secrets?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">Pods</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.pods?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">Ingresses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.ingresses?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">StorageClasses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.storageClasses?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">PriorityClasses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.priorityClasses?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">NetworkPolicies</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncToHost?.networkPolicies?.enabled)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" className={classes.subSection}>
                    Synced from Host Cluster
                  </Typography>
                  <Table size="small" className={classes.syncTable}>
                    <TableBody>
                      <TableRow>
                        <TableCell><Typography variant="body2">Events</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.events?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">ConfigMaps</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.configMaps?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">Secrets</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.secrets?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">Nodes</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.nodes?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">CSI Drivers</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.csiDrivers?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">CSI Nodes</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.csiNodes?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">StorageClasses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.storageClasses?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">IngressClasses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.ingressClasses?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">RuntimeClasses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.runtimeClasses?.enabled)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Typography variant="body2">PriorityClasses</Typography></TableCell>
                        <TableCell align="right">{renderStatus(syncFromHost?.priorityClasses?.enabled)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Policies */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" className={classes.sectionTitle}>
                <SecurityIcon />
                Policies
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" className={classes.subSection}>
                    Resource Quota
                  </Typography>
                  <Box className={classes.infoRow}>
                    <Typography variant="body2" className={classes.label}>
                      Status
                    </Typography>
                    {renderStatus(policies?.resourceQuota?.enabled)}
                  </Box>
                  {policies?.resourceQuota?.enabled && policies?.resourceQuota?.quota && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <Table size="small" className={classes.syncTable}>
                        <TableBody>
                          {Object.entries(policies.resourceQuota.quota).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell><Typography variant="caption">{key}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="caption">{String(value)}</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" className={classes.subSection}>
                    Limit Range
                  </Typography>
                  <Box className={classes.infoRow}>
                    <Typography variant="body2" className={classes.label}>
                      Status
                    </Typography>
                    {renderStatus(policies?.limitRange?.enabled)}
                  </Box>
                  {policies?.limitRange?.enabled && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      {policies?.limitRange?.default && (
                        <>
                          <Typography variant="caption" display="block" className={classes.label}>
                            Default Limits
                          </Typography>
                          <Table size="small" className={classes.syncTable}>
                            <TableBody>
                              {Object.entries(policies.limitRange.default).map(([key, value]) => (
                                <TableRow key={key}>
                                  <TableCell><Typography variant="caption">{key}</Typography></TableCell>
                                  <TableCell align="right"><Typography variant="caption">{String(value)}</Typography></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      )}
                      {policies?.limitRange?.defaultRequest && (
                        <>
                          <Typography variant="caption" display="block" className={classes.label} style={{ marginTop: 8 }}>
                            Default Requests
                          </Typography>
                          <Table size="small" className={classes.syncTable}>
                            <TableBody>
                              {Object.entries(policies.limitRange.defaultRequest).map(([key, value]) => (
                                <TableRow key={key}>
                                  <TableCell><Typography variant="caption">{key}</Typography></TableCell>
                                  <TableCell align="right"><Typography variant="caption">{String(value)}</Typography></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      )}
                    </>
                  )}
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" className={classes.subSection}>
                    Network Policy
                  </Typography>
                  <Box className={classes.infoRow}>
                    <Typography variant="body2" className={classes.label}>
                      Status
                    </Typography>
                    {renderStatus(policies?.networkPolicy?.enabled)}
                  </Box>
                  {policies?.networkPolicy?.enabled && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <Box className={classes.infoRow}>
                        <Typography variant="caption" className={classes.label}>
                          Fallback DNS
                        </Typography>
                        <Typography variant="caption" className={classes.value}>
                          {policies?.networkPolicy?.fallbackDns || 'N/A'}
                        </Typography>
                      </Box>
                      
                      {/* Outgoing Connections */}
                      {policies?.networkPolicy?.outgoingConnections?.ipBlock && (
                        <>
                          <Box className={classes.infoRow} mt={1}>
                            <Typography variant="caption" className={classes.label} display="block">
                              Outgoing Connections
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              CIDR: {policies.networkPolicy.outgoingConnections.ipBlock.cidr || 'N/A'}
                            </Typography>
                            {policies.networkPolicy.outgoingConnections.ipBlock.except && 
                             policies.networkPolicy.outgoingConnections.ipBlock.except.length > 0 && (
                              <Box mt={0.5}>
                                <Typography variant="caption" color="textSecondary" display="block">
                                  Exceptions ({policies.networkPolicy.outgoingConnections.ipBlock.except.length}):
                                </Typography>
                                {policies.networkPolicy.outgoingConnections.ipBlock.except.map((cidr: string, idx: number) => (
                                  <Chip 
                                    key={idx} 
                                    label={cidr} 
                                    size="small" 
                                    style={{ margin: '2px', fontSize: '0.7rem' }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </>
                      )}

                      {/* Extra Rules */}
                      {policies?.networkPolicy?.extraControlPlaneRules && 
                       policies.networkPolicy.extraControlPlaneRules.length > 0 && (
                        <Box className={classes.infoRow} mt={1}>
                          <Typography variant="caption" className={classes.label}>
                            Extra Control Plane Rules
                          </Typography>
                          <Chip 
                            label={`${policies.networkPolicy.extraControlPlaneRules.length} rule(s)`}
                            size="small"
                            color="primary"
                            style={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                      )}

                      {policies?.networkPolicy?.extraWorkloadRules && 
                       policies.networkPolicy.extraWorkloadRules.length > 0 && (
                        <Box className={classes.infoRow} mt={1}>
                          <Typography variant="caption" className={classes.label}>
                            Extra Workload Rules
                          </Typography>
                          <Chip 
                            label={`${policies.networkPolicy.extraWorkloadRules.length} rule(s)`}
                            size="small"
                            color="secondary"
                            style={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* vCluster Plugins */}
        {Object.keys(plugins).length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" className={classes.sectionTitle}>
                  <ExtensionIcon />
                  vCluster Plugins
                </Typography>

                <Grid container spacing={2}>
                  {Object.entries(plugins).map(([pluginName, pluginConfig]: [string, any]) => (
                    <Grid item xs={12} md={6} key={pluginName}>
                      <Box className={classes.infoRow}>
                        <Typography variant="body2" className={classes.label}>
                          {pluginName}
                        </Typography>
                        <Chip 
                          label={pluginConfig?.image || 'Configured'} 
                          size="small" 
                          className={classes.chip}
                        />
                        {pluginConfig?.version && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            Version: {pluginConfig.version}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Raw vCluster Configuration (Collapsed by default) */}
        {vclusterConfigYaml && (
          <Grid item xs={12}>
            <Accordion className={classes.accordion}>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                className={classes.accordionSummary}
              >
                <Box display="flex" alignItems="center">
                  <CodeIcon style={{ marginRight: 8 }} />
                  <Typography variant="h6">
                    Raw vCluster Configuration (YAML)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box width="100%">
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Complete Helm values applied to virtual clusters in this group
                  </Typography>
                  <Box className={classes.codeContainer}>
                    <SyntaxHighlighter
                      language="yaml"
                      style={theme.palette.type === 'dark' ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        borderRadius: 4,
                      }}
                    >
                      {vclusterConfigYaml}
                    </SyntaxHighlighter>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
