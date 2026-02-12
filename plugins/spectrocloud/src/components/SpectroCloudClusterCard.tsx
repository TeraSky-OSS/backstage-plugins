import React, { useState, useEffect, useCallback } from 'react';
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
  Grid,
  Typography,
  Chip,
  Button,
  CircularProgress,
  makeStyles,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import LayersIcon from '@material-ui/icons/Layers';
import StorageIcon from '@material-ui/icons/Storage';
import ExtensionIcon from '@material-ui/icons/Extension';
import RefreshIcon from '@material-ui/icons/Refresh';
import NewReleasesIcon from '@material-ui/icons/NewReleases';
import DescriptionIcon from '@material-ui/icons/Description';
import CodeIcon from '@material-ui/icons/Code';
import LockIcon from '@material-ui/icons/Lock';
import { saveAs } from 'file-saver';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

const useStyles = makeStyles(theme => ({
  chip: {
    margin: theme.spacing(0.5),
  },
  infoRow: {
    marginBottom: theme.spacing(1),
  },
  label: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  value: {
    color: theme.palette.text.primary,
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  downloadButton: {
    marginTop: theme.spacing(2),
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  profileTable: {
    marginTop: theme.spacing(1),
  },
  tableHeader: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#f5f5f5',
  },
  infraProfileRow: {
    backgroundColor: theme.palette.type === 'dark' ? '#1a3a1a' : '#e8f5e9',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#2d4a2d' : '#c8e6c9',
    },
  },
  addonProfileRow: {
    backgroundColor: theme.palette.type === 'dark' ? '#1a237e' : '#e3f2fd',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#283593' : '#bbdefb',
    },
  },
  expandCell: {
    width: 48,
    padding: theme.spacing(0, 1),
  },
  expandedRow: {
    backgroundColor: theme.palette.type === 'dark' ? '#252525' : '#fafafa',
  },
  packTable: {
    marginBottom: theme.spacing(1),
  },
  packTableHeader: {
    backgroundColor: theme.palette.type === 'dark' ? '#333' : '#eee',
  },
  packRow: {
    cursor: 'pointer',
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.type === 'dark' ? '#2a2a2a' : '#f9f9f9',
    },
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#3a3a3a' : '#e8e8e8',
    },
  },
  profileTypeChip: {
    marginLeft: theme.spacing(1),
    fontSize: '0.7rem',
    height: 20,
  },
  layerChip: {
    fontSize: '0.7rem',
    height: 20,
    textTransform: 'uppercase',
  },
  osLayer: {
    backgroundColor: '#ff9800',
    color: '#fff',
  },
  k8sLayer: {
    backgroundColor: '#2196f3',
    color: '#fff',
  },
  cniLayer: {
    backgroundColor: '#9c27b0',
    color: '#fff',
  },
  csiLayer: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  addonLayer: {
    backgroundColor: '#607d8b',
    color: '#fff',
  },
  profileIcon: {
    marginRight: theme.spacing(1),
    verticalAlign: 'middle',
  },
  refreshButton: {
    marginLeft: theme.spacing(1),
  },
  versionCell: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  versionChip: {
    fontSize: '0.75rem',
    height: 22,
  },
  currentVersion: {
    backgroundColor: theme.palette.type === 'dark' ? '#2d4a22' : '#c8e6c9',
  },
  upgradeIcon: {
    color: '#ff9800',
    fontSize: '1.2rem',
    marginLeft: theme.spacing(0.5),
  },
  upgradeAvailableChip: {
    backgroundColor: '#ff9800',
    color: '#fff',
    fontSize: '0.65rem',
    height: 18,
    marginLeft: theme.spacing(0.5),
  },
  latestVersionText: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginLeft: theme.spacing(0.5),
  },
  packExpandedContent: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? '#1a1a1a' : '#fafafa',
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  codeContainer: {
    maxHeight: 400,
    overflow: 'auto',
    borderRadius: 4,
    '& pre': {
      margin: '0 !important',
      fontSize: '12px !important',
    },
  },
  tabsContainer: {
    marginBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  tab: {
    minHeight: 36,
    textTransform: 'none',
  },
  manifestTab: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  noContent: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

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

const getLayerChipClass = (layer: string, classes: ReturnType<typeof useStyles>): string => {
  const lowerLayer = layer.toLowerCase();
  if (lowerLayer === 'os') return classes.osLayer;
  if (lowerLayer === 'k8s') return classes.k8sLayer;
  if (lowerLayer === 'cni') return classes.cniLayer;
  if (lowerLayer === 'csi') return classes.csiLayer;
  return classes.addonLayer;
};

export const SpectroCloudClusterCard = () => {
  const classes = useStyles();
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
  const [activePackTabs, setActivePackTabs] = useState<Map<string, number>>(new Map());

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
    const latestVersion = profileData.specSummary.version || versions[0]?.version || 'N/A';
    
    // Find the current version being used (match by uid)
    const currentVersionData = versions.find(v => v.uid === profileUid);
    const currentVersion = currentVersionData?.version || 'N/A';
    
    // Check if there's a newer version available
    const hasUpgrade = currentVersion !== latestVersion && latestVersion !== 'N/A' && currentVersion !== 'N/A';

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
              console.warn(`Failed to fetch manifest ${manifest.name}:`, manifestErr);
            }
          }
        }

        setPackContents(prev => new Map(prev).set(packKey, content));
      } catch (err) {
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

  const handleTabChange = (packKey: string, newValue: number) => {
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
      return <StorageIcon fontSize="small" className={classes.profileIcon} />;
    }
    if (lowerType === 'add-on' || lowerType === 'addon') {
      return <ExtensionIcon fontSize="small" className={classes.profileIcon} />;
    }
    return <LayersIcon fontSize="small" className={classes.profileIcon} />;
  };

  const getProfileRowClass = (type?: string): string => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType === 'infra') {
      return classes.infraProfileRow;
    }
    return classes.addonProfileRow;
  };

  const renderPackContent = (packKey: string, pack: SpectroCloudPackWithMeta) => {
    const content = packContents.get(packKey);
    const isLoading = loadingPacks.has(packKey);
    const activeTab = activePackTabs.get(packKey) || 0;
    const syntaxStyle = theme.palette.type === 'dark' ? vscDarkPlus : vs;

    if (isLoading) {
      return (
        <Box className={classes.loadingContainer}>
          <CircularProgress size={24} />
          <Typography variant="body2" style={{ marginLeft: 8 }}>
            Loading pack content...
          </Typography>
        </Box>
      );
    }

    if (!content) {
      return (
        <Typography className={classes.noContent}>
          No content available
        </Typography>
      );
    }

    // Build tabs based on available content
    const tabs: { label: string; content: string; icon?: React.ReactNode }[] = [];
    
    if (content.values) {
      tabs.push({
        label: 'Values',
        content: content.values,
        icon: <CodeIcon fontSize="small" />,
      });
    }

    // Add manifest tabs
    if (pack.spec.manifests && pack.spec.manifests.length > 0) {
      pack.spec.manifests.forEach(manifest => {
        const manifestContent = content.manifests.get(manifest.uid);
        if (manifestContent) {
          tabs.push({
            label: manifest.name,
            content: manifestContent,
            icon: <DescriptionIcon fontSize="small" />,
          });
        }
      });
    }

    if (tabs.length === 0) {
      return (
        <Typography className={classes.noContent}>
          No values or manifests available for this pack
        </Typography>
      );
    }

    return (
      <Box>
        <Tabs
          value={Math.min(activeTab, tabs.length - 1)}
          onChange={(_, newValue) => handleTabChange(packKey, newValue)}
          className={classes.tabsContainer}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              className={classes.tab}
              label={
                <Box className={classes.manifestTab}>
                  {tab.icon}
                  {tab.label}
                </Box>
              }
            />
          ))}
        </Tabs>
        <Box className={classes.codeContainer}>
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
            {tabs[Math.min(activeTab, tabs.length - 1)]?.content || ''}
          </SyntaxHighlighter>
        </Box>
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
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              You don't have permission to view this cluster in Spectro Cloud, or it may not exist in your accessible scope.
            </Typography>
            <Typography variant="body2">
              This could be because:
            </Typography>
            <Box component="ul" style={{ marginTop: 8, marginBottom: 8 }}>
              <li>
                <Typography variant="body2">
                  The cluster exists in a project you don't have access to
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Your Spectro Cloud credentials don't have the required permissions
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  The cluster has been deleted from Spectro Cloud
                </Typography>
              </li>
            </Box>
            <Typography variant="body2">
              Visit the{' '}
              <Link to="/spectrocloud/clusters">
                Cluster Viewer
              </Link>
              {' '}to see all clusters you have access to.
            </Typography>
          </Alert>
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

  return (
    <InfoCard 
      title="SpectroCloud Cluster"
      action={
        <IconButton 
          onClick={fetchData} 
          size="small" 
          title="Refresh"
          className={classes.refreshButton}
        >
          <RefreshIcon />
        </IconButton>
      }
    >
      <Grid container spacing={2}>
        {/* Status */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Status
          </Typography>
          <Box className={classes.statusContainer}>
            {getStatusComponent(state)}
            <Typography variant="body1" className={classes.value}>
              {state}
            </Typography>
          </Box>
        </Grid>

        {/* Cloud Type */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Cloud Type
          </Typography>
          <Typography variant="body1" className={classes.value}>
            {cloudType.toUpperCase()}
          </Typography>
        </Grid>

        {/* Scope */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Scope
          </Typography>
          <Chip 
            label={scope} 
            size="small"
            color={scope === 'tenant' ? 'secondary' : 'primary'}
          />
        </Grid>

        {/* Project */}
        {scope === 'project' && projectUid && (
          <Grid item xs={6}>
            <Typography variant="body2" className={classes.label}>
              Project ID
            </Typography>
            <Typography variant="body1" className={classes.value}>
              {projectUid}
            </Typography>
          </Grid>
        )}

        {/* Kubernetes Version */}
        <Grid item xs={6}>
          <Typography variant="body2" className={classes.label}>
            Kubernetes Version
          </Typography>
          <Typography variant="body1" className={classes.value}>
            {k8sVersion}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Divider className={classes.divider} />
        </Grid>

        {/* Attached Profiles */}
        <Grid item xs={12}>
          <Typography variant="body2" className={classes.label}>
            Attached Profiles ({profiles.length})
          </Typography>
          {profiles.length > 0 ? (
            <TableContainer component={Paper} className={classes.profileTable}>
              <Table size="small">
                <TableHead>
                  <TableRow className={classes.tableHeader}>
                    <TableCell className={classes.expandCell}></TableCell>
                    <TableCell>Profile Name</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Packs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profiles.map((profile, index) => {
                    const profileKey = profile.metadata?.uid || `profile-${index}`;
                    const isExpanded = expandedProfiles.has(profileKey);
                    const hasPacks = profile.spec?.packs && profile.spec.packs.length > 0;
                    const versionInfo = getProfileVersionInfo(
                      profile.metadata?.name || '',
                      profile.metadata?.uid || ''
                    );
                    
                    return (
                      <React.Fragment key={profileKey}>
                        <TableRow 
                          className={getProfileRowClass(profile.spec?.type)}
                          onClick={() => hasPacks && toggleProfileExpansion(profileKey)}
                        >
                          <TableCell className={classes.expandCell}>
                            {hasPacks && (
                              <IconButton size="small" aria-label="expand row">
                                {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell>
                            {getProfileIcon(profile.spec?.type)}
                            <strong>{profile.metadata?.name}</strong>
                          </TableCell>
                          <TableCell>
                            <Box className={classes.versionCell}>
                              <Chip
                                label={versionInfo.currentVersion}
                                size="small"
                                className={`${classes.versionChip} ${classes.currentVersion}`}
                              />
                              {versionInfo.hasUpgrade && (
                                <Tooltip title={`Upgrade available: ${versionInfo.latestVersion}`}>
                                  <Box display="flex" alignItems="center">
                                    <NewReleasesIcon className={classes.upgradeIcon} />
                                    <Chip
                                      label={`→ ${versionInfo.latestVersion}`}
                                      size="small"
                                      className={classes.upgradeAvailableChip}
                                    />
                                  </Box>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={profile.spec?.type || 'unknown'}
                              size="small"
                              className={classes.profileTypeChip}
                              color={profile.spec?.type === 'infra' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {profile.spec?.packs?.length || 0}
                          </TableCell>
                        </TableRow>
                        {hasPacks && (
                          <TableRow className={classes.expandedRow}>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box margin={2}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Packs / Layers
                                  </Typography>
                                  <Table size="small" className={classes.packTable}>
                                    <TableHead>
                                      <TableRow className={classes.packTableHeader}>
                                        <TableCell className={classes.expandCell}></TableCell>
                                        <TableCell>Layer</TableCell>
                                        <TableCell>Pack Name</TableCell>
                                        <TableCell>Version</TableCell>
                                        <TableCell>Type</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {profile.spec?.packs?.map((pack, packIdx) => {
                                        const packKey = `${profileKey}-${pack.metadata?.uid || packIdx}`;
                                        const isPackExpanded = expandedPacks.has(packKey);
                                        
                                        return (
                                          <React.Fragment key={packKey}>
                                            <TableRow 
                                              className={classes.packRow}
                                              onClick={() => canViewPackValues && togglePackExpansion(packKey, pack)}
                                              style={{ cursor: canViewPackValues ? 'pointer' : 'default' }}
                                            >
                                              <TableCell className={classes.expandCell}>
                                                {canViewPackValues ? (
                                                  <IconButton size="small" aria-label="expand pack">
                                                    {isPackExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                                  </IconButton>
                                                ) : (
                                                  <Tooltip title="Permission required to view pack values">
                                                    <LockIcon fontSize="small" color="disabled" />
                                                  </Tooltip>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                <Chip
                                                  label={pack.spec?.layer || 'addon'}
                                                  size="small"
                                                  className={`${classes.layerChip} ${getLayerChipClass(pack.spec?.layer || '', classes)}`}
                                                />
                                              </TableCell>
                                              <TableCell>{pack.spec?.name || pack.metadata?.name}</TableCell>
                                              <TableCell>{pack.spec?.version || 'N/A'}</TableCell>
                                              <TableCell>
                                                <Typography variant="caption" color="textSecondary">
                                                  {pack.spec?.type || 'N/A'}
                                                </Typography>
                                              </TableCell>
                                            </TableRow>
                                            <TableRow>
                                              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                                                <Collapse in={isPackExpanded} timeout="auto" unmountOnExit>
                                                  <Box className={classes.packExpandedContent}>
                                                    {renderPackContent(packKey, pack)}
                                                  </Box>
                                                </Collapse>
                                              </TableCell>
                                            </TableRow>
                                          </React.Fragment>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No profiles attached
            </Typography>
          )}
        </Grid>

        {/* Download Kubeconfig Button */}
        <Grid item xs={12}>
          {kubeconfigPermLoading ? (
            <CircularProgress size={20} />
          ) : canDownloadKubeconfig ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
                onClick={handleDownloadKubeconfig}
                disabled={downloading || !clusterUid}
                className={classes.downloadButton}
              >
                {downloading ? 'Downloading...' : 'Download Kubeconfig'}
              </Button>
              {downloadError && (
                <Typography variant="body2" color="error" style={{ marginTop: 8 }}>
                  {downloadError}
                </Typography>
              )}
            </>
          ) : (
            <Tooltip title="You don't have permission to download kubeconfig">
              <span>
                <Button
                  variant="contained"
                  color="default"
                  startIcon={<LockIcon />}
                  disabled
                  className={classes.downloadButton}
                >
                  Download Kubeconfig (Permission Required)
                </Button>
              </span>
            </Tooltip>
          )}
        </Grid>
      </Grid>
    </InfoCard>
  );
};

export default SpectroCloudClusterCard;
