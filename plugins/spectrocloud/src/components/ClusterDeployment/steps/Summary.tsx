import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import GetAppIcon from '@material-ui/icons/GetApp';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { ClusterDeploymentState, CLOUD_TYPE_LABELS, CloudType } from '../types';
import { ClusterCreationRequest } from '../../../api/SpectroCloudApi';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { docco, atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  summaryPaper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  label: {
    fontWeight: 'bold',
    marginRight: theme.spacing(1),
  },
  tfPreview: {
    maxHeight: 400,
    overflow: 'auto',
  },
  deployButton: {
    marginTop: theme.spacing(2),
  },
  successMessage: {
    marginTop: theme.spacing(2),
  },
}));

interface SummaryProps {
  state: ClusterDeploymentState;
  onDeploy: () => void;
}

// Helper function to generate Terraform configuration
const generateTerraformConfig = (state: ClusterDeploymentState): string => {
  const resourceType = getResourceType(state.cloudType!);
  const lines: string[] = [];

  // Collect unique IP pools used across all placements
  const ipPoolUids = new Set<string>();
  if (state.cloudType === 'vsphere') {
    // Check control plane
    state.controlPlaneConfig.placements?.forEach((placement: any) => {
      if (placement.network?.parentPoolUid) {
        ipPoolUids.add(placement.network.parentPoolUid);
      }
    });
    // Check worker pools
    state.workerPools.forEach(pool => {
      pool.placements?.forEach((placement: any) => {
        if (placement.network?.parentPoolUid) {
          ipPoolUids.add(placement.network.parentPoolUid);
        }
      });
    });
  }

  // Create a map of IP pool UID to data source index
  const ipPoolUidToIndex = new Map<string, number>();
  Array.from(ipPoolUids).forEach((uid, idx) => {
    ipPoolUidToIndex.set(uid, idx);
  });

  // Header
  lines.push(`# Spectro Cloud Cluster - ${state.clusterName}`);
  if (state.clusterDescription) {
    lines.push('# Description:');
    state.clusterDescription.split('\n').forEach(line => {
      lines.push(`#   ${line}`);
    });
  }
  lines.push('# Generated from Backstage Cluster Deployment Wizard');
  lines.push(`# Reference: https://registry.terraform.io/providers/spectrocloud/spectrocloud/latest/docs/resources/cluster_${resourceType}`);
  lines.push('');

  // Data sources
  lines.push(`data "spectrocloud_cloudaccount_${state.cloudType}" "account" {`);
  lines.push(`  name = "${state.cloudAccountName || 'your-cloud-account'}"`);
  lines.push('}');
  lines.push('');

  // Private Cloud Gateway (PCG) data source (vSphere)
  if (state.cloudType === 'vsphere' && state.tfMetadata?.pcgUid) {
    const pcgName = state.tfMetadata?.pcgName || 'your-pcg-name';
    console.log('[TF Generation] Using PCG name:', pcgName);
    lines.push('data "spectrocloud_private_cloud_gateway" "pcg" {');
    lines.push(`  name = "${pcgName}"`);
    lines.push('}');
    lines.push('');
  }

  // SSH Key data source (vSphere)
  if (state.cloudType === 'vsphere' && state.cloudConfig.sshKeys && state.cloudConfig.sshKeys.length > 0) {
    const sshKeyName = state.tfMetadata?.sshKeyName || 'your-ssh-key-name';
    const sshKeyContext = state.tfMetadata?.sshKeyContext || 'project';
    
    lines.push('data "spectrocloud_ssh_key" "ssh_key" {');
    lines.push(`  name    = "${sshKeyName}"`);
    lines.push(`  context = "${sshKeyContext}"`);
    lines.push('}');
    lines.push('');
  }

  // IP Pool data sources (vSphere) - always tenant scoped
  if (ipPoolUids.size > 0 && state.tfMetadata?.pcgUid) {
    Array.from(ipPoolUids).forEach((poolUid, idx) => {
      const poolName = state.tfMetadata?.ipPools?.[poolUid] || `your-ip-pool-${idx}`;
      lines.push(`data "spectrocloud_ippool" "ippool_${idx}" {`);
      lines.push(`  name                     = "${poolName}"`);
      lines.push('  private_cloud_gateway_id = data.spectrocloud_private_cloud_gateway.pcg.id');
      lines.push('}');
    });
    lines.push('');
  }

  // Profile data sources
  state.profiles.forEach((profile, idx) => {
    lines.push(`data "spectrocloud_cluster_profile" "profile_${idx}" {`);
    lines.push(`  name    = "${profile.name}"`);
    lines.push(`  context = "${profile.scope || 'project'}"`);
    lines.push('}');
  });
  lines.push('');

  // Main resource
  lines.push(`resource "spectrocloud_cluster_${resourceType}" "cluster" {`);
  lines.push(`  name             = "${state.clusterName}"`);
  lines.push(`  cloud_account_id = data.spectrocloud_cloudaccount_${state.cloudType}.account.id`);
  lines.push('');

  // Description (separate field, not in annotations)
  if (state.clusterDescription) {
    lines.push(`  description = "${state.clusterDescription.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
    lines.push('');
  }

  // Tags
  if (state.clusterTags && state.clusterTags.length > 0) {
    lines.push('  tags = [');
    state.clusterTags.forEach(tag => {
      lines.push(`    "${tag}",`);
    });
    lines.push('  ]');
    lines.push('');
  }

  // vSphere-specific cloud config
  if (state.cloudType === 'vsphere') {
    lines.push('  cloud_config {');
    if (state.cloudConfig.placement) {
      lines.push(`    datacenter            = "${state.cloudConfig.placement.datacenter || ''}"`);
      lines.push(`    folder                = "${state.cloudConfig.placement.folder || ''}"`);
      if (state.cloudConfig.placement.imageTemplateFolder) {
        lines.push(`    image_template_folder = "${state.cloudConfig.placement.imageTemplateFolder}"`);
      }
    }
    if (state.cloudConfig.staticIp) {
      lines.push(`    static_ip = ${state.cloudConfig.staticIp}`);
    }
    if (state.cloudConfig.sshKeys && state.cloudConfig.sshKeys.length > 0) {
      // ssh_keys is a set of strings (the actual SSH key values, not IDs)
      lines.push('    ssh_keys = [');
      lines.push('      data.spectrocloud_ssh_key.ssh_key.id,');
      lines.push('    ]');
    }
    if (state.cloudConfig.ntpServers && state.cloudConfig.ntpServers.length > 0) {
      lines.push('    ntp_servers = [');
      state.cloudConfig.ntpServers.forEach((server: string) => {
        lines.push(`      "${server}",`);
      });
      lines.push('    ]');
    }
    lines.push('  }');
    lines.push('');
  }

  // Profiles with pack values and variables
  state.profiles.forEach((profile, idx) => {
    lines.push('  cluster_profile {');
    lines.push(`    id = data.spectrocloud_cluster_profile.profile_${idx}.id`);
    
    // Add profile variables ONLY for this specific profile
    const profileVariableNames = state.profileVariablesByProfile?.[profile.uid] || [];
    if (profileVariableNames.length > 0) {
      const profileVariables: Record<string, any> = {};
      profileVariableNames.forEach(varName => {
        if (state.profileVariables.hasOwnProperty(varName)) {
          profileVariables[varName] = state.profileVariables[varName];
        }
      });
      
      if (Object.keys(profileVariables).length > 0) {
        lines.push('');
        lines.push('    variables = {');
        Object.entries(profileVariables).forEach(([key, value]) => {
          let stringValue: string;
          if (typeof value === 'string') {
            // Escape backslashes, quotes, and newlines for HCL
            stringValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            stringValue = String(value);
          } else {
            stringValue = JSON.stringify(value).replace(/"/g, '\\"');
          }
          lines.push(`      ${key} = "${stringValue}"`);
        });
        lines.push('    }');
      }
    }
    
    lines.push('  }');
    lines.push('');
  });

  // Control plane machine pool (vSphere)
  if (state.cloudType === 'vsphere') {
    lines.push('  machine_pool {');
    lines.push('    name                    = "control-plane-pool"');
    lines.push('    control_plane           = true');
    lines.push(`    control_plane_as_worker = ${state.controlPlaneConfig.useControlPlaneAsWorker || false}`);
    lines.push(`    count                   = ${state.controlPlaneConfig.size || 1}`);
    lines.push('');
    
    // instance_type block (required)
    if (typeof state.controlPlaneConfig.instanceType === 'object' && state.controlPlaneConfig.instanceType !== null) {
      lines.push('    instance_type {');
      lines.push(`      disk_size_gb = ${state.controlPlaneConfig.instanceType.diskGiB || 60}`);
      lines.push(`      memory_mb    = ${state.controlPlaneConfig.instanceType.memoryMiB || 8192}`);
      lines.push(`      cpu          = ${state.controlPlaneConfig.instanceType.numCPUs || 4}`);
      lines.push('    }');
      lines.push('');
    }
    
    // placement block (required)
    const cpPlacement = state.controlPlaneConfig.placements?.[0];
    if (cpPlacement) {
      lines.push('    placement {');
      lines.push(`      cluster       = "${cpPlacement.cluster}"`);
      lines.push(`      resource_pool = "${cpPlacement.resourcePool || ''}"`);
      lines.push(`      datastore     = "${cpPlacement.datastore}"`);
      lines.push(`      network       = "${cpPlacement.network?.networkName}"`);
      if (cpPlacement.network?.staticIp && cpPlacement.network?.parentPoolUid) {
        const poolIndex = ipPoolUidToIndex.get(cpPlacement.network.parentPoolUid);
        if (poolIndex !== undefined) {
          lines.push(`      static_ip_pool_id = data.spectrocloud_ippool.ippool_${poolIndex}.id`);
        }
      }
      lines.push('    }');
      lines.push('');
    }
    
    // Additional Labels
    if (state.controlPlaneConfig.additionalLabels && Object.keys(state.controlPlaneConfig.additionalLabels).length > 0) {
      lines.push('    additional_labels = {');
      Object.entries(state.controlPlaneConfig.additionalLabels).forEach(([key, value]) => {
        lines.push(`      "${key}" = "${value}"`);
      });
      lines.push('    }');
      lines.push('');
    }
    
    // Additional Annotations
    if (state.controlPlaneConfig.additionalAnnotations && Object.keys(state.controlPlaneConfig.additionalAnnotations).length > 0) {
      lines.push('    additional_annotations = {');
      Object.entries(state.controlPlaneConfig.additionalAnnotations).forEach(([key, value]) => {
        lines.push(`      "${key}" = "${value}"`);
      });
      lines.push('    }');
      lines.push('');
    }
    
    // Taints (multiple taints blocks)
    if (state.controlPlaneConfig.taints && state.controlPlaneConfig.taints.length > 0) {
      state.controlPlaneConfig.taints.forEach((taint: any) => {
        lines.push('    taints {');
        lines.push(`      key    = "${taint.key}"`);
        lines.push(`      value  = "${taint.value}"`);
        lines.push(`      effect = "${taint.effect}"`);
        lines.push('    }');
      });
      lines.push('');
    }
    
    lines.push('  }');
    lines.push('');
  }

  // Worker pools
  state.workerPools.forEach((pool) => {
    lines.push('  machine_pool {');
    lines.push(`    name = "${pool.name}"`);
    lines.push('');
    
    // count, min, max
    if (pool.useAutoscaler) {
      lines.push(`    count = ${pool.minSize || 1}`);
      lines.push(`    min   = ${pool.minSize || 1}`);
      lines.push(`    max   = ${pool.maxSize || 10}`);
    } else {
      lines.push(`    count = ${pool.size}`);
    }
    lines.push('');
    
    if (state.cloudType === 'vsphere') {
      // instance_type block (required)
      if (typeof pool.instanceType === 'object' && pool.instanceType !== null) {
        lines.push('    instance_type {');
        lines.push(`      disk_size_gb = ${pool.instanceType.diskGiB || 60}`);
        lines.push(`      memory_mb    = ${pool.instanceType.memoryMiB || 8192}`);
        lines.push(`      cpu          = ${pool.instanceType.numCPUs || 4}`);
        lines.push('    }');
        lines.push('');
      }
      
      // placement block (required)
      const placement = pool.placements?.[0];
      if (placement) {
        lines.push('    placement {');
        lines.push(`      cluster       = "${placement.cluster}"`);
        lines.push(`      resource_pool = "${placement.resourcePool || ''}"`);
        lines.push(`      datastore     = "${placement.datastore}"`);
        lines.push(`      network       = "${placement.network?.networkName}"`);
        if (placement.network?.staticIp && placement.network?.parentPoolUid) {
          const poolIndex = ipPoolUidToIndex.get(placement.network.parentPoolUid);
          if (poolIndex !== undefined) {
            lines.push(`      static_ip_pool_id = data.spectrocloud_ippool.ippool_${poolIndex}.id`);
          }
        }
        lines.push('    }');
        lines.push('');
      }
    } else {
      lines.push(`    instance_type = "${pool.instanceType || 't3.large'}"`);
      lines.push('');
    }
    
    // Additional Labels
    if (pool.additionalLabels && Object.keys(pool.additionalLabels).length > 0) {
      lines.push('    additional_labels = {');
      Object.entries(pool.additionalLabels).forEach(([key, value]) => {
        lines.push(`      "${key}" = "${value}"`);
      });
      lines.push('    }');
      lines.push('');
    }
    
    // Additional Annotations
    if (pool.additionalAnnotations && Object.keys(pool.additionalAnnotations).length > 0) {
      lines.push('    additional_annotations = {');
      Object.entries(pool.additionalAnnotations).forEach(([key, value]) => {
        lines.push(`      "${key}" = "${value}"`);
      });
      lines.push('    }');
      lines.push('');
    }
    
    // Taints (multiple taints blocks)
    if (pool.taints && pool.taints.length > 0) {
      pool.taints.forEach((taint: any) => {
        lines.push('    taints {');
        lines.push(`      key    = "${taint.key}"`);
        lines.push(`      value  = "${taint.value}"`);
        lines.push(`      effect = "${taint.effect}"`);
        lines.push('    }');
      });
      lines.push('');
    }
    
    // Update Strategy (string field, not a block)
    if (pool.updateStrategy && pool.updateStrategy.type) {
      lines.push(`    update_strategy = "${pool.updateStrategy.type}"`);
      
      // override_scaling block (only if OverrideScaling)
      if (pool.updateStrategy.type === 'OverrideScaling') {
        lines.push('    override_scaling {');
        if (pool.updateStrategy.maxSurge) {
          lines.push(`      max_surge       = "${pool.updateStrategy.maxSurge}"`);
        }
        if (pool.updateStrategy.maxUnavailable) {
          lines.push(`      max_unavailable = "${pool.updateStrategy.maxUnavailable}"`);
        }
        lines.push('    }');
      }
      lines.push('');
    }
    
    lines.push('  }');
    lines.push('');
  });

  lines.push('}');
  return lines.join('\n');
};

const getResourceType = (cloudType: CloudType): string => {
  switch (cloudType) {
    case 'eks':
      return 'eks';
    case 'aws':
      return 'aws';
    case 'aks':
      return 'aks';
    case 'azure':
      return 'azure';
    case 'vsphere':
      return 'vsphere';
    default:
      return cloudType;
  }
};

export const Summary = ({ state, onDeploy }: SummaryProps) => {
  const classes = useStyles();
  const theme = useTheme();
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [deployedClusterUid, setDeployedClusterUid] = useState<string>();
  const [error, setError] = useState<string>();
  const [tfCopied, setTfCopied] = useState(false);

  // Generate Terraform config on the client side
  const tfConfig = useMemo(() => {
    return generateTerraformConfig(state);
  }, [state]);

  const handleDownloadTerraform = () => {
    const filename = `${state.clusterName || 'cluster'}.tf`;
    const blob = new Blob([tfConfig], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCopyTerraform = async () => {
    try {
      await navigator.clipboard.writeText(tfConfig);
      setTfCopied(true);
      setTimeout(() => setTfCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const buildClusterConfig = (): ClusterCreationRequest => {
    if (state.cloudType === 'vsphere') {
      // vSphere has a different structure with machinePoolConfig
      const machinePoolConfig = [];
      
      // Control plane as a machine pool with isControlPlane: true
      machinePoolConfig.push({
        cloudConfig: {
          instanceType: state.controlPlaneConfig.instanceType || {
            numCPUs: 4,
            memoryMiB: 8192,
            diskGiB: 60,
          },
          placements: state.controlPlaneConfig.placements || [],
        },
        poolConfig: {
          name: 'control-plane-pool',
          labels: state.controlPlaneConfig.labels || ['control-plane'],
          isControlPlane: true,
          useControlPlaneAsWorker: state.controlPlaneConfig.useControlPlaneAsWorker || false,
          taints: state.controlPlaneConfig.taints || [],
          additionalLabels: state.controlPlaneConfig.additionalLabels || {},
          additionalAnnotations: state.controlPlaneConfig.additionalAnnotations || {},
          nodeRepaveInterval: 0,
          updateStrategy: {
            type: 'RollingUpdateScaleOut',
          },
          machinePoolProperties: {
            archType: 'amd64',
          },
          size: state.controlPlaneConfig.size || 1,
        },
      });
      
      // Worker pools with isControlPlane: false
      state.workerPools.forEach(pool => {
        const poolConfigBase: any = {
          name: pool.name,
          labels: pool.labels || ['worker'],
          isControlPlane: false,
          taints: pool.taints || [],
          additionalLabels: pool.additionalLabels || {},
          additionalAnnotations: pool.additionalAnnotations || {},
          nodeRepaveInterval: 0,
          updateStrategy: pool.updateStrategy || {
            type: 'RollingUpdateScaleOut',
          },
          machinePoolProperties: {
            archType: 'amd64',
          },
        };
        
        if (pool.useAutoscaler) {
          // When using autoscaler, size is the initial size (set to minSize)
          // and minSize/maxSize define the scaling bounds
          poolConfigBase.size = pool.minSize || 1;
          poolConfigBase.minSize = pool.minSize;
          poolConfigBase.maxSize = pool.maxSize;
        } else {
          poolConfigBase.size = pool.size;
        }
        
        machinePoolConfig.push({
          cloudConfig: {
            instanceType: pool.instanceType || {
              numCPUs: 4,
              memoryMiB: 8192,
              diskGiB: 60,
            },
            placements: pool.placements || [],
          },
          poolConfig: poolConfigBase,
        });
      });
      
      // Build labels from tags (all values are "spectro__tag")
      const labels: Record<string, string> = {};
      (state.clusterTags || []).forEach(tag => {
        if (tag.trim()) {
          labels[tag] = 'spectro__tag';
        }
      });
      
      // Build annotations (include description if provided)
      const annotations: Record<string, string> = {};
      if (state.clusterDescription && state.clusterDescription.trim()) {
        annotations.description = state.clusterDescription;
      }
      
      return {
        metadata: {
          name: state.clusterName,
          labels,
          annotations,
        },
        spec: {
          cloudType: state.cloudType,
          cloudAccountUid: state.cloudAccountUid!,
          cloudConfig: {
            network: {
              networkName: '',
              staticIp: state.cloudConfig.staticIp || false,
            },
            placement: state.cloudConfig.placement || {},
            staticIp: state.cloudConfig.staticIp || false,
            sshKeys: state.cloudConfig.sshKeys || [],
            ntpServers: state.cloudConfig.ntpServers || [],
          },
          machinePoolConfig,
          profiles: state.profiles.map(p => ({
            uid: p.versionUid,
            packValues: [],
          })),
          clusterConfig: state.clusterVariables || {},
          policies: state.policies || {},
        },
      };
    }
    
    // Other cloud types use the simpler structure
    // Build labels from tags (all values are "spectro__tag")
    const labels: Record<string, string> = {};
    (state.clusterTags || []).forEach(tag => {
      if (tag.trim()) {
        labels[tag] = 'spectro__tag';
      }
    });
    
    // Build annotations (include description if provided)
    const annotations: Record<string, string> = {};
    if (state.clusterDescription && state.clusterDescription.trim()) {
      annotations.description = state.clusterDescription;
    }
    
    return {
      metadata: {
        name: state.clusterName,
        labels,
        annotations,
      },
      spec: {
        cloudType: state.cloudType!,
        cloudAccountUid: state.cloudAccountUid!,
        cloudConfig: {
          ...state.cloudConfig,
          controlPlane: state.controlPlaneConfig,
          workerPools: state.workerPools,
        },
        profiles: state.profiles.map(p => ({
          uid: p.versionUid,
          packValues: [],
        })),
        clusterConfig: state.clusterVariables,
        policies: state.policies,
      },
    };
  };

  const handleDeploy = async () => {
    try {
      setDeploying(true);
      setError(undefined);
      const config = buildClusterConfig();
      const result = await spectroCloudApi.createCluster(config, state.projectUid);
      setDeployedClusterUid(result.uid);
      setDeploySuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cluster');
    } finally {
      setDeploying(false);
    }
  };

  if (deploySuccess) {
    return (
      <Box className={classes.root}>
        <Alert
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          className={classes.successMessage}
        >
          <Typography variant="h6" gutterBottom>
            Cluster Deployment Initiated!
          </Typography>
          <Typography variant="body2" paragraph>
            Your cluster <strong>{state.clusterName}</strong> has been successfully submitted
            for deployment.
          </Typography>
          {deployedClusterUid && (
            <Typography variant="body2">
              Cluster UID: <code>{deployedClusterUid}</code>
            </Typography>
          )}
          <Typography variant="body2" style={{ marginTop: 16 }}>
            The cluster is now being provisioned. You can monitor its progress in the Spectro
            Cloud console or in the Backstage catalog once it's discovered.
          </Typography>
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={onDeploy}
          style={{ marginTop: 16 }}
        >
          Deploy Another Cluster
        </Button>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Typography variant="h5" gutterBottom>
        Review & Deploy
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Review your cluster configuration before deployment
      </Typography>

      {error && (
        <Alert severity="error" style={{ marginBottom: 16 }}>
          {error}
        </Alert>
      )}

      {/* Cluster Overview */}
      <Paper className={classes.summaryPaper}>
        <Typography variant="h6" gutterBottom>
          Cluster Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography>
              <span className={classes.label}>Cluster Name:</span>
              {state.clusterName}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>
              <span className={classes.label}>Cloud Type:</span>
              {state.cloudType && CLOUD_TYPE_LABELS[state.cloudType]}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>
              <span className={classes.label}>Project:</span>
              {state.projectName}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>
              <span className={classes.label}>Cloud Account:</span>
              {state.cloudAccountName}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Profiles */}
      <Paper className={classes.summaryPaper}>
        <Typography variant="h6" gutterBottom>
          Cluster Profiles
        </Typography>
        <Box>
          {state.profiles.map((profile, idx) => (
            <Box key={idx} marginBottom={1}>
              <Typography>
                <span className={classes.label}>{profile.name}</span>
                <Chip label={`v${profile.version}`} size="small" />
                {' '}
                <Chip label={profile.type} size="small" color="primary" />
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Infrastructure */}
      <Paper className={classes.summaryPaper}>
        <Typography variant="h6" gutterBottom>
          Infrastructure
        </Typography>
        <Typography variant="subtitle2">Control Plane:</Typography>
        <Typography variant="body2" gutterBottom>
          {state.controlPlaneConfig.size || state.controlPlaneConfig.count || 1} node(s) -{' '}
          {typeof state.controlPlaneConfig.instanceType === 'object'
            ? `${state.controlPlaneConfig.instanceType.numCPUs || 4} CPUs, ${state.controlPlaneConfig.instanceType.memoryMiB || 8192} MiB RAM, ${state.controlPlaneConfig.instanceType.diskGiB || 60} GiB Disk`
            : state.controlPlaneConfig.instanceType || 'default instance type'}
        </Typography>
        <Typography variant="subtitle2" style={{ marginTop: 8 }}>
          Worker Pools:
        </Typography>
        {state.workerPools.map((pool, idx) => (
          <Typography key={idx} variant="body2">
            • {pool.name}:{' '}
            {pool.useAutoscaler
              ? `${pool.minSize}-${pool.maxSize} nodes (autoscaling)`
              : `${pool.size} node(s)`}{' '}
            -{' '}
            {typeof pool.instanceType === 'object'
              ? `${pool.instanceType.numCPUs || 4} CPUs, ${pool.instanceType.memoryMiB || 8192} MiB RAM, ${pool.instanceType.diskGiB || 60} GiB Disk`
              : pool.instanceType || 'default'}
          </Typography>
        ))}
      </Paper>

      {/* Terraform Preview */}
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Typography variant="h6">Terraform Configuration (Reference)</Typography>
            <Box display="flex">
              <Tooltip title={tfCopied ? "Copied!" : "Copy to clipboard"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyTerraform();
                  }}
                  color={tfCopied ? "primary" : "default"}
                >
                  <FileCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download as .tf file">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTerraform();
                  }}
                >
                  <GetAppIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box width="100%">
            <Typography variant="body2" color="textSecondary" paragraph>
              Below is a basic Terraform configuration template based on your selections.
              This is for reference only and may need adjustments for production use.
            </Typography>
            <Box className={classes.tfPreview}>
              <ReactSyntaxHighlighter 
                language="hcl" 
                style={theme.palette.type === 'dark' ? atomOneDark : docco}
              >
                {tfConfig}
              </ReactSyntaxHighlighter>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Deploy Button */}
      <Box display="flex" justifyContent="center" className={classes.deployButton}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleDeploy}
          disabled={deploying}
          startIcon={deploying ? <CircularProgress size={20} /> : undefined}
        >
          {deploying ? 'Deploying...' : 'Deploy Cluster'}
        </Button>
      </Box>
    </Box>
  );
};
