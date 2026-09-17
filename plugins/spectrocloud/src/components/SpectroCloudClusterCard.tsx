import { useState, useEffect, useCallback, Fragment, type ReactNode } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  InfoCard,
  StatusOK,
  StatusError,
  StatusWarning,
  StatusPending,
  Progress,
  ResponseErrorPanel,
  Link,
} from '@backstage/core-components';
import {
  Alert,
  Badge,
  Box,
  Button,
  ButtonIcon,
  Flex,
  Grid,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCodeLine,
  RiDownloadCloud2Line,
  RiFileTextLine,
  RiHardDriveLine,
  RiLockLine,
  RiPuzzleLine,
  RiRefreshLine,
  RiSparklingLine,
  RiStackLine,
} from '@remixicon/react';
import { saveAs } from 'file-saver';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
// BUI-EXCEPTION: `react-syntax-highlighter`'s `style` prop needs a literal JS style object
// (light/dark theme constant), which cannot be derived from a CSS custom property. `useTheme`
// is kept narrowly for this one boolean.
import { useTheme } from '@material-ui/core/styles';
import {
  spectroCloudApiRef,
  SpectroCloudClusterDetails,
  SpectroCloudProfile,
  SpectroCloudClusterProfilesResponse,
  SpectroCloudProfileWithPacks,
  SpectroCloudPackWithMeta,
} from '../api';
import {
  useCanDownloadKubeconfig,
  useCanViewPackValues,
  useCanViewPackManifests,
} from './PermissionGuards';
import styles from './SpectroCloudClusterCard.module.css';

interface ProfileVersionInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpgrade: boolean;
}

interface PackContent {
  values?: string;
  manifests: Map<string, string>;
}

const getStatusComponent = (state: string) => {
  const lowerState = state.toLowerCase();
  if (lowerState === 'running' || lowerState === 'healthy' || lowerState === 'ready') {
    return <StatusOK />;
  }
  if (lowerState === 'error' || lowerState === 'failed' || lowerState === 'unhealthy') {
    return <StatusError />;
  }
  if (lowerState === 'warning' || lowerState === 'degraded') {
    return <StatusWarning />;
  }
  return <StatusPending />;
};

const getLayerChipClass = (layer: string): string => {
  const lowerLayer = layer.toLowerCase();
  if (lowerLayer === 'os') return styles.osLayer;
  if (lowerLayer === 'k8s') return styles.k8sLayer;
  if (lowerLayer === 'cni') return styles.cniLayer;
  if (lowerLayer === 'csi') return styles.csiLayer;
  return styles.addonLayer;
};

export const SpectroCloudClusterCard = () => {
  const theme = useTheme();
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);
  const spectroCloudApi = useApi(spectroCloudApiRef);

  // Permission hooks - track both allowed and loading states
  const { allowed: canDownloadKubeconfig, loading: kubeconfigPermLoading } = useCanDownloadKubeconfig();
  const { allowed: canViewPackValues } = useCanViewPackValues();
  const { allowed: canViewPackManifests } = useCanViewPackManifests();

  const [clusterDetails, setClusterDetails] = useState<SpectroCloudClusterDetails | null>(null);
  const [profilesInfo, setProfilesInfo] = useState<Map<string, SpectroCloudProfile>>(new Map());
  const [clusterProfiles, setClusterProfiles] = useState<SpectroCloudClusterProfilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [packContents, setPackContents] = useState<Map<string, PackContent>>(new Map());
  const [loadingPacks, setLoadingPacks] = useState<Set<string>>(new Set());
  const [activePackTabs, setActivePackTabs] = useState<Map<string, string>>(new Map());

  // Get annotation prefix from config or use default
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const annotations = entity.metadata.annotations || {};

  // Extract minimal cluster identification from annotations
  const clusterUid = annotations[`${annotationPrefix}/cluster-id`] || '';
  const projectUid = annotations[`${annotationPrefix}/project-id`] || '';
  const instanceName = annotations[`${annotationPrefix}/instance`];

  // Fetch cluster details and profile info from backend API
  const fetchData = useCallback(async () => {
    if (!clusterUid) {
      setError(new Error('No cluster ID found in entity annotations'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch cluster details
      const details = await spectroCloudApi.getClusterDetails(
        clusterUid,
        projectUid || undefined,
        instanceName,
      );
      setClusterDetails(details);

      // Fetch cluster profiles with pack metadata (only if user has permission)
      if (canViewPackValues) {
        try {
          const profilesWithPacks = await spectroCloudApi.getClusterProfiles(
            clusterUid,
            projectUid || undefined,
            instanceName,
          );
          setClusterProfiles(profilesWithPacks);
        } catch (profilesErr) {
          // Permission denied or error - continue without pack details
          // eslint-disable-next-line no-console
          console.warn('Failed to fetch cluster profiles (may be permissions):', profilesErr);
        }
      }

      // Get profile names from cluster to fetch their version info
      const profileNames = details.spec?.clusterProfileTemplates
        ?.map(p => p.name)
        .filter((name): name is string => !!name) || [];

      if (profileNames.length > 0) {
        try {
          const profiles = await spectroCloudApi.searchProfiles(
            profileNames,
            projectUid || undefined,
            instanceName,
          );

          const profileMap = new Map<string, SpectroCloudProfile>();
          profiles.forEach(p => {
            if (p.metadata?.name) {
              profileMap.set(p.metadata.name, p);
            }
          });
          setProfilesInfo(profileMap);
        } catch (profileErr) {
          // Non-fatal - we can still show cluster data without profile version info
          // eslint-disable-next-line no-console
          console.warn('Failed to fetch profile version info:', profileErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch cluster details'));
    } finally {
      setLoading(false);
    }
  }, [clusterUid, projectUid, instanceName, spectroCloudApi, canViewPackValues]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get version info for a profile
  const getProfileVersionInfo = (profileName: string, profileUid: string): ProfileVersionInfo => {
    const profileData = profilesInfo.get(profileName);

    if (!profileData?.specSummary?.versions) {
      return {
        currentVersion: 'N/A',
        latestVersion: 'N/A',
        hasUpgrade: false,
      };
    }

    const versions = profileData.specSummary.versions;

    // Find the current version being used (match by uid)
    const currentVersionData = versions.find(v => v.uid === profileUid);
    const currentVersion = currentVersionData?.version || 'N/A';

    const compareVersions = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

    const latestVersion = versions?.reduce((max: string | null, v) => {
      const version = v?.version;
      if (!version) return max;
      return !max || compareVersions(version, max) > 0 ? version : max;
    }, null) ?? 'N/A';

    // Check if there's a newer version available
    const hasUpgrade = currentVersion !== 'N/A' && latestVersion !== 'N/A' && compareVersions(latestVersion, currentVersion) > 0;

    return {
      currentVersion,
      latestVersion,
      hasUpgrade,
    };
  };

  const toggleProfileExpansion = (profileUid: string) => {
    setExpandedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profileUid)) {
        newSet.delete(profileUid);
      } else {
        newSet.add(profileUid);
      }
      return newSet;
    });
  };

  const togglePackExpansion = async (packKey: string, pack: SpectroCloudPackWithMeta) => {
    // Check if user has permission to view pack values
    if (!canViewPackValues) {
      return; // Don't expand if no permission
    }

    const isExpanding = !expandedPacks.has(packKey);

    setExpandedPacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(packKey)) {
        newSet.delete(packKey);
      } else {
        newSet.add(packKey);
      }
      return newSet;
    });

    // If expanding and we don't have content yet, fetch it
    if (isExpanding && !packContents.has(packKey)) {
      setLoadingPacks(prev => new Set(prev).add(packKey));

      try {
        const content: PackContent = {
          values: pack.spec.values,
          manifests: new Map(),
        };

        // Fetch manifest contents for manifest type packs (only if user has permission)
        if (canViewPackManifests && pack.spec.type === 'manifest' && pack.spec.manifests && pack.spec.manifests.length > 0) {
          for (const manifest of pack.spec.manifests) {
            try {
              const manifestContent = await spectroCloudApi.getPackManifest(
                clusterUid,
                manifest.uid,
                projectUid || undefined,
                instanceName,
              );
              if (manifestContent?.spec?.published?.content) {
                content.manifests.set(manifest.uid, manifestContent.spec.published.content);
              }
            } catch (manifestErr) {
              // eslint-disable-next-line no-console
              console.warn(`Failed to fetch manifest ${manifest.name}:`, manifestErr);
            }
          }
        }

        setPackContents(prev => new Map(prev).set(packKey, content));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch pack content:', err);
      } finally {
        setLoadingPacks(prev => {
          const newSet = new Set(prev);
          newSet.delete(packKey);
          return newSet;
        });
      }
    }
  };

  const handleTabChange = (packKey: string, newValue: string) => {
    setActivePackTabs(prev => new Map(prev).set(packKey, newValue));
  };

  const handleDownloadKubeconfig = async () => {
    setDownloading(true);
    setDownloadError(null);

    try {
      const kubeconfig = await spectroCloudApi.getKubeconfig(
        clusterUid,
        projectUid || undefined,
        instanceName,
        true,
      );

      const blob = new Blob([kubeconfig], { type: 'application/x-yaml' });
      const filename = `${entity.metadata.name}-kubeconfig.yaml`;
      saveAs(blob, filename);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download kubeconfig');
    } finally {
      setDownloading(false);
    }
  };

  const getProfileIcon = (type?: string) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType === 'infra') {
      return <RiHardDriveLine size={16} className={styles.profileIcon} />;
    }
    if (lowerType === 'add-on' || lowerType === 'addon') {
      return <RiPuzzleLine size={16} className={styles.profileIcon} />;
    }
    return <RiStackLine size={16} className={styles.profileIcon} />;
  };

  const getProfileRowClass = (type?: string): string => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType === 'infra') {
      return styles.infraProfileRow;
    }
    return styles.addonProfileRow;
  };

  const renderPackContent = (packKey: string, pack: SpectroCloudPackWithMeta) => {
    const content = packContents.get(packKey);
    const isLoading = loadingPacks.has(packKey);
    const syntaxStyle = theme.palette.type === 'dark' ? vscDarkPlus : vs;

    if (isLoading) {
      return (
        <Box className={styles.loadingContainer}>
          <Progress />
          <Text variant="body-small" style={{ marginLeft: 'var(--bui-space-2)' }}>
            Loading pack content...
          </Text>
        </Box>
      );
    }

    if (!content) {
      return (
        <Text variant="body-small" className={styles.noContent}>
          No content available
        </Text>
      );
    }

    // Build tabs based on available content
    const tabs: { id: string; label: string; content: string; icon: React.ReactNode }[] = [];

    if (content.values) {
      tabs.push({
        id: 'values',
        label: 'Values',
        content: content.values,
        icon: <RiCodeLine size={14} />,
      });
    }

    // Add manifest tabs
    if (pack.spec.manifests && pack.spec.manifests.length > 0) {
      pack.spec.manifests.forEach(manifest => {
        const manifestContent = content.manifests.get(manifest.uid);
        if (manifestContent) {
          tabs.push({
            id: `manifest-${manifest.uid}`,
            label: manifest.name,
            content: manifestContent,
            icon: <RiFileTextLine size={14} />,
          });
        }
      });
    }

    if (tabs.length === 0) {
      return (
        <Text variant="body-small" className={styles.noContent}>
          No values or manifests available for this pack
        </Text>
      );
    }

    const activeTabId = activePackTabs.get(packKey) || tabs[0].id;

    return (
      <Box>
        <Tabs selectedKey={activeTabId} onSelectionChange={key => handleTabChange(packKey, String(key))}>
          <TabList>
            {tabs.map(tab => (
              <Tab key={tab.id} id={tab.id}>
                <Flex align="center" gap="1">
                  {tab.icon}
                  {tab.label}
                </Flex>
              </Tab>
            ))}
          </TabList>
          {tabs.map(tab => (
            <TabPanel key={tab.id} id={tab.id}>
              <Box className={styles.codeContainer}>
                <SyntaxHighlighter
                  language="yaml"
                  style={syntaxStyle}
                  showLineNumbers
                  wrapLines
                  customStyle={{
                    margin: 0,
                    borderRadius: 4,
                  }}
                >
                  {tab.content}
                </SyntaxHighlighter>
              </Box>
            </TabPanel>
          ))}
        </Tabs>
      </Box>
    );
  };

  if (loading) {
    return (
      <InfoCard title="SpectroCloud Cluster">
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    // Check if it's a permissions/not found error
    const errorMessage = error.message || '';
    const isPermissionError =
      errorMessage.includes('Cluster not found') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('403') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('401');

    if (isPermissionError) {
      return (
        <InfoCard title="SpectroCloud Cluster">
          <Alert
            status="info"
            description={
              <Box>
                <Text variant="body-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
                  You don't have permission to view this cluster in Spectro Cloud, or it may not exist in your accessible scope.
                </Text>
                <Text variant="body-small" style={{ display: 'block' }}>
                  This could be because:
                </Text>
                <Box as="ul" style={{ marginTop: 'var(--bui-space-2)', marginBottom: 'var(--bui-space-2)' }}>
                  <li>
                    <Text variant="body-small">
                      The cluster exists in a project you don't have access to
                    </Text>
                  </li>
                  <li>
                    <Text variant="body-small">
                      Your Spectro Cloud credentials don't have the required permissions
                    </Text>
                  </li>
                  <li>
                    <Text variant="body-small">
                      The cluster has been deleted from Spectro Cloud
                    </Text>
                  </li>
                </Box>
                <Text variant="body-small">
                  Visit the{' '}
                  <Link to="/spectrocloud/clusters">
                    Cluster Viewer
                  </Link>
                  {' '}to see all clusters you have access to.
                </Text>
              </Box>
            }
          />
        </InfoCard>
      );
    }

    return (
      <InfoCard title="SpectroCloud Cluster">
        <ResponseErrorPanel error={error} />
      </InfoCard>
    );
  }

  // Extract data from fetched cluster details
  const scope = clusterDetails?.metadata?.annotations?.scope || 'Unknown';
  const cloudType = clusterDetails?.spec?.cloudConfig?.cloudType || 'Unknown';
  const state = clusterDetails?.status?.state || 'Unknown';
  const k8sVersion = clusterDetails?.status?.kubeMeta?.kubernetesVersion || 'N/A';
  const profiles: SpectroCloudProfileWithPacks[] = clusterProfiles?.profiles || [];

  const kubeconfigButton = canDownloadKubeconfig ? (
    <>
      <Button
        variant="primary"
        iconStart={<RiDownloadCloud2Line />}
        onPress={handleDownloadKubeconfig}
        isDisabled={downloading || !clusterUid}
        isPending={downloading}
        style={{ marginTop: 'var(--bui-space-2)' }}
      >
        {downloading ? 'Downloading...' : 'Download Kubeconfig'}
      </Button>
      {downloadError && (
        <Text variant="body-small" color="danger" style={{ display: 'block', marginTop: 'var(--bui-space-2)' }}>
          {downloadError}
        </Text>
      )}
    </>
  ) : (
    <TooltipTrigger>
      <Button
        variant="secondary"
        iconStart={<RiLockLine />}
        isDisabled
        style={{ marginTop: 'var(--bui-space-2)' }}
      >
        Download Kubeconfig (Permission Required)
      </Button>
      <Tooltip>You don't have permission to download kubeconfig</Tooltip>
    </TooltipTrigger>
  );

  return (
    <InfoCard
      title="SpectroCloud Cluster"
      action={
        <TooltipTrigger>
          <ButtonIcon
            aria-label="Refresh"
            icon={<RiRefreshLine />}
            size="small"
            onPress={fetchData}
          />
          <Tooltip>Refresh</Tooltip>
        </TooltipTrigger>
      }
    >
      <Grid.Root columns="12" gap="4">
        {/* Status */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Status
          </Text>
          <Flex align="center" gap="2">
            {getStatusComponent(state)}
            <Text variant="body-medium">{state}</Text>
          </Flex>
        </Grid.Item>

        {/* Cloud Type */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Cloud Type
          </Text>
          <Text variant="body-medium">{cloudType.toUpperCase()}</Text>
        </Grid.Item>

        {/* Scope */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Scope
          </Text>
          <Badge className={scope === 'tenant' ? undefined : styles.accentBadge}>{scope}</Badge>
        </Grid.Item>

        {/* Project */}
        {scope === 'project' && projectUid && (
          <Grid.Item colSpan="6">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Project ID
            </Text>
            <Text variant="body-medium">{projectUid}</Text>
          </Grid.Item>
        )}

        {/* Kubernetes Version */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Kubernetes Version
          </Text>
          <Text variant="body-medium">{k8sVersion}</Text>
        </Grid.Item>

        <Grid.Item colSpan="12">
          <hr className={styles.divider} />
        </Grid.Item>

        {/* Attached Profiles */}
        <Grid.Item colSpan="12">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Attached Profiles ({profiles.length})
          </Text>
          {profiles.length > 0 ? (
            <Box mt="2" style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={`${styles.tableCell} ${styles.expandCell}`} />
                    <th className={styles.tableCell}>Profile Name</th>
                    <th className={styles.tableCell}>Version</th>
                    <th className={styles.tableCell}>Type</th>
                    <th className={styles.tableCell} style={{ textAlign: 'right' }}>Packs</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile, index) => {
                    const profileKey = profile.metadata?.uid || `profile-${index}`;
                    const isExpanded = expandedProfiles.has(profileKey);
                    const hasPacks = !!profile.spec?.packs && profile.spec.packs.length > 0;
                    const versionInfo = getProfileVersionInfo(
                      profile.metadata?.name || '',
                      profile.metadata?.uid || ''
                    );

                    return (
                      <Fragment key={profileKey}>
                        <tr
                          className={getProfileRowClass(profile.spec?.type)}
                          onClick={() => hasPacks && toggleProfileExpansion(profileKey)}
                        >
                          <td className={`${styles.tableCell} ${styles.expandCell}`}>
                            {hasPacks && (
                              isExpanded ? <RiArrowDownSLine size={16} /> : <RiArrowRightSLine size={16} />
                            )}
                          </td>
                          <td className={styles.tableCell}>
                            {getProfileIcon(profile.spec?.type)}
                            <strong>{profile.metadata?.name}</strong>
                          </td>
                          <td className={styles.tableCell}>
                            <Flex align="center" gap="1">
                              <Badge size="small" className={styles.currentVersionBadge}>
                                {versionInfo.currentVersion}
                              </Badge>
                              {versionInfo.hasUpgrade && (
                                <TooltipTrigger>
                                  <Flex align="center">
                                    <RiSparklingLine size={16} className={styles.upgradeIcon} />
                                    <Badge size="small" className={styles.upgradeBadge}>
                                      {`→ ${versionInfo.latestVersion}`}
                                    </Badge>
                                  </Flex>
                                  <Tooltip>{`Upgrade available: ${versionInfo.latestVersion}`}</Tooltip>
                                </TooltipTrigger>
                              )}
                            </Flex>
                          </td>
                          <td className={styles.tableCell}>
                            <Badge size="small" className={profile.spec?.type === 'infra' ? styles.accentBadge : undefined}>
                              {profile.spec?.type || 'unknown'}
                            </Badge>
                          </td>
                          <td className={styles.tableCell} style={{ textAlign: 'right' }}>
                            {profile.spec?.packs?.length || 0}
                          </td>
                        </tr>
                        {hasPacks && (
                          <tr className={styles.expandedRow}>
                            <td className={styles.tableCell} style={{ paddingTop: 0, paddingBottom: 0 }} colSpan={5}>
                              {isExpanded && (
                                <Box p="4">
                                  <Text variant="body-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
                                    Packs / Layers
                                  </Text>
                                  <table className={`${styles.table} ${styles.packTable}`}>
                                    <thead>
                                      <tr className={styles.packTableHeader}>
                                        <th className={`${styles.tableCell} ${styles.expandCell}`} />
                                        <th className={styles.tableCell}>Layer</th>
                                        <th className={styles.tableCell}>Pack Name</th>
                                        <th className={styles.tableCell}>Version</th>
                                        <th className={styles.tableCell}>Type</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {profile.spec?.packs?.map((pack, packIdx) => {
                                        const packKey = `${profileKey}-${pack.metadata?.uid || packIdx}`;
                                        const isPackExpanded = expandedPacks.has(packKey);
                                        let expandIcon: ReactNode;
                                        if (!canViewPackValues) {
                                          expandIcon = (
                                            <TooltipTrigger>
                                              <span>
                                                <RiLockLine size={14} style={{ color: 'var(--bui-fg-secondary)' }} />
                                              </span>
                                              <Tooltip>Permission required to view pack values</Tooltip>
                                            </TooltipTrigger>
                                          );
                                        } else if (isPackExpanded) {
                                          expandIcon = <RiArrowDownSLine size={16} />;
                                        } else {
                                          expandIcon = <RiArrowRightSLine size={16} />;
                                        }

                                        return (
                                          <Fragment key={packKey}>
                                            <tr
                                              className={styles.packRow}
                                              onClick={() => canViewPackValues && togglePackExpansion(packKey, pack)}
                                              style={{ cursor: canViewPackValues ? 'pointer' : 'default' }}
                                            >
                                              <td className={`${styles.tableCell} ${styles.expandCell}`}>
                                                {expandIcon}
                                              </td>
                                              <td className={styles.tableCell}>
                                                <Badge size="small" className={`${styles.layerChip} ${getLayerChipClass(pack.spec?.layer || '')}`}>
                                                  {pack.spec?.layer || 'addon'}
                                                </Badge>
                                              </td>
                                              <td className={styles.tableCell}>{pack.spec?.name || pack.metadata?.name}</td>
                                              <td className={styles.tableCell}>{pack.spec?.version || 'N/A'}</td>
                                              <td className={styles.tableCell}>
                                                <Text variant="body-x-small" color="secondary">
                                                  {pack.spec?.type || 'N/A'}
                                                </Text>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td className={styles.tableCell} style={{ paddingTop: 0, paddingBottom: 0 }} colSpan={5}>
                                                {isPackExpanded && (
                                                  <Box className={styles.packExpandedContent}>
                                                    {renderPackContent(packKey, pack)}
                                                  </Box>
                                                )}
                                              </td>
                                            </tr>
                                          </Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </Box>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          ) : (
            <Text variant="body-small" color="secondary">
              No profiles attached
            </Text>
          )}
        </Grid.Item>

        {/* Download Kubeconfig Button */}
        <Grid.Item colSpan="12">
          {kubeconfigPermLoading ? <Progress /> : kubeconfigButton}
        </Grid.Item>
      </Grid.Root>
    </InfoCard>
  );
};

export default SpectroCloudClusterCard;
