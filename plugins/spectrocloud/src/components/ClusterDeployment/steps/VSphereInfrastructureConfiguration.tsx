import { useEffect, useState } from 'react';
import type { Key } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Alert,
  Badge,
  Box,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  CardHeader,
  Combobox,
  Flex,
  Grid,
  NumberField,
  Select,
  Switch,
  Tag,
  TagGroup,
  Text,
  TextField,
} from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import {
  RiAddLine,
  RiBriefcaseLine,
  RiCloudLine,
  RiDeleteBinLine,
  RiHardDriveLine,
  RiShieldCheckLine,
  RiSettings3Line,
  RiTimeLine,
  RiWifiLine,
} from '@remixicon/react';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { WorkerPoolConfig } from '../types';
import styles from './VSphereInfrastructureConfiguration.module.css';

interface VSphereInfrastructureConfigurationProps {
  cloudAccountUid: string;
  projectUid: string;
  controlPlaneConfig: Record<string, any>;
  workerPools: WorkerPoolConfig[];
  cloudConfig: Record<string, any>;
  tfMetadata?: {
    sshKeyName?: string;
    sshKeyContext?: 'tenant' | 'project';
    pcgUid?: string;
    pcgName?: string;
    ipPools?: Record<string, string>;
  };
  onUpdate: (updates: {
    controlPlaneConfig?: Record<string, any>;
    workerPools?: WorkerPoolConfig[];
    cloudConfig?: Record<string, any>;
    tfMetadata?: {
      sshKeyName?: string;
      sshKeyContext?: 'tenant' | 'project';
      pcgUid?: string;
      pcgName?: string;
      ipPools?: Record<string, string>;
    };
  }) => void;
}

interface VSphereMetadata {
  datacenters: Array<{
    datacenter: string;
    folders: string[];
    computeclusters: string[];
  }>;
}

interface ClusterResources {
  datastores: string[];
  networks: string[];
  resourcePools: string[];
}

interface IPPool {
  name: string;
  uid: string;
}

interface Taint {
  key: string;
  value: string;
  effect: 'NoSchedule' | 'NoExecute' | 'PreferNoSchedule';
}

const TAINT_EFFECT_OPTIONS = [
  { id: 'NoSchedule', label: 'NoSchedule' },
  { id: 'NoExecute', label: 'NoExecute' },
  { id: 'PreferNoSchedule', label: 'PreferNoSchedule' },
];

/**
 * A combobox over a plain string list. Supports two modes:
 * - strict selection (must pick one of `options`)
 * - `allowsCustomValue` ("freeSolo"): the field behaves as a plain text input
 *   with suggestions, and every keystroke is committed via `onChange`.
 */
function StringCombobox({
  label,
  options,
  value,
  onChange,
  isRequired,
  isDisabled,
  description,
  allowsCustomValue,
  placeholder,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  description?: string;
  allowsCustomValue?: boolean;
  placeholder?: string;
}) {
  const comboOptions = options.map(opt => ({ id: opt, label: opt }));

  if (allowsCustomValue) {
    return (
      <Combobox
        options={comboOptions}
        label={label}
        isRequired={isRequired}
        isDisabled={isDisabled}
        description={description}
        placeholder={placeholder}
        allowsCustomValue
        search={{ inputValue: value, onInputChange: onChange }}
      />
    );
  }

  return (
    <Combobox
      options={comboOptions}
      label={label}
      isRequired={isRequired}
      isDisabled={isDisabled}
      description={description}
      placeholder={placeholder}
      selectedKey={value || null}
      onSelectionChange={(key: Key | null) => {
        if (key !== null && key !== undefined) {
          onChange(String(key));
        }
      }}
    />
  );
}

/**
 * A combobox over a list of objects (e.g. SSH keys, IP pools), selected by a
 * strict, unique identifier.
 */
function ObjectCombobox<T>({
  label,
  options,
  getOptionId,
  getOptionLabel,
  selectedId,
  onSelect,
  isRequired,
  description,
}: {
  label: string;
  options: T[];
  getOptionId: (option: T) => string;
  getOptionLabel: (option: T) => string;
  selectedId: string | null | undefined;
  onSelect: (option: T) => void;
  isRequired?: boolean;
  description?: string;
}) {
  return (
    <Combobox
      options={options.map(o => ({ id: getOptionId(o), label: getOptionLabel(o) }))}
      label={label}
      isRequired={isRequired}
      description={description}
      selectedKey={selectedId ?? null}
      onSelectionChange={(key: Key | null) => {
        if (key === null || key === undefined) return;
        const found = options.find(o => getOptionId(o) === key);
        if (found) onSelect(found);
      }}
    />
  );
}

/** A repeatable key/value list editor, used for node labels & annotations. */
function KeyValueEditor({
  title,
  entries,
  onAdd,
  onKeyChange,
  onValueChange,
  onRemove,
  addButtonLabel,
}: {
  title: string;
  entries: Record<string, string>;
  onAdd: () => void;
  onKeyChange: (oldKey: string, newKey: string) => void;
  onValueChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  addButtonLabel: string;
}) {
  return (
    <Box style={{ width: '100%' }}>
      <Text variant="body-small" weight="bold" as="div" style={{ marginBottom: 'var(--bui-space-2)' }}>
        {title}
      </Text>
      {Object.entries(entries).map(([key, value], idx) => (
        <Flex key={idx} align="center" gap="2" mb="2">
          <Box style={{ flexGrow: 1 }}>
            <TextField
              label="Key"
              value={key}
              size="small"
              onChange={newKey => onKeyChange(key, newKey)}
            />
          </Box>
          <Box style={{ flexGrow: 1 }}>
            <TextField
              label="Value"
              value={value}
              size="small"
              onChange={newValue => onValueChange(key, newValue)}
            />
          </Box>
          <ButtonIcon
            icon={<RiDeleteBinLine />}
            onPress={() => onRemove(key)}
            size="small"
            aria-label={`Remove ${key || 'entry'}`}
          />
        </Flex>
      ))}
      <Button iconStart={<RiAddLine />} onPress={onAdd} size="small">
        {addButtonLabel}
      </Button>
    </Box>
  );
}

/** A repeatable taints (key/value/effect) list editor. */
function TaintsEditor({
  taints,
  onChange,
}: {
  taints: Taint[];
  onChange: (taints: Taint[]) => void;
}) {
  return (
    <Box style={{ width: '100%' }}>
      <Text variant="body-small" color="secondary" as="div" style={{ marginBottom: 'var(--bui-space-2)' }}>
        Taints prevent pods from being scheduled on these nodes unless they have matching tolerations
      </Text>
      {taints.map((taint, idx) => (
        <Grid.Root key={idx} columns="12" gap="2" style={{ marginBottom: 'var(--bui-space-2)' }}>
          <Grid.Item colSpan={{ xs: '12', md: '4' }}>
            <TextField
              label="Key"
              value={taint.key}
              size="small"
              onChange={val => {
                const updated = [...taints];
                updated[idx] = { ...updated[idx], key: val };
                onChange(updated);
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan={{ xs: '12', md: '3' }}>
            <TextField
              label="Value"
              value={taint.value}
              size="small"
              onChange={val => {
                const updated = [...taints];
                updated[idx] = { ...updated[idx], value: val };
                onChange(updated);
              }}
            />
          </Grid.Item>
          <Grid.Item colSpan={{ xs: '9', md: '3' }}>
            <Select
              label="Effect"
              selectedKey={taint.effect}
              onSelectionChange={key => {
                const updated = [...taints];
                updated[idx] = { ...updated[idx], effect: String(key) as Taint['effect'] };
                onChange(updated);
              }}
              options={TAINT_EFFECT_OPTIONS}
            />
          </Grid.Item>
          <Grid.Item colSpan={{ xs: '3', md: '2' }}>
            <ButtonIcon
              icon={<RiDeleteBinLine />}
              onPress={() => {
                const updated = [...taints];
                updated.splice(idx, 1);
                onChange(updated);
              }}
              size="small"
              aria-label="Remove taint"
            />
          </Grid.Item>
        </Grid.Root>
      ))}
      <Button
        iconStart={<RiAddLine />}
        onPress={() => onChange([...taints, { key: '', value: '', effect: 'NoSchedule' }])}
        size="small"
      >
        Add Taint
      </Button>
    </Box>
  );
}

export const VSphereInfrastructureConfiguration = ({
  cloudAccountUid,
  projectUid,
  controlPlaneConfig,
  workerPools,
  cloudConfig,
  tfMetadata,
  onUpdate,
}: VSphereInfrastructureConfigurationProps) => {
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [metadata, setMetadata] = useState<VSphereMetadata | null>(null);
  const [sshKeys, setSshKeys] = useState<Array<{ name: string; uid: string; publicKey: string; context?: string }>>([]);
  const [ipPools, setIpPools] = useState<IPPool[]>([]);
  const [overlordUid, setOverlordUid] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [ntpInput, setNtpInput] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  // Resources for control plane
  const [cpResources, setCpResources] = useState<ClusterResources | null>(null);
  const [cpResourcesLoading, setCpResourcesLoading] = useState(false);

  // Resources for each worker pool
  const [poolResources, setPoolResources] = useState<Map<number, ClusterResources>>(new Map());
  const [poolResourcesLoading, setPoolResourcesLoading] = useState<Set<number>>(new Set());

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['global', 'auth-network', 'controlplane', 'workerpools']));

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Fetch initial metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [metadataRes, sshKeysRes, cloudAccountRes, overlordsRes] = await Promise.all([
          spectroCloudApi.getVSphereCloudAccountMetadata(cloudAccountUid, projectUid),
          spectroCloudApi.getUserSSHKeys(projectUid),
          spectroCloudApi.getCloudAccount('vsphere', cloudAccountUid, projectUid),
          spectroCloudApi.getOverlords(projectUid),
        ]);

        // Sort datacenters alphabetically
        const datacenters = (metadataRes.items || []).map((dc: any) => ({
          ...dc,
          folders: (dc.folders || []).sort(),
          computeclusters: (dc.computeclusters || []).sort(),
        })).sort((a: any, b: any) => (a.datacenter || '').localeCompare(b.datacenter || ''));

        setMetadata({ datacenters });

        // Sort SSH keys alphabetically
        const sortedKeys = (sshKeysRes.items || [])
          .map((key: any) => ({
            name: key.metadata?.name || 'Unnamed Key',
            uid: key.metadata?.uid || '',
            publicKey: key.spec?.publicKey || '',
            context: key.metadata?.annotations?.scope === 'tenant' ? 'tenant' : 'project',
          }))
          .sort((a: { name: string; uid: string; publicKey: string; context?: string }, b: { name: string; uid: string; publicKey: string; context?: string }) => a.name.localeCompare(b.name));
        setSshKeys(sortedKeys);

        // Get overlord UID from cloud account annotations
        const pcgUid = cloudAccountRes?.metadata?.annotations?.overlordUid;
        setOverlordUid(pcgUid);

        // Find matching PCG name from overlords
        let pcgName = 'your-pcg-name';
        if (pcgUid && overlordsRes?.items) {
          const matchingOverlord = overlordsRes.items.find((overlord: any) =>
            overlord.metadata?.uid === pcgUid
          );

          if (matchingOverlord) {
            pcgName = matchingOverlord.metadata?.name || pcgName;
          }
        }

        // Fetch IP pools if we have overlord UID
        if (pcgUid) {
          const ipPoolsRes = await spectroCloudApi.getVSphereIPPools(pcgUid, projectUid);
          const sortedPools = (ipPoolsRes.items || [])
            .map((pool: any) => ({
              name: pool.metadata?.name || 'Unnamed Pool',
              uid: pool.metadata?.uid || '',
            }))
            .sort((a: IPPool, b: IPPool) => a.name.localeCompare(b.name));
          setIpPools(sortedPools);

          // Initialize tfMetadata with PCG, PCG name, and IP pools
          onUpdate({
            tfMetadata: {
              pcgUid,
              pcgName,
              ipPools: sortedPools.reduce((acc: Record<string, string>, pool: IPPool) => ({ ...acc, [pool.uid]: pool.name }), {}),
            },
          });
        }

        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vSphere metadata');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spectroCloudApi, cloudAccountUid, projectUid]);

  // Initialize default values on mount
  useEffect(() => {
    // Set default values if not already set
    const updates: any = {};

    // Set default imageTemplateFolder if not set
    if (!cloudConfig.placement?.imageTemplateFolder) {
      updates.cloudConfig = {
        ...cloudConfig,
        placement: {
          ...cloudConfig.placement,
          imageTemplateFolder: 'spectro-templates',
        },
      };
    }

    // Set default control plane values if not set
    if (!controlPlaneConfig.size) {
      updates.controlPlaneConfig = {
        ...controlPlaneConfig,
        size: 1,
        instanceType: {
          numCPUs: controlPlaneConfig.instanceType?.numCPUs || 4,
          memoryMiB: controlPlaneConfig.instanceType?.memoryMiB || 8192,
          diskGiB: controlPlaneConfig.instanceType?.diskGiB || 60,
        },
      };
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Show validation after user has had time to review the page
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowValidation(true);
    }, 2000); // Show validation after 2 seconds

    return () => clearTimeout(timer);
  }, []);

  // Fetch control plane resources when datacenter and cluster are selected
  useEffect(() => {
    const fetchCpResources = async () => {
      const datacenter = cloudConfig.placement?.datacenter;
      const cluster = controlPlaneConfig.placements?.[0]?.cluster;

      if (!datacenter || !cluster) {
        setCpResources(null);
        return;
      }

      try {
        setCpResourcesLoading(true);
        const resources = await spectroCloudApi.getVSphereComputeClusterResources(
          cloudAccountUid,
          datacenter,
          cluster,
          projectUid
        );
        // Sort resources alphabetically
        setCpResources({
          datastores: (resources.computecluster?.datastores || []).sort(),
          networks: (resources.computecluster?.networks || []).sort(),
          resourcePools: (resources.computecluster?.resourcePools || []).sort(),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch control plane resources:', err);
      } finally {
        setCpResourcesLoading(false);
      }
    };

    fetchCpResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spectroCloudApi, cloudAccountUid, projectUid, cloudConfig.placement?.datacenter, controlPlaneConfig.placements?.[0]?.cluster]);

  // Fetch worker pool resources dynamically
  const fetchPoolResources = async (poolIndex: number, clusterName?: string) => {
    const datacenter = cloudConfig.placement?.datacenter;
    const cluster = clusterName || workerPools[poolIndex]?.placements?.[0]?.cluster;

    if (!datacenter || !cluster) {
      return;
    }

      try {
        setPoolResourcesLoading(prev => new Set(prev).add(poolIndex));
        const resources = await spectroCloudApi.getVSphereComputeClusterResources(
          cloudAccountUid,
          datacenter,
          cluster,
          projectUid
        );
        // Sort resources alphabetically
        setPoolResources(prev => new Map(prev).set(poolIndex, {
          datastores: (resources.computecluster?.datastores || []).sort(),
          networks: (resources.computecluster?.networks || []).sort(),
          resourcePools: (resources.computecluster?.resourcePools || []).sort(),
        }));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to fetch pool ${poolIndex} resources:`, err);
      } finally {
      setPoolResourcesLoading(prev => {
        const updated = new Set(prev);
        updated.delete(poolIndex);
        return updated;
      });
    }
  };

  const handleCloudConfigChange = (field: string, value: any) => {
    onUpdate({
      cloudConfig: {
        ...cloudConfig,
        [field]: value,
      },
    });
  };

  const handlePlacementChange = (field: string, value: any) => {
    onUpdate({
      cloudConfig: {
        ...cloudConfig,
        placement: {
          ...(cloudConfig.placement || {}),
          [field]: value,
        },
      },
    });
  };

  const handleAddNTPServer = () => {
    if (ntpInput.trim()) {
      const currentServers = cloudConfig.ntpServers || [];
      handleCloudConfigChange('ntpServers', [...currentServers, ntpInput.trim()]);
      setNtpInput('');
    }
  };

  const handleRemoveNTPServer = (index: number) => {
    const currentServers = cloudConfig.ntpServers || [];
    handleCloudConfigChange('ntpServers', currentServers.filter((_: string, i: number) => i !== index));
  };

  const handleControlPlaneChange = (field: string, value: any) => {
    onUpdate({
      controlPlaneConfig: {
        ...controlPlaneConfig,
        [field]: value,
      },
    });
  };

  const handleControlPlaneInstanceTypeChange = (field: string, value: any) => {
    const currentInstanceType = controlPlaneConfig.instanceType;
    const instanceTypeObj = typeof currentInstanceType === 'object' && currentInstanceType !== null
      ? currentInstanceType
      : {};

    onUpdate({
      controlPlaneConfig: {
        ...controlPlaneConfig,
        instanceType: {
          ...instanceTypeObj,
          [field]: value,
        },
      },
    });
  };

  const handleControlPlanePlacementChange = (index: number, field: string, value: any) => {
    const placements = controlPlaneConfig.placements || [{
      cluster: '',
      datastore: '',
      resourcePool: '',
      network: { networkName: '', staticIp: cloudConfig.staticIp || false },
    }];
    const updated = [...placements];
    updated[index] = { ...updated[index], [field]: value };

    onUpdate({
      controlPlaneConfig: {
        ...controlPlaneConfig,
        placements: updated,
      },
    });

    // Fetch resources when cluster changes
    if (field === 'cluster' && value && cloudConfig.placement?.datacenter) {
      // Trigger refetch via useEffect
    }
  };

  const handleControlPlaneNetworkChange = (index: number, field: string, value: any) => {
    const placements = controlPlaneConfig.placements || [{
      cluster: '',
      datastore: '',
      resourcePool: '',
      network: { networkName: '', staticIp: cloudConfig.staticIp || false },
    }];
    const updated = [...placements];
    const currentNetwork = updated[index]?.network || { networkName: '', staticIp: cloudConfig.staticIp || false };
    updated[index] = {
      ...updated[index],
      network: {
        ...currentNetwork,
        [field]: value,
      },
    };

    onUpdate({
      controlPlaneConfig: {
        ...controlPlaneConfig,
        placements: updated,
      },
    });
  };

  const handleAddWorkerPool = () => {
    const newPool: WorkerPoolConfig = {
      name: `worker-pool-${workerPools.length + 1}`,
      size: 1,
      minSize: 1,
      maxSize: 10,
      instanceType: {
        numCPUs: 4,
        memoryMiB: 8192,
        diskGiB: 60,
      },
      placements: [
        {
          cluster: '',
          datastore: '',
          resourcePool: '',
          network: {
            networkName: '',
            staticIp: cloudConfig.staticIp || false,
          },
        },
      ],
    };
    onUpdate({ workerPools: [...workerPools, newPool] });
  };

  const handleRemoveWorkerPool = (index: number) => {
    const updated = [...workerPools];
    updated.splice(index, 1);
    onUpdate({ workerPools: updated });
    // Clean up resources cache
    setPoolResources(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const handleWorkerPoolChange = (index: number, field: keyof WorkerPoolConfig, value: any) => {
    const updated = [...workerPools];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate({ workerPools: updated });
  };

  const handleWorkerPoolInstanceTypeChange = (poolIndex: number, field: string, value: any) => {
    const updated = [...workerPools];
    const currentInstanceType = updated[poolIndex].instanceType;
    const instanceTypeObj = typeof currentInstanceType === 'object' && currentInstanceType !== null
      ? currentInstanceType
      : {};

    updated[poolIndex] = {
      ...updated[poolIndex],
      instanceType: {
        ...instanceTypeObj,
        [field]: value,
      },
    };
    onUpdate({ workerPools: updated });
  };

  const handleWorkerPoolPlacementChange = (poolIndex: number, placementIndex: number, field: string, value: any) => {
    const updated = [...workerPools];
    const placements = updated[poolIndex].placements || [{
      cluster: '',
      datastore: '',
      resourcePool: '',
      network: { networkName: '', staticIp: cloudConfig.staticIp || false },
    }];
    const updatedPlacements = [...placements];
    updatedPlacements[placementIndex] = { ...updatedPlacements[placementIndex], [field]: value };
    updated[poolIndex] = { ...updated[poolIndex], placements: updatedPlacements };
    onUpdate({ workerPools: updated });

    // Fetch resources when cluster changes - pass the cluster name directly
    if (field === 'cluster' && value && cloudConfig.placement?.datacenter) {
      fetchPoolResources(poolIndex, value);
    }
  };

  const handleCopyFromControlPlane = (poolIndex: number) => {
    const updated = [...workerPools];
    const cpPlacement = controlPlaneConfig.placements?.[0];
    const cpInstanceType = controlPlaneConfig.instanceType;

    if (cpPlacement) {
      // Copy placement settings
      updated[poolIndex] = {
        ...updated[poolIndex],
        placements: [{
          cluster: cpPlacement.cluster || '',
          datastore: cpPlacement.datastore || '',
          resourcePool: cpPlacement.resourcePool || '',
          network: {
            networkName: cpPlacement.network?.networkName || '',
            staticIp: cloudConfig.staticIp || false,
            parentPoolUid: cpPlacement.network?.parentPoolUid || '',
          },
        }],
      };

      // Copy instance type if it's an object (vSphere style)
      if (typeof cpInstanceType === 'object' && cpInstanceType !== null) {
        updated[poolIndex].instanceType = {
          numCPUs: cpInstanceType.numCPUs || 4,
          memoryMiB: cpInstanceType.memoryMiB || 8192,
          diskGiB: cpInstanceType.diskGiB || 60,
        };
      }

      onUpdate({ workerPools: updated });

      // Fetch resources for this pool since we copied the cluster
      if (cpPlacement.cluster && cloudConfig.placement?.datacenter) {
        fetchPoolResources(poolIndex);
      }
    }
  };

  const handleWorkerPoolNetworkChange = (poolIndex: number, placementIndex: number, field: string, value: any) => {
    const updated = [...workerPools];
    const placements = updated[poolIndex].placements || [{
      cluster: '',
      datastore: '',
      resourcePool: '',
      network: { networkName: '', staticIp: cloudConfig.staticIp || false },
    }];
    const updatedPlacements = [...placements];
    const currentNetwork = updatedPlacements[placementIndex]?.network || { networkName: '', staticIp: cloudConfig.staticIp || false };
    updatedPlacements[placementIndex] = {
      ...updatedPlacements[placementIndex],
      network: {
        ...currentNetwork,
        [field]: value,
      },
    };
    updated[poolIndex] = { ...updated[poolIndex], placements: updatedPlacements };
    onUpdate({ workerPools: updated });
  };

  const selectedDatacenter = metadata?.datacenters?.find(
    dc => dc.datacenter === cloudConfig.placement?.datacenter
  );

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Progress />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box className={styles.root}>
        <Alert status="danger" description={error} />
      </Box>
    );
  }

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];

    // Global placement
    if (!cloudConfig.placement?.datacenter) errors.push('Global: Datacenter is required');
    if (!cloudConfig.placement?.folder) errors.push('Global: Folder is required');
    if (!cloudConfig.placement?.imageTemplateFolder) errors.push('Global: Image Template Folder is required');

    // SSH Key (required)
    if (!cloudConfig.sshKeys || cloudConfig.sshKeys.length === 0) {
      errors.push('Authentication & Network: SSH Key is required');
    }

    // Control Plane
    if (!controlPlaneConfig.size || controlPlaneConfig.size <= 0) {
      errors.push('Control Plane: Node count is required');
    }
    if (!controlPlaneConfig.instanceType?.numCPUs) {
      errors.push('Control Plane: CPU cores are required');
    }
    if (!controlPlaneConfig.instanceType?.memoryMiB) {
      errors.push('Control Plane: Memory is required');
    }
    if (!controlPlaneConfig.instanceType?.diskGiB) {
      errors.push('Control Plane: Disk size is required');
    }
    if (!controlPlaneConfig.placements || controlPlaneConfig.placements.length === 0) {
      errors.push('Control Plane: Placement configuration is required');
    } else if (controlPlaneConfig.placements[0]) {
      const placement = controlPlaneConfig.placements[0];
      if (!placement.cluster) errors.push('Control Plane: Compute Cluster is required');
      if (!placement.datastore) errors.push('Control Plane: Datastore is required');
      if (!placement.network?.networkName) errors.push('Control Plane: Network is required');
    }

    // Worker Pools
    if (workerPools.length === 0) {
      errors.push('At least one Worker Pool is required');
    }

    workerPools.forEach((pool, idx) => {
      const poolName = pool.name || `Worker Pool ${idx + 1}`;

      if (!pool.name || pool.name.trim().length === 0) {
        errors.push(`${poolName}: Pool name is required`);
      }
      if (pool.useAutoscaler) {
        if (!pool.minSize || pool.minSize <= 0) {
          errors.push(`${poolName}: Minimum size is required for autoscaling`);
        }
        if (!pool.maxSize || pool.maxSize <= 0) {
          errors.push(`${poolName}: Maximum size is required for autoscaling`);
        }
      } else {
        if (!pool.size || pool.size <= 0) {
          errors.push(`${poolName}: Node count is required`);
        }
      }
      if (typeof pool.instanceType !== 'object' || pool.instanceType === null || !pool.instanceType.numCPUs) {
        errors.push(`${poolName}: CPU cores are required`);
      }
      if (typeof pool.instanceType !== 'object' || pool.instanceType === null || !pool.instanceType.memoryMiB) {
        errors.push(`${poolName}: Memory is required`);
      }
      if (typeof pool.instanceType !== 'object' || pool.instanceType === null || !pool.instanceType.diskGiB) {
        errors.push(`${poolName}: Disk size is required`);
      }
      if (!pool.placements || pool.placements.length === 0) {
        errors.push(`${poolName}: Placement configuration is required`);
      } else if (pool.placements[0]) {
        const placement = pool.placements[0];
        if (!placement.cluster) errors.push(`${poolName}: Compute Cluster is required`);
        if (!placement.datastore) errors.push(`${poolName}: Datastore is required`);
        if (!placement.network?.networkName) errors.push(`${poolName}: Network is required`);
      }
    });

    return errors;
  };

  const validationErrors = getValidationErrors();
  const isValid = validationErrors.length === 0;

  return (
    <Box className={styles.root}>
      <Box mb="4">
        <Text variant="title-large" weight="bold" as="div">
          vSphere Infrastructure Configuration
        </Text>
        <Text variant="body-medium" color="secondary" as="div">
          Configure your vSphere infrastructure settings for control plane and worker nodes
        </Text>
      </Box>

      {showValidation && !isValid && (
        <Box mb="4">
          <Alert
            status="danger"
            title="Please complete the following required fields:"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((errMsg, idx) => (
                  <li key={idx}>{errMsg}</li>
                ))}
              </ul>
            }
            customActions={
              <Button size="small" variant="tertiary" onPress={() => setShowValidation(false)}>
                Dismiss
              </Button>
            }
          />
        </Box>
      )}

      {/* Global Placement Settings */}
      <Accordion
        isExpanded={expandedSections.has('global')}
        onExpandedChange={() => handleSectionToggle('global')}
      >
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <RiCloudLine className={styles.sectionIcon} />
            <Text weight="bold">Global Placement Settings</Text>
            <Badge>Required</Badge>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Grid.Root columns="12" gap="4">
            <Grid.Item colSpan={{ xs: '12', md: '4' }}>
              <StringCombobox
                label="Datacenter"
                options={metadata?.datacenters?.map(dc => dc.datacenter) || []}
                value={cloudConfig.placement?.datacenter || ''}
                onChange={value => handlePlacementChange('datacenter', value)}
                isRequired
                description="Primary datacenter for cluster resources"
              />
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '4' }}>
              <StringCombobox
                label="Folder"
                options={selectedDatacenter?.folders || []}
                value={cloudConfig.placement?.folder || ''}
                onChange={value => handlePlacementChange('folder', value)}
                allowsCustomValue
                isDisabled={!selectedDatacenter}
                isRequired
                description="VM folder path (can type custom path)"
              />
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '4' }}>
              <StringCombobox
                label="Image Template Folder"
                options={selectedDatacenter?.folders || []}
                value={cloudConfig.placement?.imageTemplateFolder || 'spectro-templates'}
                onChange={value => handlePlacementChange('imageTemplateFolder', value || 'spectro-templates')}
                allowsCustomValue
                isDisabled={!selectedDatacenter}
                isRequired
                description="Template location (default: spectro-templates)"
              />
            </Grid.Item>
          </Grid.Root>
        </AccordionPanel>
      </Accordion>

      {/* SSH Keys & Network Settings */}
      <Accordion
        isExpanded={expandedSections.has('auth-network')}
        onExpandedChange={() => handleSectionToggle('auth-network')}
      >
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <RiShieldCheckLine className={styles.sectionIcon} />
            <Text weight="bold">Authentication &amp; Network</Text>
            <Badge>Required</Badge>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Grid.Root columns="12" gap="4">
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <Flex align="center" gap="1" mb="2">
                <RiShieldCheckLine size={16} />
                <Text weight="bold">SSH Key</Text>
              </Flex>
              {sshKeys.length > 0 ? (
                <ObjectCombobox
                  label="Select SSH Key"
                  options={sshKeys}
                  getOptionId={k => k.publicKey}
                  getOptionLabel={k => k.name}
                  selectedId={cloudConfig.sshKeys?.[0] ?? null}
                  onSelect={newValue => {
                    handleCloudConfigChange('sshKeys', [newValue.publicKey]);
                    onUpdate({
                      tfMetadata: {
                        ...tfMetadata,
                        sshKeyName: newValue.name,
                        sshKeyContext: (newValue.context === 'tenant' ? 'tenant' : 'project') as 'tenant' | 'project',
                        pcgUid: overlordUid,
                        ipPools: ipPools.reduce((acc: Record<string, string>, pool: IPPool) => ({ ...acc, [pool.uid]: pool.name }), {}),
                      },
                    });
                  }}
                  isRequired
                  description={
                    showValidation && (!cloudConfig.sshKeys || cloudConfig.sshKeys.length === 0)
                      ? 'SSH Key is required'
                      : 'Authentication key for SSH access'
                  }
                />
              ) : (
                <Alert status="warning" description="No SSH keys found. Please create an SSH key in Spectro Cloud first." />
              )}
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
              <Flex align="center" gap="1" mb="2">
                <RiWifiLine size={16} />
                <Text weight="bold">IP Allocation</Text>
              </Flex>
              <Switch
                label="Use Static IP Allocation"
                isSelected={cloudConfig.staticIp || false}
                onChange={isSelected => handleCloudConfigChange('staticIp', isSelected)}
              />
              <Text variant="body-small" color="secondary" as="div">
                Enable for static IP pools (recommended for production)
              </Text>
            </Grid.Item>

            {/* NTP Servers */}
            <Grid.Item colSpan="12">
              <Flex align="center" gap="2" mb="2">
                <RiTimeLine size={16} />
                <Text weight="bold">NTP Servers</Text>
                <Badge>Optional</Badge>
              </Flex>
              <Flex align="end" gap="2">
                <Box style={{ flexGrow: 1 }}>
                  <TextField
                    value={ntpInput}
                    onChange={setNtpInput}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAddNTPServer();
                      }
                    }}
                    placeholder="e.g., pool.ntp.org or 10.100.100.100"
                    description="Add time synchronization servers (press Enter or click Add)"
                  />
                </Box>
                <Button iconStart={<RiAddLine />} onPress={handleAddNTPServer}>
                  Add
                </Button>
              </Flex>
              {(() => {
                const ntpServers: string[] = cloudConfig.ntpServers || [];
                if (ntpServers.length === 0) return null;
                return (
                  <Box mt="2">
                    <TagGroup
                      aria-label="NTP Servers"
                      items={ntpServers.map((server, idx) => ({ id: idx, label: server }))}
                      onRemove={keys => {
                        const [key] = keys;
                        if (typeof key === 'number') handleRemoveNTPServer(key);
                      }}
                    >
                      {item => <Tag id={item.id} textValue={item.label}>{item.label}</Tag>}
                    </TagGroup>
                  </Box>
                );
              })()}
            </Grid.Item>
          </Grid.Root>
        </AccordionPanel>
      </Accordion>

      {/* Control Plane */}
      <Accordion
        isExpanded={expandedSections.has('controlplane')}
        onExpandedChange={() => handleSectionToggle('controlplane')}
      >
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <RiSettings3Line className={styles.sectionIcon} />
            <Text weight="bold">Control Plane Configuration</Text>
            <Badge>Required</Badge>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Box className={styles.highlightedAccordion}>
            <Accordion defaultExpanded>
              <AccordionTrigger>
                <Flex align="center" gap="1">
                  <RiHardDriveLine size={16} />
                  <Text weight="bold">Instance Type &amp; Size</Text>
                </Flex>
              </AccordionTrigger>
              <AccordionPanel>
                <Grid.Root columns="12" gap="4">
                  <Grid.Item colSpan={{ xs: '12', md: '3' }}>
                    <NumberField
                      label="CPU Cores"
                      isRequired
                      value={
                        typeof controlPlaneConfig.instanceType === 'object' && controlPlaneConfig.instanceType !== null
                          ? controlPlaneConfig.instanceType.numCPUs || 4
                          : 4
                      }
                      onChange={value => handleControlPlaneInstanceTypeChange('numCPUs', value)}
                      minValue={2}
                    />
                  </Grid.Item>
                  <Grid.Item colSpan={{ xs: '12', md: '3' }}>
                    <NumberField
                      label="Memory (MiB)"
                      isRequired
                      value={
                        typeof controlPlaneConfig.instanceType === 'object' && controlPlaneConfig.instanceType !== null
                          ? controlPlaneConfig.instanceType.memoryMiB || 8192
                          : 8192
                      }
                      onChange={value => handleControlPlaneInstanceTypeChange('memoryMiB', value)}
                      minValue={4096}
                      step={1024}
                    />
                  </Grid.Item>
                  <Grid.Item colSpan={{ xs: '12', md: '3' }}>
                    <NumberField
                      label="Disk (GiB)"
                      isRequired
                      value={
                        typeof controlPlaneConfig.instanceType === 'object' && controlPlaneConfig.instanceType !== null
                          ? controlPlaneConfig.instanceType.diskGiB || 60
                          : 60
                      }
                      onChange={value => handleControlPlaneInstanceTypeChange('diskGiB', value)}
                      minValue={20}
                    />
                  </Grid.Item>
                  <Grid.Item colSpan={{ xs: '12', md: '3' }}>
                    <NumberField
                      label="Node Count"
                      isRequired
                      value={controlPlaneConfig.size || 1}
                      onChange={value => handleControlPlaneChange('size', value)}
                      minValue={1}
                      maxValue={10}
                    />
                  </Grid.Item>
                </Grid.Root>
              </AccordionPanel>
            </Accordion>
          </Box>

          <Box mt="2" mb="4">
            <Switch
              label="Allow workloads on control plane nodes"
              isSelected={controlPlaneConfig.useControlPlaneAsWorker || false}
              onChange={isSelected => handleControlPlaneChange('useControlPlaneAsWorker', isSelected)}
            />
            <Text variant="body-small" color="secondary" as="div">
              When enabled, the control plane nodes can also run regular workloads (not recommended for production)
            </Text>
          </Box>

          <Accordion defaultExpanded>
            <AccordionTrigger>Placement Configuration</AccordionTrigger>
            <AccordionPanel>
              {!selectedDatacenter && (
                <Box mb="4">
                  <Alert status="info" description="Please select a datacenter first" />
                </Box>
              )}
              <Grid.Root columns="12" gap="4">
                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                  <StringCombobox
                    label="Compute Cluster"
                    options={selectedDatacenter?.computeclusters || []}
                    value={controlPlaneConfig.placements?.[0]?.cluster || ''}
                    onChange={value => handleControlPlanePlacementChange(0, 'cluster', value)}
                    isDisabled={!selectedDatacenter}
                    isRequired
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                  <StringCombobox
                    label="Datastore"
                    options={cpResources?.datastores || []}
                    value={controlPlaneConfig.placements?.[0]?.datastore || ''}
                    onChange={value => handleControlPlanePlacementChange(0, 'datastore', value)}
                    allowsCustomValue
                    isRequired
                    description={cpResourcesLoading ? 'Loading...' : 'Select or type datastore name'}
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                  <StringCombobox
                    label="Resource Pool"
                    options={cpResources?.resourcePools || []}
                    value={controlPlaneConfig.placements?.[0]?.resourcePool || ''}
                    onChange={value => handleControlPlanePlacementChange(0, 'resourcePool', value)}
                    allowsCustomValue
                    description={cpResourcesLoading ? 'Loading...' : 'Leave empty for default or type custom name'}
                  />
                </Grid.Item>
                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                  <StringCombobox
                    label="Network"
                    options={cpResources?.networks || []}
                    value={controlPlaneConfig.placements?.[0]?.network?.networkName || ''}
                    onChange={value => handleControlPlaneNetworkChange(0, 'networkName', value)}
                    allowsCustomValue
                    isRequired
                    description={cpResourcesLoading ? 'Loading...' : 'Select or type network path (e.g., /infra/segments/Demo-Network)'}
                  />
                </Grid.Item>
                {cloudConfig.staticIp && (
                  <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                    <ObjectCombobox
                      label="IP Pool"
                      options={ipPools}
                      getOptionId={p => p.uid}
                      getOptionLabel={p => p.name}
                      selectedId={controlPlaneConfig.placements?.[0]?.network?.parentPoolUid}
                      onSelect={newValue => handleControlPlaneNetworkChange(0, 'parentPoolUid', newValue.uid)}
                      isRequired
                      description="Select IP pool for static IP allocation"
                    />
                  </Grid.Item>
                )}
              </Grid.Root>
            </AccordionPanel>
          </Accordion>

          <Accordion>
            <AccordionTrigger>Additional Labels &amp; Annotations (Optional)</AccordionTrigger>
            <AccordionPanel>
              <Flex direction="column" gap="4">
                <KeyValueEditor
                  title="Labels (Kubernetes Node Labels)"
                  entries={controlPlaneConfig.additionalLabels || {}}
                  addButtonLabel="Add Label"
                  onAdd={() => handleControlPlaneChange('additionalLabels', { ...(controlPlaneConfig.additionalLabels || {}), '': '' })}
                  onKeyChange={(oldKey, newKey) => {
                    const updatedLabels = { ...(controlPlaneConfig.additionalLabels || {}) };
                    const value = updatedLabels[oldKey];
                    delete updatedLabels[oldKey];
                    updatedLabels[newKey] = value;
                    handleControlPlaneChange('additionalLabels', updatedLabels);
                  }}
                  onValueChange={(key, value) => handleControlPlaneChange('additionalLabels', { ...(controlPlaneConfig.additionalLabels || {}), [key]: value })}
                  onRemove={key => {
                    const updatedLabels = { ...(controlPlaneConfig.additionalLabels || {}) };
                    delete updatedLabels[key];
                    handleControlPlaneChange('additionalLabels', updatedLabels);
                  }}
                />
                <KeyValueEditor
                  title="Annotations (Kubernetes Node Annotations)"
                  entries={controlPlaneConfig.additionalAnnotations || {}}
                  addButtonLabel="Add Annotation"
                  onAdd={() => handleControlPlaneChange('additionalAnnotations', { ...(controlPlaneConfig.additionalAnnotations || {}), '': '' })}
                  onKeyChange={(oldKey, newKey) => {
                    const updatedAnnotations = { ...(controlPlaneConfig.additionalAnnotations || {}) };
                    const value = updatedAnnotations[oldKey];
                    delete updatedAnnotations[oldKey];
                    updatedAnnotations[newKey] = value;
                    handleControlPlaneChange('additionalAnnotations', updatedAnnotations);
                  }}
                  onValueChange={(key, value) => handleControlPlaneChange('additionalAnnotations', { ...(controlPlaneConfig.additionalAnnotations || {}), [key]: value })}
                  onRemove={key => {
                    const updatedAnnotations = { ...(controlPlaneConfig.additionalAnnotations || {}) };
                    delete updatedAnnotations[key];
                    handleControlPlaneChange('additionalAnnotations', updatedAnnotations);
                  }}
                />
              </Flex>
            </AccordionPanel>
          </Accordion>

          <Accordion>
            <AccordionTrigger>Taints (Optional)</AccordionTrigger>
            <AccordionPanel>
              <TaintsEditor
                taints={controlPlaneConfig.taints || []}
                onChange={taints => handleControlPlaneChange('taints', taints)}
              />
            </AccordionPanel>
          </Accordion>
        </AccordionPanel>
      </Accordion>

      {/* Worker Pools */}
      <Accordion
        isExpanded={expandedSections.has('workerpools')}
        onExpandedChange={() => handleSectionToggle('workerpools')}
      >
        <AccordionTrigger>
          <Flex align="center" gap="2" style={{ width: '100%' }}>
            <RiBriefcaseLine className={styles.sectionIcon} />
            <Text weight="bold">Worker Pools</Text>
            <Badge>{`${workerPools.length} Pool(s)`}</Badge>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Flex direction="column" gap="4">
            {workerPools.map((pool, poolIdx) => {
              const poolResourceData = poolResources.get(poolIdx);
              const isLoadingPoolResources = poolResourcesLoading.has(poolIdx);

              return (
                <Card key={poolIdx} className={styles.poolCard}>
                  <CardHeader>
                    <Flex align="center" justify="between">
                      <Flex align="center" gap="2">
                        <RiBriefcaseLine size={16} />
                        <Text weight="bold">
                          Worker Pool {poolIdx + 1}: {pool.name || 'Unnamed'}
                        </Text>
                      </Flex>
                      <ButtonIcon
                        icon={<RiDeleteBinLine />}
                        onPress={() => handleRemoveWorkerPool(poolIdx)}
                        size="small"
                        aria-label={`Remove worker pool ${poolIdx + 1}`}
                      />
                    </Flex>
                  </CardHeader>

                  <CardBody>
                    <Box className={styles.highlightedAccordion}>
                      <Accordion>
                        <AccordionTrigger>
                          <Flex align="center" gap="1">
                            <RiSettings3Line size={16} />
                            <Text weight="bold">Basic Configuration</Text>
                          </Flex>
                        </AccordionTrigger>
                        <AccordionPanel>
                          <Grid.Root columns="12" gap="4">
                            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                              <TextField
                                label="Pool Name"
                                value={pool.name}
                                onChange={value => handleWorkerPoolChange(poolIdx, 'name', value)}
                                isRequired
                              />
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                              <Switch
                                label="Enable Autoscaler"
                                isSelected={pool.useAutoscaler || false}
                                onChange={isSelected => handleWorkerPoolChange(poolIdx, 'useAutoscaler', isSelected)}
                              />
                            </Grid.Item>
                            {pool.useAutoscaler ? (
                              <>
                                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                                  <NumberField
                                    label="Min Size"
                                    isRequired
                                    value={pool.minSize || 1}
                                    onChange={value => handleWorkerPoolChange(poolIdx, 'minSize', value)}
                                    minValue={0}
                                  />
                                </Grid.Item>
                                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                                  <NumberField
                                    label="Max Size"
                                    isRequired
                                    value={pool.maxSize || 10}
                                    onChange={value => handleWorkerPoolChange(poolIdx, 'maxSize', value)}
                                    minValue={1}
                                  />
                                </Grid.Item>
                              </>
                            ) : (
                              <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                                <NumberField
                                  label="Size"
                                  isRequired
                                  value={pool.size}
                                  onChange={value => handleWorkerPoolChange(poolIdx, 'size', value)}
                                  minValue={0}
                                />
                              </Grid.Item>
                            )}
                            <Grid.Item colSpan="12">
                              <Select
                                label="Update Strategy"
                                selectedKey={pool.updateStrategy?.type || 'RollingUpdateScaleOut'}
                                onSelectionChange={key => {
                                  const updated = [...workerPools];
                                  const type = String(key) as 'RollingUpdateScaleOut' | 'RollingUpdateScaleIn' | 'OverrideScaling';
                                  updated[poolIdx] = {
                                    ...updated[poolIdx],
                                    updateStrategy: {
                                      type,
                                      ...(type === 'OverrideScaling' ? { maxSurge: '1', maxUnavailable: '0' } : {})
                                    }
                                  };
                                  onUpdate({ workerPools: updated });
                                }}
                                options={[
                                  { id: 'RollingUpdateScaleOut', label: 'Expand First (Scale Out)' },
                                  { id: 'RollingUpdateScaleIn', label: 'Contract First (Scale In)' },
                                  { id: 'OverrideScaling', label: 'Custom' },
                                ]}
                                description={
                                  (pool.updateStrategy?.type === 'RollingUpdateScaleOut' && 'Adds new nodes before removing old ones') ||
                                  (pool.updateStrategy?.type === 'RollingUpdateScaleIn' && 'Removes old nodes before adding new ones') ||
                                  (pool.updateStrategy?.type === 'OverrideScaling' && 'Specify custom maxSurge and maxUnavailable values') ||
                                  undefined
                                }
                              />
                            </Grid.Item>
                            {pool.updateStrategy?.type === 'OverrideScaling' && (
                              <>
                                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                                  <TextField
                                    label="Max Surge"
                                    value={pool.updateStrategy?.maxSurge || '1'}
                                    onChange={value => {
                                      const updated = [...workerPools];
                                      updated[poolIdx] = {
                                        ...updated[poolIdx],
                                        updateStrategy: {
                                          ...updated[poolIdx].updateStrategy!,
                                          maxSurge: value
                                        }
                                      };
                                      onUpdate({ workerPools: updated });
                                    }}
                                    description="Number or percentage of pods that can be created above desired amount"
                                  />
                                </Grid.Item>
                                <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                                  <TextField
                                    label="Max Unavailable"
                                    value={pool.updateStrategy?.maxUnavailable || '0'}
                                    onChange={value => {
                                      const updated = [...workerPools];
                                      updated[poolIdx] = {
                                        ...updated[poolIdx],
                                        updateStrategy: {
                                          ...updated[poolIdx].updateStrategy!,
                                          maxUnavailable: value
                                        }
                                      };
                                      onUpdate({ workerPools: updated });
                                    }}
                                    description="Number or percentage of pods that can be unavailable during update"
                                  />
                                </Grid.Item>
                              </>
                            )}
                          </Grid.Root>
                        </AccordionPanel>
                      </Accordion>
                    </Box>

                    <Accordion>
                      <AccordionTrigger>Instance Type</AccordionTrigger>
                      <AccordionPanel>
                        <Grid.Root columns="12" gap="4">
                          <Grid.Item colSpan={{ xs: '12', md: '4' }}>
                            <NumberField
                              label="CPU Cores"
                              isRequired
                              value={
                                typeof pool.instanceType === 'object' && pool.instanceType !== null
                                  ? pool.instanceType.numCPUs || 4
                                  : 4
                              }
                              onChange={value => handleWorkerPoolInstanceTypeChange(poolIdx, 'numCPUs', value)}
                              minValue={2}
                            />
                          </Grid.Item>
                          <Grid.Item colSpan={{ xs: '12', md: '4' }}>
                            <NumberField
                              label="Memory (MiB)"
                              isRequired
                              value={
                                typeof pool.instanceType === 'object' && pool.instanceType !== null
                                  ? pool.instanceType.memoryMiB || 8192
                                  : 8192
                              }
                              onChange={value => handleWorkerPoolInstanceTypeChange(poolIdx, 'memoryMiB', value)}
                              minValue={4096}
                              step={1024}
                            />
                          </Grid.Item>
                          <Grid.Item colSpan={{ xs: '12', md: '4' }}>
                            <NumberField
                              label="Disk (GiB)"
                              isRequired
                              value={
                                typeof pool.instanceType === 'object' && pool.instanceType !== null
                                  ? pool.instanceType.diskGiB || 60
                                  : 60
                              }
                              onChange={value => handleWorkerPoolInstanceTypeChange(poolIdx, 'diskGiB', value)}
                              minValue={20}
                            />
                          </Grid.Item>
                        </Grid.Root>
                      </AccordionPanel>
                    </Accordion>

                    <Accordion>
                      <AccordionTrigger>Placement Configuration</AccordionTrigger>
                      <AccordionPanel>
                        {!selectedDatacenter && (
                          <Box mb="4">
                            <Alert status="info" description="Please select a datacenter first" />
                          </Box>
                        )}
                        <Flex justify="end" mb="2">
                          <Button
                            variant="secondary"
                            size="small"
                            onPress={() => handleCopyFromControlPlane(poolIdx)}
                            isDisabled={!controlPlaneConfig.placements?.[0]?.cluster}
                          >
                            Copy from Control Plane
                          </Button>
                        </Flex>
                        <Grid.Root columns="12" gap="4">
                          <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                            <StringCombobox
                              label="Compute Cluster"
                              options={selectedDatacenter?.computeclusters || []}
                              value={pool.placements?.[0]?.cluster || ''}
                              onChange={value => handleWorkerPoolPlacementChange(poolIdx, 0, 'cluster', value)}
                              isDisabled={!selectedDatacenter}
                              isRequired
                            />
                          </Grid.Item>
                          <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                            <StringCombobox
                              label="Datastore"
                              options={poolResourceData?.datastores || []}
                              value={pool.placements?.[0]?.datastore || ''}
                              onChange={value => handleWorkerPoolPlacementChange(poolIdx, 0, 'datastore', value)}
                              allowsCustomValue
                              isRequired
                              description={isLoadingPoolResources ? 'Loading...' : 'Select or type datastore name'}
                            />
                          </Grid.Item>
                          <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                            <StringCombobox
                              label="Resource Pool"
                              options={poolResourceData?.resourcePools || []}
                              value={pool.placements?.[0]?.resourcePool || ''}
                              onChange={value => handleWorkerPoolPlacementChange(poolIdx, 0, 'resourcePool', value)}
                              allowsCustomValue
                              description={isLoadingPoolResources ? 'Loading...' : 'Leave empty for default or type custom name'}
                            />
                          </Grid.Item>
                          <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                            <StringCombobox
                              label="Network"
                              options={poolResourceData?.networks || []}
                              value={pool.placements?.[0]?.network?.networkName || ''}
                              onChange={value => handleWorkerPoolNetworkChange(poolIdx, 0, 'networkName', value)}
                              allowsCustomValue
                              isRequired
                              description={isLoadingPoolResources ? 'Loading...' : 'Select or type network path (e.g., /infra/segments/Demo-Network)'}
                            />
                          </Grid.Item>
                          {cloudConfig.staticIp && (
                            <Grid.Item colSpan={{ xs: '12', md: '6' }}>
                              <ObjectCombobox
                                label="IP Pool"
                                options={ipPools}
                                getOptionId={p => p.uid}
                                getOptionLabel={p => p.name}
                                selectedId={pool.placements?.[0]?.network?.parentPoolUid}
                                onSelect={newValue => handleWorkerPoolNetworkChange(poolIdx, 0, 'parentPoolUid', newValue.uid)}
                                isRequired
                                description="Select IP pool for static IP allocation"
                              />
                            </Grid.Item>
                          )}
                        </Grid.Root>
                      </AccordionPanel>
                    </Accordion>

                    <Accordion>
                      <AccordionTrigger>Additional Labels &amp; Annotations (Optional)</AccordionTrigger>
                      <AccordionPanel>
                        <Flex direction="column" gap="4">
                          <KeyValueEditor
                            title="Labels (Kubernetes Node Labels)"
                            entries={pool.additionalLabels || {}}
                            addButtonLabel="Add Label"
                            onAdd={() => {
                              const updated = [...workerPools];
                              updated[poolIdx] = {
                                ...updated[poolIdx],
                                additionalLabels: { ...(updated[poolIdx].additionalLabels || {}), '': '' }
                              };
                              onUpdate({ workerPools: updated });
                            }}
                            onKeyChange={(oldKey, newKey) => {
                              const updated = [...workerPools];
                              const newLabels = { ...updated[poolIdx].additionalLabels };
                              const value = newLabels[oldKey];
                              delete newLabels[oldKey];
                              newLabels[newKey] = value;
                              updated[poolIdx] = { ...updated[poolIdx], additionalLabels: newLabels };
                              onUpdate({ workerPools: updated });
                            }}
                            onValueChange={(key, value) => {
                              const updated = [...workerPools];
                              const newLabels = { ...updated[poolIdx].additionalLabels, [key]: value };
                              updated[poolIdx] = { ...updated[poolIdx], additionalLabels: newLabels };
                              onUpdate({ workerPools: updated });
                            }}
                            onRemove={key => {
                              const updated = [...workerPools];
                              const newLabels = { ...updated[poolIdx].additionalLabels };
                              delete newLabels[key];
                              updated[poolIdx] = { ...updated[poolIdx], additionalLabels: newLabels };
                              onUpdate({ workerPools: updated });
                            }}
                          />
                          <KeyValueEditor
                            title="Annotations (Kubernetes Node Annotations)"
                            entries={pool.additionalAnnotations || {}}
                            addButtonLabel="Add Annotation"
                            onAdd={() => {
                              const updated = [...workerPools];
                              updated[poolIdx] = {
                                ...updated[poolIdx],
                                additionalAnnotations: { ...(updated[poolIdx].additionalAnnotations || {}), '': '' }
                              };
                              onUpdate({ workerPools: updated });
                            }}
                            onKeyChange={(oldKey, newKey) => {
                              const updated = [...workerPools];
                              const newAnnotations = { ...updated[poolIdx].additionalAnnotations };
                              const value = newAnnotations[oldKey];
                              delete newAnnotations[oldKey];
                              newAnnotations[newKey] = value;
                              updated[poolIdx] = { ...updated[poolIdx], additionalAnnotations: newAnnotations };
                              onUpdate({ workerPools: updated });
                            }}
                            onValueChange={(key, value) => {
                              const updated = [...workerPools];
                              const newAnnotations = { ...updated[poolIdx].additionalAnnotations, [key]: value };
                              updated[poolIdx] = { ...updated[poolIdx], additionalAnnotations: newAnnotations };
                              onUpdate({ workerPools: updated });
                            }}
                            onRemove={key => {
                              const updated = [...workerPools];
                              const newAnnotations = { ...updated[poolIdx].additionalAnnotations };
                              delete newAnnotations[key];
                              updated[poolIdx] = { ...updated[poolIdx], additionalAnnotations: newAnnotations };
                              onUpdate({ workerPools: updated });
                            }}
                          />
                        </Flex>
                      </AccordionPanel>
                    </Accordion>

                    <Accordion>
                      <AccordionTrigger>Taints (Optional)</AccordionTrigger>
                      <AccordionPanel>
                        <TaintsEditor
                          taints={pool.taints || []}
                          onChange={taints => {
                            const updated = [...workerPools];
                            updated[poolIdx] = { ...updated[poolIdx], taints };
                            onUpdate({ workerPools: updated });
                          }}
                        />
                      </AccordionPanel>
                    </Accordion>
                  </CardBody>
                </Card>
              );
            })}

            <Button iconStart={<RiAddLine />} onPress={handleAddWorkerPool} variant="primary">
              Add Worker Pool
            </Button>
          </Flex>
        </AccordionPanel>
      </Accordion>
    </Box>
  );
};
