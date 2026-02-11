import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@material-ui/core';
import { Alert, Autocomplete } from '@material-ui/lab';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CodeIcon from '@material-ui/icons/Code';
import DescriptionIcon from '@material-ui/icons/Description';
import LayersIcon from '@material-ui/icons/Layers';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { SpectroCloudProfile } from '../../../api/SpectroCloudApi';
import { CloudType, ProfileSelection as ProfileSelectionType } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  selectedList: {
    marginTop: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  addButton: {
    marginTop: theme.spacing(2),
  },
  dialogContent: {
    minWidth: 500,
  },
  formControl: {
    marginTop: theme.spacing(2),
    minWidth: 300,
    width: '100%',
  },
  packAccordion: {
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.type === 'dark' ? '#2a2a2a' : '#f9f9f9',
  },
  packValues: {
    maxHeight: 400,
    overflow: 'auto',
  },
  packExpandedContent: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? '#1a1a1a' : '#fafafa',
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
  layerChip: {
    fontSize: '0.7rem',
    height: 20,
    marginRight: theme.spacing(0.5),
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
}));

interface ProfileSelectionProps {
  cloudType: CloudType;
  projectUid: string;
  selectedProfiles: ProfileSelectionType[];
  onUpdate: (profiles: ProfileSelectionType[]) => void;
}

interface PackContent {
  values?: string;
  manifests: Map<string, string>;
}

export const ProfileSelection = ({
  cloudType,
  projectUid,
  selectedProfiles,
  onUpdate,
}: ProfileSelectionProps) => {
  const classes = useStyles();
  const theme = useTheme();
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [profiles, setProfiles] = useState<SpectroCloudProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SpectroCloudProfile>();
  const [selectedVersionUid, setSelectedVersionUid] = useState<string>('');
  const [profileDetails, setProfileDetails] = useState<any>();
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingProfilePacks, setLoadingProfilePacks] = useState<Record<string, boolean>>({});
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [packContents, setPackContents] = useState<Map<string, PackContent>>(new Map());
  const [loadingPacks, setLoadingPacks] = useState<Set<string>>(new Set());
  const [activePackTabs, setActivePackTabs] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        // Determine which profile types to fetch based on what's already selected
        let profileTypeFilter: string | undefined;
        
        const hasClusterOrInfraProfile = selectedProfiles.some(
          p => p.type === 'cluster' || p.type === 'infra'
        );
        
        if (hasClusterOrInfraProfile) {
          // Once a cluster/infra profile is selected, only show addon profiles
          profileTypeFilter = 'add-on';
        }
        // If no profiles selected yet, show cluster and infra profiles only
        // (addon profiles can only be added after base is selected)
        
        // For addon profiles, don't filter by cloud type (they're cloud-agnostic)
        const cloudTypeFilter = profileTypeFilter === 'add-on' ? undefined : cloudType;
        
        const result = await spectroCloudApi.getProjectProfiles(
          projectUid,
          cloudTypeFilter,
          profileTypeFilter
        );
        // Sort profiles alphabetically by name
        const sortedProfiles = result.sort((a, b) => 
          a.metadata.name.localeCompare(b.metadata.name)
        );
        setProfiles(sortedProfiles);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [spectroCloudApi, cloudType, projectUid, selectedProfiles]);

  const handleAddProfile = () => {
    setDialogOpen(true);
    setSelectedProfile(undefined);
    setSelectedVersionUid('');
    setProfileDetails(undefined);
  };

  const handleProfileChange = async (profile: SpectroCloudProfile) => {
    setSelectedProfile(profile);
    
    // Auto-select the latest version (first in the list)
    const latestVersion = profile.specSummary?.versions?.[0];
    
    if (latestVersion) {
      setSelectedVersionUid(latestVersion.uid);
      // Auto-fetch details for the latest version
      handleVersionChange(latestVersion.uid);
    } else {
      // If no versions array, use the profile UID itself as the version UID
      const versionUid = profile.metadata.uid;
      setSelectedVersionUid(versionUid);
      handleVersionChange(versionUid);
    }
  };

  const handleVersionChange = async (versionUid: string) => {
    setSelectedVersionUid(versionUid);
    
    if (!selectedProfile) return;

    try {
      setLoadingDetails(true);
      const details = await spectroCloudApi.getProfileWithPacks(
        selectedProfile.metadata.uid,
        versionUid,
        projectUid,
      );
      setProfileDetails(details);
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!selectedProfile || !selectedVersionUid) return;

    const version = selectedProfile.specSummary?.versions?.find(
      v => v.uid === selectedVersionUid,
    );

    const newProfile: ProfileSelectionType = {
      uid: selectedProfile.metadata.uid,
      name: selectedProfile.metadata.name,
      version: version?.version || '',
      versionUid: selectedVersionUid,
      cloudType: selectedProfile.spec?.published?.cloudType || cloudType,
      type: selectedProfile.spec?.published?.type || 'cluster',
      // Don't set packs here - let them load when the accordion is expanded
    };

    onUpdate([...selectedProfiles, newProfile]);
    setDialogOpen(false);
    // Reset dialog state
    setSelectedProfile(undefined);
    setSelectedVersionUid('');
    setProfileDetails(undefined);
  };

  const handleRemoveProfile = (index: number) => {
    const updated = [...selectedProfiles];
    updated.splice(index, 1);
    onUpdate(updated);
  };

  const handleProfileExpand = async (profileIndex: number, isExpanded: boolean) => {
    const profile = selectedProfiles[profileIndex];
    
    if (!isExpanded || !profile) {
      return; // Closing accordion or no profile
    }

    // Check if we already have packs loaded (non-empty array)
    if (profile.packs && profile.packs.length > 0) {
      return;
    }

    setLoadingProfilePacks({ ...loadingProfilePacks, [profileIndex]: true });

    try {
      const details = await spectroCloudApi.getProfileWithPacks(
        profile.uid,
        profile.versionUid,
        projectUid,
      );

      const updated = [...selectedProfiles];
      updated[profileIndex] = {
        ...updated[profileIndex],
        packs: details.spec?.published?.packs || [],
      };
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to load profile packs:', err);
    } finally {
      const updatedLoading = { ...loadingProfilePacks };
      delete updatedLoading[profileIndex];
      setLoadingProfilePacks(updatedLoading);
    }
  };

  const getLayerChipClass = (layer: string): string => {
    const lowerLayer = layer?.toLowerCase() || '';
    if (lowerLayer === 'os') return classes.osLayer;
    if (lowerLayer === 'k8s') return classes.k8sLayer;
    if (lowerLayer === 'cni') return classes.cniLayer;
    if (lowerLayer === 'csi') return classes.csiLayer;
    return classes.addonLayer;
  };

  const handleTabChange = (packKey: string, newValue: number) => {
    setActivePackTabs(prev => new Map(prev).set(packKey, newValue));
  };

  const togglePackExpansion = async (packKey: string, pack: any) => {
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
          values: pack.values,
          manifests: new Map(),
        };

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

  const renderPackContent = (packKey: string, pack: any) => {
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

    // Show manifest placeholders for manifest type packs
    if (pack.type === 'manifest' && pack.manifests && pack.manifests.length > 0) {
      pack.manifests.forEach((manifest: any) => {
        const manifestContent = content.manifests.get(manifest.uid);
        if (manifestContent) {
          tabs.push({
            label: manifest.name,
            content: manifestContent,
            icon: <DescriptionIcon fontSize="small" />,
          });
        } else {
          // Show placeholder for manifest that will be available post-deployment
          tabs.push({
            label: `${manifest.name} (post-deploy)`,
            content: '# Manifest content will be available after cluster deployment',
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
        {tabs.length > 1 && (
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
        )}
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={classes.root}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const hasClusterOrInfraProfile = selectedProfiles.some(
    p => p.type === 'cluster' || p.type === 'infra'
  );

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Select Cluster Profiles
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {!hasClusterOrInfraProfile
          ? 'First, select a full cluster profile or an infrastructure profile. Then you can add addon profiles.'
          : 'Add addon profiles to extend your cluster functionality.'}
      </Typography>

      {selectedProfiles.length > 0 && (
        <Box className={classes.selectedList}>
          {selectedProfiles.map((profile, index) => (
            <Accordion 
              key={index}
              onChange={(_, isExpanded) => handleProfileExpand(index, isExpanded)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Box>
                    <Typography variant="subtitle1">{profile.name}</Typography>
                    <Box mt={0.5}>
                      <Chip label={`v${profile.version}`} size="small" />
                      {' '}
                      <Chip label={profile.type} size="small" color="primary" />
                    </Box>
                  </Box>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveProfile(index);
                    }}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box width="100%">
                  {loadingProfilePacks[index] ? (
                    <Box display="flex" justifyContent="center" padding={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : profile.packs && profile.packs.length > 0 ? (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        <LayersIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Packs in this profile ({profile.packs.length})
                      </Typography>
                      {profile.packs.map((pack: any, idx: number) => {
                        const packKey = `${profile.uid}-${pack.uid || idx}`;
                        const isPackExpanded = expandedPacks.has(packKey);
                        
                        return (
                          <Accordion 
                            key={idx} 
                            className={classes.packAccordion}
                            onChange={(_, isExpanded) => {
                              if (isExpanded) {
                                togglePackExpansion(packKey, pack);
                              } else {
                                setExpandedPacks(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(packKey);
                                  return newSet;
                                });
                              }
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box display="flex" alignItems="center" width="100%">
                                <Chip
                                  label={pack.layer || 'addon'}
                                  size="small"
                                  className={`${classes.layerChip} ${getLayerChipClass(pack.layer || '')}`}
                                />
                                <Typography variant="body2" style={{ marginLeft: 8 }}>
                                  <strong>{pack.name}</strong> - v{pack.tag || pack.version}
                                </Typography>
                                {pack.type && (
                                  <Chip label={pack.type} size="small" variant="outlined" style={{ marginLeft: 'auto' }} />
                                )}
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box className={classes.packExpandedContent} width="100%">
                                {isPackExpanded && renderPackContent(packKey, pack)}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </>
                  ) : (
                    <Typography color="textSecondary" variant="body2">
                      Expand to load pack details...
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleAddProfile}
        className={classes.addButton}
      >
        Add Profile
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {hasClusterOrInfraProfile ? 'Add Addon Profile' : 'Add Base Profile (Cluster or Infrastructure)'}
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <Autocomplete
            options={profiles.filter(p => !selectedProfiles.some(sp => sp.uid === p.metadata.uid))}
            getOptionLabel={(option) => option.metadata.name}
            value={selectedProfile || null}
            onChange={(_, newValue) => {
              if (newValue) {
                handleProfileChange(newValue);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Profile *"
                margin="normal"
                required
              />
            )}
            style={{ marginTop: 16 }}
          />

          {selectedProfile && selectedProfile.specSummary?.versions && (
            <Autocomplete
              options={selectedProfile.specSummary.versions}
              getOptionLabel={(option) => option.version}
              value={selectedProfile.specSummary.versions.find(v => v.uid === selectedVersionUid) || null}
              onChange={(_, newValue) => {
                if (newValue) {
                  handleVersionChange(newValue.uid);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Version *"
                  margin="normal"
                  required
                />
              )}
              style={{ marginTop: 16 }}
            />
          )}

          {loadingDetails && (
            <Box display="flex" justifyContent="center" padding={2}>
              <CircularProgress />
            </Box>
          )}

          {profileDetails && (
            <Box marginTop={2}>
              <Typography variant="subtitle2" gutterBottom>
                <LayersIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Packs in this profile ({profileDetails.spec?.published?.packs?.length || 0})
              </Typography>
              {profileDetails.spec?.published?.packs?.map((pack: any, idx: number) => (
                <Accordion key={idx} className={classes.packAccordion}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Chip
                        label={pack.layer || 'addon'}
                        size="small"
                        className={`${classes.layerChip} ${getLayerChipClass(pack.layer || '')}`}
                      />
                      <Typography style={{ marginLeft: 8 }}>
                        <strong>{pack.name}</strong> - v{pack.tag || pack.version}
                      </Typography>
                      {pack.type && (
                        <Chip label={pack.type} size="small" variant="outlined" style={{ marginLeft: 'auto' }} />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box className={classes.packExpandedContent} width="100%">
                      {pack.values ? (
                        <Box className={classes.codeContainer}>
                          <SyntaxHighlighter
                            language="yaml"
                            style={theme.palette.type === 'dark' ? vscDarkPlus : vs}
                            showLineNumbers
                            wrapLines
                            customStyle={{
                              margin: 0,
                              borderRadius: 4,
                            }}
                          >
                            {pack.values}
                          </SyntaxHighlighter>
                        </Box>
                      ) : (
                        <Typography className={classes.noContent}>
                          No custom values
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAdd}
            color="primary"
            variant="contained"
            disabled={!selectedProfile || !selectedVersionUid}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
