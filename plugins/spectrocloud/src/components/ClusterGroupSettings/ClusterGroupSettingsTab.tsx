import { useState, useEffect, type ReactNode } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Progress } from '@backstage/core-components';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Alert,
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  Grid,
  Text,
} from '@backstage/ui';
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCodeSSlashLine,
  RiCpuLine,
  RiHardDriveLine,
  RiLoopLeftLine,
  RiNetworkLine,
  RiPlugLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiSpeedLine,
} from '@remixicon/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
// BUI-EXCEPTION: `react-syntax-highlighter`'s `style` prop needs a literal JS style object
// (light/dark theme constant), which cannot be derived from a CSS custom property. `useTheme`
// is kept narrowly for this one boolean.
import { useTheme } from '@material-ui/core/styles';
import yaml from 'js-yaml';
import { spectroCloudApiRef } from '../../api';
import styles from './ClusterGroupSettingsTab.module.css';

const StatusIndicator = ({ enabled }: { enabled: boolean | string }) => {
  const isEnabled = enabled === true || enabled === 'true' || enabled === 'auto';
  return (
    <Flex align="center" gap="1">
      {isEnabled ? (
        <RiCheckboxCircleLine size={16} style={{ color: 'var(--bui-fg-positive)' }} />
      ) : (
        <RiCloseCircleLine size={16} style={{ color: 'var(--bui-fg-negative)' }} />
      )}
      <Text variant="body-small">{isEnabled ? 'Enabled' : 'Disabled'}</Text>
    </Flex>
  );
};

const StatusRow = ({ label, enabled }: { label: string; enabled: boolean | string }) => (
  <Flex justify="between" align="center" py="1">
    <Text variant="body-small">{label}</Text>
    <StatusIndicator enabled={enabled} />
  </Flex>
);

const KeyValueRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Flex justify="between" align="center" py="1">
    <Text variant="body-x-small">{label}</Text>
    <Text variant="body-x-small">{value}</Text>
  </Flex>
);

const SectionHeading = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <Flex align="center" gap="2" mb="4">
    {icon}
    <Text variant="title-small" weight="bold">
      {children}
    </Text>
  </Flex>
);

const SubHeading = ({ children }: { children: ReactNode }) => (
  <Box mt="4" mb="2">
    <Text as="div" variant="body-small" weight="bold">
      {children}
    </Text>
  </Box>
);

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <Box mb="1">
    <Text as="div" variant="body-small" color="secondary" weight="bold">
      {children}
    </Text>
  </Box>
);

export const ClusterGroupSettingsTab = () => {
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
    return <Alert status="danger" description={error} />;
  }

  if (!clusterGroupDetails) {
    return <Alert status="warning" description="No cluster group details available" />;
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
    // eslint-disable-next-line no-console
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

  return (
    <Box p="4">
      <Grid.Root columns="12" gap="5">
        {/* Versions */}
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Card>
            <CardBody>
              <SectionHeading icon={<RiCodeSSlashLine size={20} />}>Versions</SectionHeading>

              <Box mb="2">
                <FieldLabel>Kubernetes Version</FieldLabel>
                <Badge>{k8sVersion}</Badge>
              </Box>

              <Box mb="2">
                <FieldLabel>vCluster Version</FieldLabel>
                <Badge>{vclusterVersion}</Badge>
              </Box>

              <Box mb="2">
                <FieldLabel>Kubernetes Distribution</FieldLabel>
                <Badge>{kubernetesDistroType}</Badge>
              </Box>
            </CardBody>
          </Card>
        </Grid.Item>

        {/* Basic Configuration */}
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Card>
            <CardBody>
              <SectionHeading icon={<RiSettings3Line size={20} />}>Basic Configuration</SectionHeading>

              <Box mb="2">
                <FieldLabel>Endpoint Type</FieldLabel>
                <Badge>{endpointType}</Badge>
                <Text as="div" variant="body-x-small" color="secondary">
                  How virtual clusters expose their API endpoints
                </Text>
              </Box>

              <Box mb="2">
                <FieldLabel>Member Clusters</FieldLabel>
                <Text variant="body-small">
                  {clusterGroupDetails.spec?.clusterRefs?.length || 0} cluster(s)
                </Text>
              </Box>
            </CardBody>
          </Card>
        </Grid.Item>

        {/* Resource Limits */}
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Card>
            <CardBody>
              <SectionHeading icon={<RiCpuLine size={20} />}>Virtual Cluster Resource Limits</SectionHeading>
              <Box mb="3">
                <Text as="div" variant="body-small" color="secondary">
                  Per virtual cluster limits
                </Text>
              </Box>

              {limitConfig ? (
                <>
                  <Box mb="3">
                    <Flex align="center" gap="1" mb="1">
                      <RiSpeedLine size={16} />
                      <FieldLabel>CPU Limit</FieldLabel>
                    </Flex>
                    <Text variant="title-small">
                      {limitConfig.cpu || limitConfig.cpuMilliCore
                        ? `${limitConfig.cpu || (limitConfig.cpuMilliCore / 1000)} cores`
                        : 'N/A'}
                    </Text>
                  </Box>

                  <Box mb="3">
                    <Flex align="center" gap="1" mb="1">
                      <RiCpuLine size={16} />
                      <FieldLabel>Memory Limit</FieldLabel>
                    </Flex>
                    <Text variant="title-small">
                      {limitConfig.memory || limitConfig.memoryMiB
                        ? `${limitConfig.memory || limitConfig.memoryMiB} MiB`
                        : 'N/A'}
                    </Text>
                  </Box>

                  <Box mb="3">
                    <Flex align="center" gap="1" mb="1">
                      <RiHardDriveLine size={16} />
                      <FieldLabel>Storage Limit</FieldLabel>
                    </Flex>
                    <Text variant="title-small">
                      {limitConfig.storageGiB ? `${limitConfig.storageGiB} GiB` : 'N/A'}
                    </Text>
                  </Box>

                  <Box my="3">
                    <hr className={styles.hr} />
                  </Box>

                  <Box mb="2">
                    <FieldLabel>Over-subscription</FieldLabel>
                    <Flex align="center" gap="2">
                      <Text variant="title-small">{overSubscription}%</Text>
                      <Badge>{overSubscription > 100 ? 'Enabled' : 'Disabled'}</Badge>
                    </Flex>
                  </Box>
                </>
              ) : (
                <Text variant="body-small" color="secondary">
                  No resource limits configured
                </Text>
              )}
            </CardBody>
          </Card>
        </Grid.Item>

        {/* Deploy Components */}
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Card>
            <CardBody>
              <SectionHeading icon={<RiNetworkLine size={20} />}>Deployed Components</SectionHeading>

              <Flex direction="column">
                <StatusRow label="Local Path Provisioner" enabled={deploySettings?.localPathProvisioner?.enabled} />
                <StatusRow label="CNI (Flannel)" enabled={deploySettings?.cni?.flannel?.enabled} />
                <StatusRow label="Kube Proxy" enabled={deploySettings?.kubeProxy?.enabled} />
                <StatusRow label="MetalLB" enabled={deploySettings?.metallb?.enabled} />
                <StatusRow label="Ingress NGINX" enabled={deploySettings?.ingressNginx?.enabled} />
                <StatusRow label="Metrics Server" enabled={deploySettings?.metricsServer?.enabled} />
              </Flex>
            </CardBody>
          </Card>
        </Grid.Item>

        {/* Sync Configuration */}
        <Grid.Item colSpan="12">
          <Card>
            <CardBody>
              <SectionHeading icon={<RiLoopLeftLine size={20} />}>Resource Sync Configuration</SectionHeading>

              <Grid.Root columns="12" gap="4">
                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                  <SubHeading>Synced to Host Cluster</SubHeading>
                  <Flex direction="column">
                    <StatusRow label="Services" enabled={syncToHost?.services?.enabled} />
                    <StatusRow label="Endpoints" enabled={syncToHost?.endpoints?.enabled} />
                    <StatusRow label="PersistentVolumeClaims" enabled={syncToHost?.persistentVolumeClaims?.enabled} />
                    <StatusRow label="ConfigMaps" enabled={syncToHost?.configMaps?.enabled} />
                    <StatusRow label="Secrets" enabled={syncToHost?.secrets?.enabled} />
                    <StatusRow label="Pods" enabled={syncToHost?.pods?.enabled} />
                    <StatusRow label="Ingresses" enabled={syncToHost?.ingresses?.enabled} />
                    <StatusRow label="StorageClasses" enabled={syncToHost?.storageClasses?.enabled} />
                    <StatusRow label="PriorityClasses" enabled={syncToHost?.priorityClasses?.enabled} />
                    <StatusRow label="NetworkPolicies" enabled={syncToHost?.networkPolicies?.enabled} />
                  </Flex>
                </Grid.Item>

                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                  <SubHeading>Synced from Host Cluster</SubHeading>
                  <Flex direction="column">
                    <StatusRow label="Events" enabled={syncFromHost?.events?.enabled} />
                    <StatusRow label="ConfigMaps" enabled={syncFromHost?.configMaps?.enabled} />
                    <StatusRow label="Secrets" enabled={syncFromHost?.secrets?.enabled} />
                    <StatusRow label="Nodes" enabled={syncFromHost?.nodes?.enabled} />
                    <StatusRow label="CSI Drivers" enabled={syncFromHost?.csiDrivers?.enabled} />
                    <StatusRow label="CSI Nodes" enabled={syncFromHost?.csiNodes?.enabled} />
                    <StatusRow label="StorageClasses" enabled={syncFromHost?.storageClasses?.enabled} />
                    <StatusRow label="IngressClasses" enabled={syncFromHost?.ingressClasses?.enabled} />
                    <StatusRow label="RuntimeClasses" enabled={syncFromHost?.runtimeClasses?.enabled} />
                    <StatusRow label="PriorityClasses" enabled={syncFromHost?.priorityClasses?.enabled} />
                  </Flex>
                </Grid.Item>
              </Grid.Root>
            </CardBody>
          </Card>
        </Grid.Item>

        {/* Policies */}
        <Grid.Item colSpan="12">
          <Card>
            <CardBody>
              <SectionHeading icon={<RiShieldCheckLine size={20} />}>Policies</SectionHeading>

              <Grid.Root columns="12" gap="4">
                <Grid.Item colSpan={{ xs: '12', md: '4' }}>
                  <SubHeading>Resource Quota</SubHeading>
                  <Box mb="2">
                    <FieldLabel>Status</FieldLabel>
                    <StatusIndicator enabled={policies?.resourceQuota?.enabled} />
                  </Box>
                  {policies?.resourceQuota?.enabled && policies?.resourceQuota?.quota && (
                    <>
                      <Box my="2">
                        <hr className={styles.hr} />
                      </Box>
                      <Flex direction="column">
                        {Object.entries(policies.resourceQuota.quota).map(([key, value]) => (
                          <KeyValueRow key={key} label={key} value={String(value)} />
                        ))}
                      </Flex>
                    </>
                  )}
                </Grid.Item>

                <Grid.Item colSpan={{ xs: '12', md: '4' }}>
                  <SubHeading>Limit Range</SubHeading>
                  <Box mb="2">
                    <FieldLabel>Status</FieldLabel>
                    <StatusIndicator enabled={policies?.limitRange?.enabled} />
                  </Box>
                  {policies?.limitRange?.enabled && (
                    <>
                      <Box my="2">
                        <hr className={styles.hr} />
                      </Box>
                      {policies?.limitRange?.default && (
                        <>
                          <Box mb="1">
                            <Text as="div" variant="body-x-small" color="secondary" weight="bold">
                              Default Limits
                            </Text>
                          </Box>
                          <Flex direction="column">
                            {Object.entries(policies.limitRange.default).map(([key, value]) => (
                              <KeyValueRow key={key} label={key} value={String(value)} />
                            ))}
                          </Flex>
                        </>
                      )}
                      {policies?.limitRange?.defaultRequest && (
                        <>
                          <Box mt="2" mb="1">
                            <Text as="div" variant="body-x-small" color="secondary" weight="bold">
                              Default Requests
                            </Text>
                          </Box>
                          <Flex direction="column">
                            {Object.entries(policies.limitRange.defaultRequest).map(([key, value]) => (
                              <KeyValueRow key={key} label={key} value={String(value)} />
                            ))}
                          </Flex>
                        </>
                      )}
                    </>
                  )}
                </Grid.Item>

                <Grid.Item colSpan={{ xs: '12', md: '4' }}>
                  <SubHeading>Network Policy</SubHeading>
                  <Box mb="2">
                    <FieldLabel>Status</FieldLabel>
                    <StatusIndicator enabled={policies?.networkPolicy?.enabled} />
                  </Box>
                  {policies?.networkPolicy?.enabled && (
                    <>
                      <Box my="2">
                        <hr className={styles.hr} />
                      </Box>
                      <Box mb="2">
                        <Text variant="body-x-small" color="secondary" weight="bold">
                          Fallback DNS
                        </Text>{' '}
                        <Text variant="body-x-small">
                          {policies?.networkPolicy?.fallbackDns || 'N/A'}
                        </Text>
                      </Box>

                      {/* Outgoing Connections */}
                      {policies?.networkPolicy?.outgoingConnections?.ipBlock && (
                        <Box mb="2" mt="1">
                          <Text as="div" variant="body-x-small" color="secondary" weight="bold">
                            Outgoing Connections
                          </Text>
                          <Text as="div" variant="body-x-small" color="secondary">
                            CIDR: {policies.networkPolicy.outgoingConnections.ipBlock.cidr || 'N/A'}
                          </Text>
                          {policies.networkPolicy.outgoingConnections.ipBlock.except &&
                            policies.networkPolicy.outgoingConnections.ipBlock.except.length > 0 && (
                              <Box mt="1">
                                <Text as="div" variant="body-x-small" color="secondary">
                                  Exceptions ({policies.networkPolicy.outgoingConnections.ipBlock.except.length}):
                                </Text>
                                <Flex gap="1" mt="1" style={{ flexWrap: 'wrap' }}>
                                  {policies.networkPolicy.outgoingConnections.ipBlock.except.map(
                                    (cidr: string, idx: number) => (
                                      <Badge key={idx}>{cidr}</Badge>
                                    ),
                                  )}
                                </Flex>
                              </Box>
                            )}
                        </Box>
                      )}

                      {/* Extra Rules */}
                      {policies?.networkPolicy?.extraControlPlaneRules &&
                        policies.networkPolicy.extraControlPlaneRules.length > 0 && (
                          <Box mb="2" mt="1">
                            <FieldLabel>Extra Control Plane Rules</FieldLabel>
                            <Badge>{`${policies.networkPolicy.extraControlPlaneRules.length} rule(s)`}</Badge>
                          </Box>
                        )}

                      {policies?.networkPolicy?.extraWorkloadRules &&
                        policies.networkPolicy.extraWorkloadRules.length > 0 && (
                          <Box mb="2" mt="1">
                            <FieldLabel>Extra Workload Rules</FieldLabel>
                            <Badge>{`${policies.networkPolicy.extraWorkloadRules.length} rule(s)`}</Badge>
                          </Box>
                        )}
                    </>
                  )}
                </Grid.Item>
              </Grid.Root>
            </CardBody>
          </Card>
        </Grid.Item>

        {/* vCluster Plugins */}
        {Object.keys(plugins).length > 0 && (
          <Grid.Item colSpan="12">
            <Card>
              <CardBody>
                <SectionHeading icon={<RiPlugLine size={20} />}>vCluster Plugins</SectionHeading>

                <Grid.Root columns="12" gap="4">
                  {Object.entries(plugins).map(([pluginName, pluginConfig]: [string, any]) => (
                    <Grid.Item colSpan={{ xs: '12', md: '6' }} key={pluginName}>
                      <Box mb="2">
                        <FieldLabel>{pluginName}</FieldLabel>
                        <Badge>{pluginConfig?.image || 'Configured'}</Badge>
                        {pluginConfig?.version && (
                          <Text as="div" variant="body-x-small" color="secondary">
                            Version: {pluginConfig.version}
                          </Text>
                        )}
                      </Box>
                    </Grid.Item>
                  ))}
                </Grid.Root>
              </CardBody>
            </Card>
          </Grid.Item>
        )}

        {/* Raw vCluster Configuration (Collapsed by default) */}
        {vclusterConfigYaml && (
          <Grid.Item colSpan="12">
            <Accordion>
              <AccordionTrigger>
                <Flex align="center" gap="2">
                  <RiCodeSSlashLine size={18} />
                  <Text variant="title-small">Raw vCluster Configuration (YAML)</Text>
                </Flex>
              </AccordionTrigger>
              <AccordionPanel>
                <Box width="100%">
                  <Box mb="2">
                    <Text as="div" variant="body-small" color="secondary">
                      Complete Helm values applied to virtual clusters in this group
                    </Text>
                  </Box>
                  <Box className={styles.codeContainer}>
                    <SyntaxHighlighter
                      language="yaml"
                      style={theme.palette.type === 'dark' ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    >
                      {vclusterConfigYaml}
                    </SyntaxHighlighter>
                  </Box>
                </Box>
              </AccordionPanel>
            </Accordion>
          </Grid.Item>
        )}
      </Grid.Root>
    </Box>
  );
};
