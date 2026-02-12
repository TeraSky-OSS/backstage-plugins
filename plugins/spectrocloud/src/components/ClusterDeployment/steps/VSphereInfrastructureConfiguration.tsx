import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Card,
  Chip,
} from '@material-ui/core';
import { Alert, Autocomplete } from '@material-ui/lab';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import StorageIcon from '@material-ui/icons/Storage';
import CloudIcon from '@material-ui/icons/Cloud';
import SettingsIcon from '@material-ui/icons/Settings';
import NetworkCheckIcon from '@material-ui/icons/NetworkCheck';
import WorkIcon from '@material-ui/icons/Work';
import DnsIcon from '@material-ui/icons/Dns';
import SecurityIcon from '@material-ui/icons/Security';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { WorkerPoolConfig } from '../types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1400,
    margin: '0 auto',
  },
  sectionCard: {
    marginBottom: theme.spacing(3),
    borderRadius: 12,
    boxShadow: theme.palette.type === 'dark' 
      ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
      : '0 2px 12px rgba(0, 0, 0, 0.08)',
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'visible',
  },
  sectionHeader: {
    padding: theme.spacing(2, 3),
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#f8f9fa',
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  sectionIcon: {
    color: theme.palette.primary.main,
  },
  sectionContent: {
    padding: theme.spacing(3),
  },
  subsectionTitle: {
    fontWeight: 600,
    fontSize: '0.95rem',
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  poolCard: {
    marginBottom: theme.spacing(2),
    borderRadius: 8,
    border: `2px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.type === 'dark' ? '#2a2a2a' : '#ffffff',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      boxShadow: theme.palette.type === 'dark'
        ? '0 4px 16px rgba(66, 153, 225, 0.3)'
        : '0 2px 8px rgba(66, 153, 225, 0.2)',
    },
  },
  poolHeader: {
    padding: theme.spacing(2, 2.5),
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#f8f9fa',
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  poolTitle: {
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  poolContent: {
    padding: theme.spacing(2.5),
  },
  formControl: {
    width: '100%',
  },
  accordion: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderRadius: '8px !important',
    border: `1px solid ${theme.palette.divider}`,
    '&:before': {
      display: 'none',
    },
    boxShadow: 'none',
  },
  accordionSummary: {
    backgroundColor: theme.palette.type === 'dark' ? '#2a2a2a' : '#f5f5f5',
    borderRadius: '8px !important',
    minHeight: '48px !important',
    '&.Mui-expanded': {
      minHeight: '48px !important',
      borderBottom: `1px solid ${theme.palette.divider}`,
      borderRadius: '8px 8px 0 0 !important',
    },
  },
  accordionDetails: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#fafafa',
  },
  helperText: {
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.secondary,
  },
  addButton: {
    marginTop: theme.spacing(2),
    borderRadius: 8,
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(1, 3),
  },
  chip: {
    marginLeft: theme.spacing(1),
    fontWeight: 600,
  },
  keyValueRow: {
    display: 'flex',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    alignItems: 'flex-start',
  },
  gridItem: {
    paddingBottom: theme.spacing(2),
  },
}));

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

export const VSphereInfrastructureConfiguration = ({
  cloudAccountUid,
  projectUid,
  controlPlaneConfig,
  workerPools,
  cloudConfig,
  tfMetadata,
  onUpdate,
}: VSphereInfrastructureConfigurationProps) => {
  const classes = useStyles();
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
        console.error('Failed to fetch control plane resources:', err);
      } finally {
        setCpResourcesLoading(false);
      }
    };

    fetchCpResources();
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
    <Box className={classes.root}>
      <Box mb={4}>
        <Typography variant="h4" style={{ fontWeight: 600, marginBottom: 8 }}>
          vSphere Infrastructure Configuration
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Configure your vSphere infrastructure settings for control plane and worker nodes
        </Typography>
      </Box>

      {showValidation && !isValid && (
        <Alert severity="error" style={{ marginBottom: 24 }} onClose={() => setShowValidation(false)}>
          <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 8 }}>
            Please complete the following required fields:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, idx) => (
              <li key={idx}><Typography variant="body2">{error}</Typography></li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Global Placement Settings */}
      <Accordion 
        expanded={expandedSections.has('global')}
        onChange={() => handleSectionToggle('global')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" width="100%">
            <CloudIcon className={classes.sectionIcon} style={{ marginRight: 8 }} />
            <Typography className={classes.sectionTitle}>
              Global Placement Settings
            </Typography>
            <Chip label="Required" size="small" color="primary" className={classes.chip} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box className={classes.sectionContent} style={{ width: '100%' }}>
          <Grid container spacing={3}>
          <Grid item xs={12} md={4} className={classes.gridItem}>
            <Autocomplete
              options={metadata?.datacenters?.map(dc => dc.datacenter) || []}
              value={cloudConfig.placement?.datacenter || ''}
              onChange={(_, newValue) => {
                if (newValue) {
                  handlePlacementChange('datacenter', newValue);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Datacenter"
                  required
                  helperText="Primary datacenter for cluster resources"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4} className={classes.gridItem}>
            <Autocomplete
              freeSolo
              options={selectedDatacenter?.folders || []}
              value={cloudConfig.placement?.folder || ''}
              onChange={(_, newValue) => {
                if (newValue) {
                  handlePlacementChange('folder', newValue);
                }
              }}
              onInputChange={(_, newValue) => {
                handlePlacementChange('folder', newValue);
              }}
              disabled={!selectedDatacenter}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Folder"
                  required
                  helperText="VM folder path (can type custom path)"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4} className={classes.gridItem}>
            <Autocomplete
              freeSolo
              options={selectedDatacenter?.folders || []}
              value={cloudConfig.placement?.imageTemplateFolder || 'spectro-templates'}
              onChange={(_, newValue) => {
                if (newValue) {
                  handlePlacementChange('imageTemplateFolder', newValue);
                }
              }}
              onInputChange={(_, newValue) => {
                handlePlacementChange('imageTemplateFolder', newValue || 'spectro-templates');
              }}
              disabled={!selectedDatacenter}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Image Template Folder"
                  required
                  helperText="Template location (default: spectro-templates)"
                />
              )}
            />
          </Grid>
        </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* SSH Keys & Network Settings */}
      <Accordion 
        expanded={expandedSections.has('auth-network')}
        onChange={() => handleSectionToggle('auth-network')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" width="100%">
            <SecurityIcon className={classes.sectionIcon} style={{ marginRight: 8 }} />
            <Typography className={classes.sectionTitle}>
              Authentication & Network
            </Typography>
            <Chip label="Required" size="small" color="primary" className={classes.chip} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box style={{ width: '100%' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} className={classes.gridItem}>
              <Typography className={classes.subsectionTitle}>
                <SecurityIcon fontSize="small" style={{ marginRight: 4 }} />
                SSH Key
              </Typography>
              {sshKeys.length > 0 ? (
                <Autocomplete
                  options={sshKeys}
                  getOptionLabel={(option) => option.name}
                  value={sshKeys.find(k => k.publicKey === cloudConfig.sshKeys?.[0]) || null}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      // Update cloud config with SSH key
                      handleCloudConfigChange('sshKeys', [newValue.publicKey]);
                      
                      // Update tfMetadata with SSH key info, preserving existing values
                      onUpdate({
                        tfMetadata: {
                          ...tfMetadata,
                          sshKeyName: newValue.name,
                          sshKeyContext: (newValue.context === 'tenant' ? 'tenant' : 'project') as 'tenant' | 'project',
                          pcgUid: overlordUid,
                          ipPools: ipPools.reduce((acc: Record<string, string>, pool: IPPool) => ({ ...acc, [pool.uid]: pool.name }), {}),
                        },
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select SSH Key *"
                      required
                      error={showValidation && (!cloudConfig.sshKeys || cloudConfig.sshKeys.length === 0)}
                      helperText={
                        showValidation && (!cloudConfig.sshKeys || cloudConfig.sshKeys.length === 0)
                          ? "SSH Key is required"
                          : "Authentication key for SSH access"
                      }
                    />
                  )}
                />
              ) : (
                <Alert severity="warning">
                  No SSH keys found. Please create an SSH key in Spectro Cloud first.
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} md={6} className={classes.gridItem}>
              <Typography className={classes.subsectionTitle}>
                <NetworkCheckIcon fontSize="small" style={{ marginRight: 4 }} />
                IP Allocation
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={cloudConfig.staticIp || false}
                    onChange={e => handleCloudConfigChange('staticIp', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" style={{ fontWeight: 500 }}>
                      Use Static IP Allocation
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Enable for static IP pools (recommended for production)
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            {/* NTP Servers */}
            <Grid item xs={12}>
              <Typography className={classes.subsectionTitle} style={{ marginTop: 16 }}>
                <DnsIcon fontSize="small" style={{ marginRight: 4 }} />
                NTP Servers <Chip label="Optional" size="small" variant="outlined" style={{ marginLeft: 8 }} />
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={10}>
                  <TextField
                    value={ntpInput}
                    onChange={e => setNtpInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        handleAddNTPServer();
                      }
                    }}
                    fullWidth
                    placeholder="e.g., pool.ntp.org or 10.100.100.100"
                    helperText="Add time synchronization servers (press Enter or click Add)"
                  />
                </Grid>
                <Grid item xs={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddNTPServer}
                    fullWidth
                    className={classes.addButton}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
              {(cloudConfig.ntpServers || []).map((server: string, idx: number) => (
                <Chip
                  key={idx}
                  label={server}
                  onDelete={() => handleRemoveNTPServer(idx)}
                  color="default"
                  style={{ margin: '8px 8px 0 0' }}
                />
              ))}
            </Grid>
          </Grid>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Control Plane */}
      <Accordion 
        expanded={expandedSections.has('controlplane')}
        onChange={() => handleSectionToggle('controlplane')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" width="100%">
            <SettingsIcon className={classes.sectionIcon} style={{ marginRight: 8 }} />
            <Typography className={classes.sectionTitle}>
              Control Plane Configuration
            </Typography>
            <Chip label="Required" size="small" color="primary" className={classes.chip} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box style={{ width: '100%' }}>
          <Accordion defaultExpanded className={classes.accordion}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
              <Typography style={{ fontWeight: 600 }}>
                <StorageIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Instance Type & Size
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.accordionDetails}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="CPU Cores *"
                  type="number"
                  value={
                    typeof controlPlaneConfig.instanceType === 'object' && controlPlaneConfig.instanceType !== null
                      ? controlPlaneConfig.instanceType.numCPUs || 4
                      : 4
                  }
                  onChange={e => handleControlPlaneInstanceTypeChange('numCPUs', parseInt(e.target.value, 10))}
                  fullWidth
                  required
                  inputProps={{ min: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Memory (MiB) *"
                  type="number"
                  value={
                    typeof controlPlaneConfig.instanceType === 'object' && controlPlaneConfig.instanceType !== null
                      ? controlPlaneConfig.instanceType.memoryMiB || 8192
                      : 8192
                  }
                  onChange={e => handleControlPlaneInstanceTypeChange('memoryMiB', parseInt(e.target.value, 10))}
                  fullWidth
                  required
                  inputProps={{ min: 4096, step: 1024 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Disk (GiB) *"
                  type="number"
                  value={
                    typeof controlPlaneConfig.instanceType === 'object' && controlPlaneConfig.instanceType !== null
                      ? controlPlaneConfig.instanceType.diskGiB || 60
                      : 60
                  }
                  onChange={e => handleControlPlaneInstanceTypeChange('diskGiB', parseInt(e.target.value, 10))}
                  fullWidth
                  required
                  inputProps={{ min: 20 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Node Count *"
                  type="number"
                  value={controlPlaneConfig.size || 1}
                  onChange={e => handleControlPlaneChange('size', parseInt(e.target.value, 10))}
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Box mt={2} mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={controlPlaneConfig.useControlPlaneAsWorker || false}
                onChange={(e) => handleControlPlaneChange('useControlPlaneAsWorker', e.target.checked)}
                color="primary"
              />
            }
            label="Allow workloads on control plane nodes"
          />
          <Typography variant="caption" color="textSecondary" display="block">
            When enabled, the control plane nodes can also run regular workloads (not recommended for production)
          </Typography>
        </Box>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Placement Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {!selectedDatacenter && (
              <Alert severity="info" style={{ marginBottom: 16, width: '100%' }}>
                Please select a datacenter first
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={selectedDatacenter?.computeclusters || []}
                  value={controlPlaneConfig.placements?.[0]?.cluster || ''}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleControlPlanePlacementChange(0, 'cluster', newValue);
                    }
                  }}
                  disabled={!selectedDatacenter}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Compute Cluster *"
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={cpResources?.datastores || []}
                  value={controlPlaneConfig.placements?.[0]?.datastore || ''}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleControlPlanePlacementChange(0, 'datastore', newValue);
                    }
                  }}
                  onInputChange={(_, newValue) => {
                    handleControlPlanePlacementChange(0, 'datastore', newValue);
                  }}
                  loading={cpResourcesLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Datastore *"
                      required
                      helperText={cpResourcesLoading ? 'Loading...' : 'Select or type datastore name'}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={['', ...(cpResources?.resourcePools || [])]}
                  value={controlPlaneConfig.placements?.[0]?.resourcePool || ''}
                  onChange={(_, newValue) => {
                    handleControlPlanePlacementChange(0, 'resourcePool', newValue || '');
                  }}
                  onInputChange={(_, newValue) => {
                    handleControlPlanePlacementChange(0, 'resourcePool', newValue);
                  }}
                  loading={cpResourcesLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Resource Pool"
                      helperText={cpResourcesLoading ? 'Loading...' : 'Leave empty for default or type custom name'}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={cpResources?.networks || []}
                  value={controlPlaneConfig.placements?.[0]?.network?.networkName || ''}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleControlPlaneNetworkChange(0, 'networkName', newValue);
                    }
                  }}
                  onInputChange={(_, newValue) => {
                    handleControlPlaneNetworkChange(0, 'networkName', newValue);
                  }}
                  loading={cpResourcesLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Network *"
                      required
                      helperText={cpResourcesLoading ? 'Loading...' : 'Select or type network path (e.g., /infra/segments/Demo-Network)'}
                    />
                  )}
                />
              </Grid>
              {cloudConfig.staticIp && (
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={ipPools}
                    getOptionLabel={(option) => option.name}
                    value={ipPools.find(p => p.uid === controlPlaneConfig.placements?.[0]?.network?.parentPoolUid) || null}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        handleControlPlaneNetworkChange(0, 'parentPoolUid', newValue.uid);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="IP Pool *"
                        required
                        helperText="Select IP pool for static IP allocation"
                      />
                    )}
                  />
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Additional Labels & Annotations (Optional)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box width="100%">
              <Typography variant="subtitle2" gutterBottom>
                Labels (Kubernetes Node Labels)
              </Typography>
              {Object.entries(controlPlaneConfig.additionalLabels || {}).map(([key, value], idx) => (
                <Grid container spacing={2} key={idx} style={{ marginBottom: 8 }}>
                  <Grid item xs={5}>
                    <TextField
                      label="Key"
                      value={key}
                      onChange={e => {
                        const newLabels = { ...controlPlaneConfig.additionalLabels };
                        delete newLabels[key];
                        newLabels[e.target.value] = value;
                        handleControlPlaneChange('additionalLabels', newLabels);
                      }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      label="Value"
                      value={value}
                      onChange={e => {
                        const newLabels = { ...controlPlaneConfig.additionalLabels };
                        newLabels[key] = e.target.value;
                        handleControlPlaneChange('additionalLabels', newLabels);
                      }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton
                      onClick={() => {
                        const newLabels = { ...controlPlaneConfig.additionalLabels };
                        delete newLabels[key];
                        handleControlPlaneChange('additionalLabels', newLabels);
                      }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  const newLabels = { ...(controlPlaneConfig.additionalLabels || {}), '': '' };
                  handleControlPlaneChange('additionalLabels', newLabels);
                }}
                size="small"
              >
                Add Label
              </Button>

              <Box mt={3} mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                Annotations (Kubernetes Node Annotations)
              </Typography>
              {Object.entries(controlPlaneConfig.additionalAnnotations || {}).map(([key, value], idx) => (
                <Grid container spacing={2} key={idx} style={{ marginBottom: 8 }}>
                  <Grid item xs={5}>
                    <TextField
                      label="Key"
                      value={key}
                      onChange={e => {
                        const newAnnotations = { ...controlPlaneConfig.additionalAnnotations };
                        delete newAnnotations[key];
                        newAnnotations[e.target.value] = value;
                        handleControlPlaneChange('additionalAnnotations', newAnnotations);
                      }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      label="Value"
                      value={value}
                      onChange={e => {
                        const newAnnotations = { ...controlPlaneConfig.additionalAnnotations };
                        newAnnotations[key] = e.target.value;
                        handleControlPlaneChange('additionalAnnotations', newAnnotations);
                      }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton
                      onClick={() => {
                        const newAnnotations = { ...controlPlaneConfig.additionalAnnotations };
                        delete newAnnotations[key];
                        handleControlPlaneChange('additionalAnnotations', newAnnotations);
                      }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  const newAnnotations = { ...(controlPlaneConfig.additionalAnnotations || {}), '': '' };
                  handleControlPlaneChange('additionalAnnotations', newAnnotations);
                }}
                size="small"
              >
                Add Annotation
              </Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Taints (Optional)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box width="100%">
              <Typography variant="body2" color="textSecondary" paragraph>
                Taints prevent pods from being scheduled on these nodes unless they have matching tolerations
              </Typography>
              {(controlPlaneConfig.taints || []).map((taint: { key: string; value: string; effect: string }, idx: number) => (
                <Grid container spacing={2} key={idx} style={{ marginBottom: 8 }}>
                  <Grid item xs={4}>
                    <TextField
                      label="Key"
                      value={taint.key}
                      onChange={e => {
                        const newTaints = [...(controlPlaneConfig.taints || [])];
                        newTaints[idx] = { ...newTaints[idx], key: e.target.value };
                        handleControlPlaneChange('taints', newTaints);
                      }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="Value"
                      value={taint.value}
                      onChange={e => {
                        const newTaints = [...(controlPlaneConfig.taints || [])];
                        newTaints[idx] = { ...newTaints[idx], value: e.target.value };
                        handleControlPlaneChange('taints', newTaints);
                      }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Effect</InputLabel>
                      <Select
                        value={taint.effect}
                        onChange={e => {
                          const newTaints = [...(controlPlaneConfig.taints || [])];
                          newTaints[idx] = { ...newTaints[idx], effect: e.target.value as any };
                          handleControlPlaneChange('taints', newTaints);
                        }}
                      >
                        <MenuItem value="NoSchedule">NoSchedule</MenuItem>
                        <MenuItem value="NoExecute">NoExecute</MenuItem>
                        <MenuItem value="PreferNoSchedule">PreferNoSchedule</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton
                      onClick={() => {
                        const newTaints = [...(controlPlaneConfig.taints || [])];
                        newTaints.splice(idx, 1);
                        handleControlPlaneChange('taints', newTaints);
                      }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  const newTaints = [...(controlPlaneConfig.taints || []), { key: '', value: '', effect: 'NoSchedule' }];
                  handleControlPlaneChange('taints', newTaints);
                }}
                size="small"
              >
                Add Taint
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Worker Pools */}
      <Accordion 
        expanded={expandedSections.has('workerpools')}
        onChange={() => handleSectionToggle('workerpools')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" width="100%">
            <WorkIcon className={classes.sectionIcon} style={{ marginRight: 8 }} />
            <Typography className={classes.sectionTitle}>
              Worker Pools
            </Typography>
            <Chip label={`${workerPools.length} Pool(s)`} size="small" color="secondary" className={classes.chip} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box style={{ width: '100%' }}>
          {workerPools.map((pool, poolIdx) => {
            const poolResourceData = poolResources.get(poolIdx);
            const isLoadingPoolResources = poolResourcesLoading.has(poolIdx);
            
            return (
              <Card key={poolIdx} className={classes.poolCard}>
                <Box className={classes.poolHeader}>
                  <Typography className={classes.poolTitle}>
                    <WorkIcon fontSize="small" style={{ marginRight: 8 }} />
                    Worker Pool {poolIdx + 1}: {pool.name || 'Unnamed'}
                  </Typography>
                  <IconButton onClick={() => handleRemoveWorkerPool(poolIdx)} size="small" color="secondary">
                    <DeleteIcon />
                  </IconButton>
                </Box>

                <Box className={classes.poolContent}>
                  <Accordion className={classes.accordion}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
                      <Typography style={{ fontWeight: 600 }}>
                        <SettingsIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Basic Configuration
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails className={classes.accordionDetails}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Pool Name *"
                        value={pool.name}
                        onChange={e => handleWorkerPoolChange(poolIdx, 'name', e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={pool.useAutoscaler || false}
                            onChange={e => handleWorkerPoolChange(poolIdx, 'useAutoscaler', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Enable Autoscaler"
                      />
                    </Grid>
                    {pool.useAutoscaler ? (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Min Size *"
                            type="number"
                            value={pool.minSize || 1}
                            onChange={e => handleWorkerPoolChange(poolIdx, 'minSize', parseInt(e.target.value, 10))}
                            fullWidth
                            required
                            inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Max Size *"
                            type="number"
                            value={pool.maxSize || 10}
                            onChange={e => handleWorkerPoolChange(poolIdx, 'maxSize', parseInt(e.target.value, 10))}
                            fullWidth
                            required
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                      </>
                    ) : (
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Size *"
                          type="number"
                          value={pool.size}
                          onChange={e => handleWorkerPoolChange(poolIdx, 'size', parseInt(e.target.value, 10))}
                          fullWidth
                          required
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Update Strategy</InputLabel>
                        <Select
                          value={pool.updateStrategy?.type || 'RollingUpdateScaleOut'}
                          onChange={e => {
                            const updated = [...workerPools];
                            updated[poolIdx] = {
                              ...updated[poolIdx],
                              updateStrategy: {
                                type: e.target.value as 'RollingUpdateScaleOut' | 'RollingUpdateScaleIn' | 'OverrideScaling',
                                ...(e.target.value === 'OverrideScaling' ? { maxSurge: '1', maxUnavailable: '0' } : {})
                              }
                            };
                            onUpdate({ workerPools: updated });
                          }}
                        >
                          <MenuItem value="RollingUpdateScaleOut">Expand First (Scale Out)</MenuItem>
                          <MenuItem value="RollingUpdateScaleIn">Contract First (Scale In)</MenuItem>
                          <MenuItem value="OverrideScaling">Custom</MenuItem>
                        </Select>
                        <FormHelperText>
                          {pool.updateStrategy?.type === 'RollingUpdateScaleOut' && 'Adds new nodes before removing old ones'}
                          {pool.updateStrategy?.type === 'RollingUpdateScaleIn' && 'Removes old nodes before adding new ones'}
                          {pool.updateStrategy?.type === 'OverrideScaling' && 'Specify custom maxSurge and maxUnavailable values'}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                    {pool.updateStrategy?.type === 'OverrideScaling' && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Max Surge"
                            value={pool.updateStrategy?.maxSurge || '1'}
                            onChange={e => {
                              const updated = [...workerPools];
                              updated[poolIdx] = {
                                ...updated[poolIdx],
                                updateStrategy: {
                                  ...updated[poolIdx].updateStrategy!,
                                  maxSurge: e.target.value
                                }
                              };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            helperText="Number or percentage of pods that can be created above desired amount"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Max Unavailable"
                            value={pool.updateStrategy?.maxUnavailable || '0'}
                            onChange={e => {
                              const updated = [...workerPools];
                              updated[poolIdx] = {
                                ...updated[poolIdx],
                                updateStrategy: {
                                  ...updated[poolIdx].updateStrategy!,
                                  maxUnavailable: e.target.value
                                }
                              };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            helperText="Number or percentage of pods that can be unavailable during update"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Instance Type</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="CPU Cores *"
                        type="number"
                        value={
                          typeof pool.instanceType === 'object' && pool.instanceType !== null
                            ? pool.instanceType.numCPUs || 4
                            : 4
                        }
                        onChange={e => handleWorkerPoolInstanceTypeChange(poolIdx, 'numCPUs', parseInt(e.target.value, 10))}
                        fullWidth
                        required
                        inputProps={{ min: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Memory (MiB) *"
                        type="number"
                        value={
                          typeof pool.instanceType === 'object' && pool.instanceType !== null
                            ? pool.instanceType.memoryMiB || 8192
                            : 8192
                        }
                        onChange={e => handleWorkerPoolInstanceTypeChange(poolIdx, 'memoryMiB', parseInt(e.target.value, 10))}
                        fullWidth
                        required
                        inputProps={{ min: 4096, step: 1024 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Disk (GiB) *"
                        type="number"
                        value={
                          typeof pool.instanceType === 'object' && pool.instanceType !== null
                            ? pool.instanceType.diskGiB || 60
                            : 60
                        }
                        onChange={e => handleWorkerPoolInstanceTypeChange(poolIdx, 'diskGiB', parseInt(e.target.value, 10))}
                        fullWidth
                        required
                        inputProps={{ min: 20 }}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Placement Configuration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box width="100%">
                    {!selectedDatacenter && (
                      <Alert severity="info" style={{ marginBottom: 16 }}>
                        Please select a datacenter first
                      </Alert>
                    )}
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => handleCopyFromControlPlane(poolIdx)}
                        disabled={!controlPlaneConfig.placements?.[0]?.cluster}
                      >
                        Copy from Control Plane
                      </Button>
                    </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        options={selectedDatacenter?.computeclusters || []}
                        value={pool.placements?.[0]?.cluster || ''}
                        onChange={(_, newValue) => {
                          if (newValue) {
                            handleWorkerPoolPlacementChange(poolIdx, 0, 'cluster', newValue);
                          }
                        }}
                        disabled={!selectedDatacenter}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Compute Cluster *"
                            required
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        freeSolo
                        options={poolResourceData?.datastores || []}
                        value={pool.placements?.[0]?.datastore || ''}
                        onChange={(_, newValue) => {
                          if (newValue) {
                            handleWorkerPoolPlacementChange(poolIdx, 0, 'datastore', newValue);
                          }
                        }}
                        onInputChange={(_, newValue) => {
                          handleWorkerPoolPlacementChange(poolIdx, 0, 'datastore', newValue);
                        }}
                        loading={isLoadingPoolResources}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Datastore *"
                            required
                            helperText={isLoadingPoolResources ? 'Loading...' : 'Select or type datastore name'}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        freeSolo
                        options={['', ...(poolResourceData?.resourcePools || [])]}
                        value={pool.placements?.[0]?.resourcePool || ''}
                        onChange={(_, newValue) => {
                          handleWorkerPoolPlacementChange(poolIdx, 0, 'resourcePool', newValue || '');
                        }}
                        onInputChange={(_, newValue) => {
                          handleWorkerPoolPlacementChange(poolIdx, 0, 'resourcePool', newValue);
                        }}
                        loading={isLoadingPoolResources}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Resource Pool"
                            helperText={isLoadingPoolResources ? 'Loading...' : 'Leave empty for default or type custom name'}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        freeSolo
                        options={poolResourceData?.networks || []}
                        value={pool.placements?.[0]?.network?.networkName || ''}
                        onChange={(_, newValue) => {
                          if (newValue) {
                            handleWorkerPoolNetworkChange(poolIdx, 0, 'networkName', newValue);
                          }
                        }}
                        onInputChange={(_, newValue) => {
                          handleWorkerPoolNetworkChange(poolIdx, 0, 'networkName', newValue);
                        }}
                        loading={isLoadingPoolResources}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Network *"
                            required
                            helperText={isLoadingPoolResources ? 'Loading...' : 'Select or type network path (e.g., /infra/segments/Demo-Network)'}
                          />
                        )}
                      />
                    </Grid>
                    {cloudConfig.staticIp && (
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          options={ipPools}
                          getOptionLabel={(option) => option.name}
                          value={ipPools.find(p => p.uid === pool.placements?.[0]?.network?.parentPoolUid) || null}
                          onChange={(_, newValue) => {
                            if (newValue) {
                              handleWorkerPoolNetworkChange(poolIdx, 0, 'parentPoolUid', newValue.uid);
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="IP Pool *"
                              required
                              helperText="Select IP pool for static IP allocation"
                            />
                          )}
                        />
                      </Grid>
                    )}
                  </Grid>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Additional Labels & Annotations (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box width="100%">
                    <Typography variant="subtitle2" gutterBottom>
                      Labels (Kubernetes Node Labels)
                    </Typography>
                    {Object.entries(pool.additionalLabels || {}).map(([key, value], idx) => (
                      <Grid container spacing={2} key={idx} style={{ marginBottom: 8 }}>
                        <Grid item xs={5}>
                          <TextField
                            label="Key"
                            value={key}
                            onChange={e => {
                              const updated = [...workerPools];
                              const newLabels = { ...updated[poolIdx].additionalLabels };
                              delete newLabels[key];
                              newLabels[e.target.value] = value;
                              updated[poolIdx] = { ...updated[poolIdx], additionalLabels: newLabels };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={5}>
                          <TextField
                            label="Value"
                            value={value}
                            onChange={e => {
                              const updated = [...workerPools];
                              const newLabels = { ...updated[poolIdx].additionalLabels };
                              newLabels[key] = e.target.value;
                              updated[poolIdx] = { ...updated[poolIdx], additionalLabels: newLabels };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={2}>
                          <IconButton
                            onClick={() => {
                              const updated = [...workerPools];
                              const newLabels = { ...updated[poolIdx].additionalLabels };
                              delete newLabels[key];
                              updated[poolIdx] = { ...updated[poolIdx], additionalLabels: newLabels };
                              onUpdate({ workerPools: updated });
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const updated = [...workerPools];
                        updated[poolIdx] = {
                          ...updated[poolIdx],
                          additionalLabels: { ...(updated[poolIdx].additionalLabels || {}), '': '' }
                        };
                        onUpdate({ workerPools: updated });
                      }}
                      size="small"
                    >
                      Add Label
                    </Button>

                    <Box mt={3} mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                      Annotations (Kubernetes Node Annotations)
                    </Typography>
                    {Object.entries(pool.additionalAnnotations || {}).map(([key, value], idx) => (
                      <Grid container spacing={2} key={idx} style={{ marginBottom: 8 }}>
                        <Grid item xs={5}>
                          <TextField
                            label="Key"
                            value={key}
                            onChange={e => {
                              const updated = [...workerPools];
                              const newAnnotations = { ...updated[poolIdx].additionalAnnotations };
                              delete newAnnotations[key];
                              newAnnotations[e.target.value] = value;
                              updated[poolIdx] = { ...updated[poolIdx], additionalAnnotations: newAnnotations };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={5}>
                          <TextField
                            label="Value"
                            value={value}
                            onChange={e => {
                              const updated = [...workerPools];
                              const newAnnotations = { ...updated[poolIdx].additionalAnnotations };
                              newAnnotations[key] = e.target.value;
                              updated[poolIdx] = { ...updated[poolIdx], additionalAnnotations: newAnnotations };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={2}>
                          <IconButton
                            onClick={() => {
                              const updated = [...workerPools];
                              const newAnnotations = { ...updated[poolIdx].additionalAnnotations };
                              delete newAnnotations[key];
                              updated[poolIdx] = { ...updated[poolIdx], additionalAnnotations: newAnnotations };
                              onUpdate({ workerPools: updated });
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const updated = [...workerPools];
                        updated[poolIdx] = {
                          ...updated[poolIdx],
                          additionalAnnotations: { ...(updated[poolIdx].additionalAnnotations || {}), '': '' }
                        };
                        onUpdate({ workerPools: updated });
                      }}
                      size="small"
                    >
                      Add Annotation
                    </Button>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Taints (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box width="100%">
                    <Typography variant="body2" color="textSecondary" paragraph>
                      Taints prevent pods from being scheduled on these nodes unless they have matching tolerations
                    </Typography>
                    {(pool.taints || []).map((taint, idx) => (
                      <Grid container spacing={2} key={idx} style={{ marginBottom: 8 }}>
                        <Grid item xs={4}>
                          <TextField
                            label="Key"
                            value={taint.key}
                            onChange={e => {
                              const updated = [...workerPools];
                              const newTaints = [...(updated[poolIdx].taints || [])];
                              newTaints[idx] = { ...newTaints[idx], key: e.target.value };
                              updated[poolIdx] = { ...updated[poolIdx], taints: newTaints };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            label="Value"
                            value={taint.value}
                            onChange={e => {
                              const updated = [...workerPools];
                              const newTaints = [...(updated[poolIdx].taints || [])];
                              newTaints[idx] = { ...newTaints[idx], value: e.target.value };
                              updated[poolIdx] = { ...updated[poolIdx], taints: newTaints };
                              onUpdate({ workerPools: updated });
                            }}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Effect</InputLabel>
                            <Select
                              value={taint.effect}
                              onChange={e => {
                                const updated = [...workerPools];
                                const newTaints = [...(updated[poolIdx].taints || [])];
                                newTaints[idx] = { ...newTaints[idx], effect: e.target.value as any };
                                updated[poolIdx] = { ...updated[poolIdx], taints: newTaints };
                                onUpdate({ workerPools: updated });
                              }}
                            >
                              <MenuItem value="NoSchedule">NoSchedule</MenuItem>
                              <MenuItem value="NoExecute">NoExecute</MenuItem>
                              <MenuItem value="PreferNoSchedule">PreferNoSchedule</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={2}>
                          <IconButton
                            onClick={() => {
                              const updated = [...workerPools];
                              const newTaints = [...(updated[poolIdx].taints || [])];
                              newTaints.splice(idx, 1);
                              updated[poolIdx] = { ...updated[poolIdx], taints: newTaints };
                              onUpdate({ workerPools: updated });
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const updated = [...workerPools];
                        updated[poolIdx] = {
                          ...updated[poolIdx],
                          taints: [...(updated[poolIdx].taints || []), { key: '', value: '', effect: 'NoSchedule' }]
                        };
                        onUpdate({ workerPools: updated });
                      }}
                      size="small"
                    >
                      Add Taint
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
                </Box>
              </Card>
            );
          })}

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddWorkerPool}
            className={classes.addButton}
            size="large"
          >
            Add Worker Pool
          </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
