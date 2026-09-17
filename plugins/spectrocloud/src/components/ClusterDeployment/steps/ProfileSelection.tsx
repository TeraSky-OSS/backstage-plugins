import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Alert,
  Badge,
  Box,
  Button,
  ButtonIcon,
  Combobox,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Flex,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { RiAddLine, RiCodeLine, RiDeleteBinLine, RiFileTextLine, RiStackLine } from '@remixicon/react';
// BUI-EXCEPTION: `react-syntax-highlighter`'s `style` prop needs a literal JS style object
// (light/dark theme constant), which cannot be derived from a CSS custom property. `useTheme`
// is kept narrowly for this one boolean.
import { useTheme } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { SpectroCloudProfile } from '../../../api/SpectroCloudApi';
import { CloudType, ProfileSelection as ProfileSelectionType } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './ProfileSelection.module.css';

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

const getLayerChipClass = (layer: string): string => {
  const lowerLayer = layer?.toLowerCase() || '';
  if (lowerLayer === 'os') return styles.osLayer;
  if (lowerLayer === 'k8s') return styles.k8sLayer;
  if (lowerLayer === 'cni') return styles.cniLayer;
  if (lowerLayer === 'csi') return styles.csiLayer;
  return styles.addonLayer;
};

export const ProfileSelection = ({
  cloudType,
  projectUid,
  selectedProfiles,
  onUpdate,
}: ProfileSelectionProps) => {
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
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [packContents, setPackContents] = useState<Map<string, PackContent>>(new Map());
  const [loadingPacks, setLoadingPacks] = useState<Set<string>>(new Set());
  const [activePackTabs, setActivePackTabs] = useState<Map<string, number>>(new Map());

  // Calculate profile type filter based on selected profiles (but don't trigger on changes)
  const hasClusterOrInfraProfile = selectedProfiles.some(
    p => p.type === 'cluster' || p.type === 'infra'
  );
  const profileTypeFilter: string | undefined = hasClusterOrInfraProfile ? 'add-on' : undefined;

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spectroCloudApi, cloudType, projectUid, profileTypeFilter]);

  const handleAddProfile = () => {
    setDialogOpen(true);
    setSelectedProfile(undefined);
    setSelectedVersionUid('');
    setProfileDetails(undefined);
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
      // eslint-disable-next-line no-console
      console.error('Failed to load profile details:', err);
    } finally {
      setLoadingDetails(false);
    }
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
      scope: selectedProfile.metadata.annotations?.scope || 'project',
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

  const handleProfileExpand = async (profileUid: string, profileIndex: number, isExpanded: boolean) => {
    // Update expanded state
    setExpandedProfiles(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(profileUid);
      } else {
        newSet.delete(profileUid);
      }
      return newSet;
    });

    const profile = selectedProfiles[profileIndex];

    if (!isExpanded || !profile) {
      return; // Closing accordion or no profile
    }

    // Check if we already have packs loaded (non-empty array)
    if (profile.packs && profile.packs.length > 0) {
      return;
    }

    setLoadingProfilePacks({ ...loadingProfilePacks, [profileUid]: true });

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
      // eslint-disable-next-line no-console
      console.error('Failed to load profile packs:', err);
    } finally {
      const updatedLoading = { ...loadingProfilePacks };
      delete updatedLoading[profileUid];
      setLoadingProfilePacks(updatedLoading);
    }
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

  const renderPackContent = (packKey: string, pack: any) => {
    const content = packContents.get(packKey);
    const isLoading = loadingPacks.has(packKey);
    const activeTab = activePackTabs.get(packKey) || 0;
    const syntaxStyle = theme.palette.type === 'dark' ? vscDarkPlus : vs;

    if (isLoading) {
      return (
        <Flex align="center" justify="center" p="4">
          <Progress />
          <Text style={{ marginLeft: 8 }}>Loading pack content...</Text>
        </Flex>
      );
    }

    if (!content) {
      return <Text className={styles.noContent}>No content available</Text>;
    }

    // Build tabs based on available content
    const tabs: { label: string; content: string; icon?: React.ReactNode }[] = [];

    if (content.values) {
      tabs.push({
        label: 'Values',
        content: content.values,
        icon: <RiCodeLine size={14} />,
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
            icon: <RiFileTextLine size={14} />,
          });
        } else {
          // Show placeholder for manifest that will be available post-deployment
          tabs.push({
            label: `${manifest.name} (post-deploy)`,
            content: '# Manifest content will be available after cluster deployment',
            icon: <RiFileTextLine size={14} />,
          });
        }
      });
    }

    if (tabs.length === 0) {
      return <Text className={styles.noContent}>No values or manifests available for this pack</Text>;
    }

    const activeIndex = Math.min(activeTab, tabs.length - 1);

    return (
      <Box style={{ width: '100%' }}>
        {tabs.length > 1 ? (
          <Tabs
            selectedKey={String(activeIndex)}
            onSelectionChange={key => handleTabChange(packKey, Number(key))}
          >
            <TabList className={styles.tabsContainer}>
              {tabs.map((tab, index) => (
                <Tab key={index} id={String(index)}>
                  <Flex align="center" gap="1">
                    {tab.icon}
                    {tab.label}
                  </Flex>
                </Tab>
              ))}
            </TabList>
            {tabs.map((tab, index) => (
              <TabPanel key={index} id={String(index)}>
                <Box className={styles.codeContainer}>
                  <SyntaxHighlighter
                    language="yaml"
                    style={syntaxStyle}
                    showLineNumbers
                    wrapLines
                    customStyle={{ margin: 0, borderRadius: 4 }}
                  >
                    {tab.content}
                  </SyntaxHighlighter>
                </Box>
              </TabPanel>
            ))}
          </Tabs>
        ) : (
          <Box className={styles.codeContainer}>
            <SyntaxHighlighter
              language="yaml"
              style={syntaxStyle}
              showLineNumbers
              wrapLines
              customStyle={{ margin: 0, borderRadius: 4 }}
            >
              {tabs[activeIndex]?.content || ''}
            </SyntaxHighlighter>
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Progress />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p="4">
        <Alert status="danger" description={error} />
      </Box>
    );
  }

  return (
    <Box p="4">
      <Text variant="title-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        Select Cluster Profiles
      </Text>
      <Text variant="body-medium" color="secondary" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        {!hasClusterOrInfraProfile
          ? 'First, select a full cluster profile or an infrastructure profile. Then you can add addon profiles.'
          : 'Add addon profiles to extend your cluster functionality.'}
      </Text>

      {selectedProfiles.length > 0 && (
        <Box className={styles.selectedList}>
          {selectedProfiles.map((profile, index) => {
            const packsContent = profile.packs && profile.packs.length > 0 ? (
              <>
                <Text variant="body-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
                  <RiStackLine size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Packs in this profile ({profile.packs.length})
                </Text>
                {profile.packs.map((pack: any, idx: number) => {
                  const packKey = `${profile.uid}-${pack.uid || pack.name || idx}`;
                  const isPackExpanded = expandedPacks.has(packKey);

                  return (
                    <Accordion
                      key={packKey}
                      bg="neutral"
                      isExpanded={isPackExpanded}
                      onExpandedChange={isExpanded => {
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
                      <AccordionTrigger>
                        <Flex align="center" gap="2" style={{ width: '100%' }}>
                          <Badge className={`${styles.layerChip} ${getLayerChipClass(pack.layer || '')}`}>
                            {pack.layer || 'addon'}
                          </Badge>
                          <Text variant="body-small">
                            <strong>{pack.name}</strong> - v{pack.tag || pack.version}
                          </Text>
                          {pack.type && (
                            <Badge className={styles.typeBadge} style={{ marginLeft: 'auto' }}>
                              {pack.type}
                            </Badge>
                          )}
                        </Flex>
                      </AccordionTrigger>
                      <AccordionPanel>
                        <Box bg="neutral" p="4" style={{ width: '100%' }}>
                          {isPackExpanded && renderPackContent(packKey, pack)}
                        </Box>
                      </AccordionPanel>
                    </Accordion>
                  );
                })}
              </>
            ) : (
              <Text variant="body-small" color="secondary">
                Expand to load pack details...
              </Text>
            );

            return (
              <Box key={profile.uid} style={{ position: 'relative' }}>
                <Accordion
                  isExpanded={expandedProfiles.has(profile.uid)}
                  onExpandedChange={isExpanded => handleProfileExpand(profile.uid, index, isExpanded)}
                >
                  <AccordionTrigger>
                    <Flex direction="column" gap="1" style={{ paddingRight: 'var(--bui-space-8)' }}>
                      <Text weight="bold">{profile.name}</Text>
                      <Flex align="center" gap="1">
                        <Badge>{`v${profile.version}`}</Badge>
                        <Badge>{profile.type}</Badge>
                      </Flex>
                    </Flex>
                  </AccordionTrigger>
                  <AccordionPanel>
                    <Box style={{ width: '100%' }}>
                      {loadingProfilePacks[profile.uid] ? (
                        <Flex align="center" justify="center" p="4">
                          <Progress />
                        </Flex>
                      ) : packsContent}
                    </Box>
                  </AccordionPanel>
                </Accordion>
                <TooltipTrigger>
                  <ButtonIcon
                    aria-label="Remove profile"
                    icon={<RiDeleteBinLine />}
                    size="small"
                    variant="tertiary"
                    style={{ position: 'absolute', top: 'var(--bui-space-2)', right: 'var(--bui-space-2)' }}
                    onPress={() => handleRemoveProfile(index)}
                  />
                  <Tooltip>Remove profile</Tooltip>
                </TooltipTrigger>
              </Box>
            );
          })}
        </Box>
      )}

      <Box style={{ marginTop: 'var(--bui-space-4)' }}>
        <Button variant="primary" iconStart={<RiAddLine />} onPress={handleAddProfile}>
          Add Profile
        </Button>
      </Box>

      <Dialog isOpen={dialogOpen} onOpenChange={open => !open && setDialogOpen(false)} width="600px">
        <DialogHeader>
          {hasClusterOrInfraProfile ? 'Add Addon Profile' : 'Add Base Profile (Cluster or Infrastructure)'}
        </DialogHeader>
        <DialogBody>
          <Flex direction="column" gap="4">
            <Combobox
              label="Profile *"
              placeholder="Search profiles..."
              options={profiles
                .filter(p => !selectedProfiles.some(sp => sp.uid === p.metadata.uid))
                .map(p => ({ id: p.metadata.uid, label: p.metadata.name }))}
              selectedKey={selectedProfile?.metadata.uid ?? null}
              onSelectionChange={key => {
                if (key !== null) {
                  const profile = profiles.find(p => p.metadata.uid === String(key));
                  if (profile) {
                    handleProfileChange(profile);
                  }
                }
              }}
            />

            {selectedProfile && selectedProfile.specSummary?.versions && (
              <Combobox
                label="Version *"
                placeholder="Search versions..."
                options={selectedProfile.specSummary.versions.map(v => ({ id: v.uid, label: v.version }))}
                selectedKey={selectedVersionUid || null}
                onSelectionChange={key => {
                  if (key !== null) {
                    handleVersionChange(String(key));
                  }
                }}
              />
            )}

            {loadingDetails && (
              <Flex align="center" justify="center" p="4">
                <Progress />
              </Flex>
            )}

            {profileDetails && (
              <Box>
                <Text variant="body-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
                  <RiStackLine size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Packs in this profile ({profileDetails.spec?.published?.packs?.length || 0})
                </Text>
                {profileDetails.spec?.published?.packs?.map((pack: any, idx: number) => (
                  <Accordion key={idx} bg="neutral">
                    <AccordionTrigger>
                      <Flex align="center" gap="2" style={{ width: '100%' }}>
                        <Badge className={`${styles.layerChip} ${getLayerChipClass(pack.layer || '')}`}>
                          {pack.layer || 'addon'}
                        </Badge>
                        <Text>
                          <strong>{pack.name}</strong> - v{pack.tag || pack.version}
                        </Text>
                        {pack.type && (
                          <Badge className={styles.typeBadge} style={{ marginLeft: 'auto' }}>
                            {pack.type}
                          </Badge>
                        )}
                      </Flex>
                    </AccordionTrigger>
                    <AccordionPanel>
                      <Box bg="neutral" p="4" style={{ width: '100%' }}>
                        {pack.values ? (
                          <Box className={styles.codeContainer}>
                            <SyntaxHighlighter
                              language="yaml"
                              style={theme.palette.type === 'dark' ? vscDarkPlus : vs}
                              showLineNumbers
                              wrapLines
                              customStyle={{ margin: 0, borderRadius: 4 }}
                            >
                              {pack.values}
                            </SyntaxHighlighter>
                          </Box>
                        ) : (
                          <Text className={styles.noContent}>No custom values</Text>
                        )}
                      </Box>
                    </AccordionPanel>
                  </Accordion>
                ))}
              </Box>
            )}
          </Flex>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onPress={handleConfirmAdd}
            isDisabled={!selectedProfile || !selectedVersionUid}
          >
            Add
          </Button>
        </DialogFooter>
      </Dialog>
    </Box>
  );
};
