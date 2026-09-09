import { useState, useMemo } from 'react';
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
  Flex,
  Grid,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { CopyTextButton } from '@backstage/core-components';
import { RiCheckboxCircleLine, RiDownloadLine } from '@remixicon/react';
// BUI-EXCEPTION: `react-syntax-highlighter`'s `style` prop needs a literal JS style object
// (light/dark theme constant), which cannot be derived from a CSS custom property. `useTheme`
// is kept narrowly for this one boolean.
import { useTheme } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { spectroCloudApiRef } from '../../../api';
import { ClusterDeploymentState, CLOUD_TYPE_LABELS, CloudType } from '../types';
import { ClusterCreationRequest } from '../../../api/SpectroCloudApi';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { docco, atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import styles from './Summary.module.css';

interface SummaryProps {
  state: ClusterDeploymentState;
  onDeploy: () => void;
}

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
    case 'virtual':
      return 'virtual_cluster';
    default:
      return cloudType;
  }
};

// Helper function to generate Terraform configuration
const generateTerraformConfig = (state: ClusterDeploymentState): string => {
  const resourceType = getResourceType(state.cloudType!);
  const lines: string[] = [];

  // Header
  lines.push(`# Spectro Cloud Cluster - ${state.clusterName}`);
  if (state.clusterDescription) {
    lines.push('# Description:');
    state.clusterDescription.split('\n').forEach(line => {
      lines.push(`#   ${line}`);
    });
  }
  lines.push('# Generated from Backstage Cluster Deployment Wizard');
  lines.push(`# Reference: https://registry.terraform.io/providers/spectrocloud/spectrocloud/latest/docs/resources/${resourceType}`);
  lines.push('');

  // Virtual cluster has a completely different structure
  if (state.cloudType === 'virtual') {
    // Data source for cluster group
    lines.push('data "spectrocloud_cluster_group" "cluster_group" {');
    lines.push(`  name    = "${state.cloudConfig.clusterGroupName || 'your-cluster-group'}"`);
    lines.push('  context = "project"');
    lines.push('}');
    lines.push('');

    // Virtual cluster resource
    lines.push('resource "spectrocloud_virtual_cluster" "cluster" {');
    lines.push(`  name              = "${state.clusterName}"`);
    lines.push('  cluster_group_uid = data.spectrocloud_cluster_group.cluster_group.id');
    lines.push('');
    lines.push('  resources {');
    lines.push(`    max_cpu            = ${state.cloudConfig.cpuCores || 4}`);
    lines.push(`    max_mem_in_mb      = ${(state.cloudConfig.memoryGiB || 8) * 1024}`);
    lines.push(`    max_storage_in_gb  = ${state.cloudConfig.storageGiB || 20}`);
    lines.push('    min_cpu            = 0');
    lines.push('    min_mem_in_mb      = 0');
    lines.push('    min_storage_in_gb  = 0');
    lines.push('  }');
    lines.push('}');
    
    return lines.join('\n');
  }

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

  // Data sources
  lines.push(`data "spectrocloud_cloudaccount_${state.cloudType}" "account" {`);
  lines.push(`  name = "${state.cloudAccountName || 'your-cloud-account'}"`);
  lines.push('}');
  lines.push('');

  // Private Cloud Gateway (PCG) data source (vSphere)
  if (state.cloudType === 'vsphere' && state.tfMetadata?.pcgUid) {
    const pcgName = state.tfMetadata?.pcgName || 'your-pcg-name';
    // eslint-disable-next-line no-console
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

export const Summary = ({ state, onDeploy }: SummaryProps) => {
  const theme = useTheme();
  const spectroCloudApi = useApi(spectroCloudApiRef);
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [deployedClusterUid, setDeployedClusterUid] = useState<string>();
  const [error, setError] = useState<string>();

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

  const buildClusterConfig = (): ClusterCreationRequest => {
    if (state.cloudType === 'virtual') {
      // Virtual cluster configuration (no tags or description support)
      const memoryMiB = state.cloudConfig.memoryGiB * 1024;
      
      return {
        metadata: {
          name: state.clusterName,
        },
        spec: {
          cloudType: 'nested', // Virtual clusters use 'nested' in the API
          cloudAccountUid: state.cloudAccountUid || '', // Virtual clusters may not require a cloud account
          cloudConfig: {
            kubernetesVersion: state.cloudConfig.kubernetesVersion,
          },
          clusterConfig: {
            hostClusterConfig: {
              clusterGroup: {
                kind: 'ClusterGroup',
                name: state.cloudConfig.clusterGroupName!,
                uid: state.cloudConfig.clusterGroupUid!,
              },
              clusterEndpoint: {
                type: state.cloudConfig.endpointType || 'LoadBalancer',
                config: {},
              },
            },
          },
          machinePoolConfig: [{
            cloudConfig: {
              instanceType: {
                minCPU: state.cloudConfig.cpuCores,
                maxCPU: state.cloudConfig.cpuCores,
                minMemInMiB: memoryMiB,
                maxMemInMiB: memoryMiB,
                minStorageGiB: state.cloudConfig.storageGiB,
                maxStorageGiB: state.cloudConfig.storageGiB,
              },
            },
          }],
          profiles: [], // Virtual clusters inherit profiles from cluster group
        },
      };
    }
    
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
      <Box p="4">
        <Alert
          status="success"
          icon={<RiCheckboxCircleLine />}
          style={{ marginTop: 'var(--bui-space-4)' }}
          title="Cluster Deployment Initiated!"
          description={
            <Flex direction="column" gap="2">
              <Text variant="body-small">
                Your cluster <strong>{state.clusterName}</strong> has been successfully submitted
                for deployment.
              </Text>
              {deployedClusterUid && (
                <Text variant="body-small">
                  Cluster UID: <code>{deployedClusterUid}</code>
                </Text>
              )}
              <Text variant="body-small">
                The cluster is now being provisioned. You can monitor its progress in the Spectro
                Cloud console or in the Backstage catalog once it's discovered.
              </Text>
            </Flex>
          }
        />
        <Box style={{ marginTop: 'var(--bui-space-4)' }}>
          <Button variant="primary" onPress={onDeploy}>
            Deploy Another Cluster
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p="4">
      <Text variant="title-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
        Review & Deploy
      </Text>
      <Text variant="body-medium" color="secondary" style={{ display: 'block', marginBottom: 'var(--bui-space-4)' }}>
        Review your cluster configuration before deployment
      </Text>

      {error && (
        <Box style={{ marginBottom: 'var(--bui-space-4)' }}>
          <Alert status="danger" description={error} />
        </Box>
      )}

      {/* Cluster Overview */}
      <Card style={{ marginBottom: 'var(--bui-space-4)' }}>
        <CardBody>
          <Text variant="title-x-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            Cluster Overview
          </Text>
          <Grid.Root columns="12" gap="4">
            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
              <Text>
                <strong>Cluster Name:</strong> {state.clusterName}
              </Text>
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
              <Text>
                <strong>Cloud Type:</strong> {state.cloudType && CLOUD_TYPE_LABELS[state.cloudType]}
              </Text>
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
              <Text>
                <strong>Project:</strong> {state.projectName}
              </Text>
            </Grid.Item>
            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
              <Text>
                <strong>Cloud Account:</strong> {state.cloudAccountName}
              </Text>
            </Grid.Item>
          </Grid.Root>
        </CardBody>
      </Card>

      {/* Profiles */}
      <Card style={{ marginBottom: 'var(--bui-space-4)' }}>
        <CardBody>
          <Text variant="title-x-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            Cluster Profiles
          </Text>
          <Flex direction="column" gap="2">
            {state.profiles.map((profile, idx) => (
              <Flex key={idx} align="center" gap="2">
                <Text weight="bold">{profile.name}</Text>
                <Badge>{`v${profile.version}`}</Badge>
                <Badge>{profile.type}</Badge>
              </Flex>
            ))}
          </Flex>
        </CardBody>
      </Card>

      {/* Infrastructure */}
      <Card style={{ marginBottom: 'var(--bui-space-4)' }}>
        <CardBody>
          <Text variant="title-x-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            Infrastructure
          </Text>
          <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Control Plane:</Text>
          <Text variant="body-small" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            {state.controlPlaneConfig.size || state.controlPlaneConfig.count || 1} node(s) -{' '}
            {typeof state.controlPlaneConfig.instanceType === 'object'
              ? `${state.controlPlaneConfig.instanceType.numCPUs || 4} CPUs, ${state.controlPlaneConfig.instanceType.memoryMiB || 8192} MiB RAM, ${state.controlPlaneConfig.instanceType.diskGiB || 60} GiB Disk`
              : state.controlPlaneConfig.instanceType || 'default instance type'}
          </Text>
          <Text variant="body-small" weight="bold" style={{ display: 'block', marginTop: 'var(--bui-space-2)' }}>
            Worker Pools:
          </Text>
          {state.workerPools.map((pool, idx) => (
            <Text key={idx} variant="body-small" style={{ display: 'block' }}>
              • {pool.name}:{' '}
              {pool.useAutoscaler
                ? `${pool.minSize}-${pool.maxSize} nodes (autoscaling)`
                : `${pool.size} node(s)`}{' '}
              -{' '}
              {typeof pool.instanceType === 'object'
                ? `${pool.instanceType.numCPUs || 4} CPUs, ${pool.instanceType.memoryMiB || 8192} MiB RAM, ${pool.instanceType.diskGiB || 60} GiB Disk`
                : pool.instanceType || 'default'}
            </Text>
          ))}
        </CardBody>
      </Card>

      {/* Terraform Preview */}
      <Accordion defaultExpanded={false}>
        <AccordionTrigger>
          <Flex align="center" justify="between" style={{ width: '100%', paddingRight: 'var(--bui-space-8)' }}>
            <Text variant="title-x-small">Terraform Configuration (Reference)</Text>
          </Flex>
        </AccordionTrigger>
        <AccordionPanel>
          <Box style={{ width: '100%' }}>
            <Flex align="center" justify="between" style={{ marginBottom: 'var(--bui-space-2)' }}>
              <Text variant="body-small" color="secondary">
                Below is a basic Terraform configuration template based on your selections.
                This is for reference only and may need adjustments for production use.
              </Text>
              <Flex gap="1">
                <CopyTextButton text={tfConfig} aria-label="Copy Terraform configuration" />
                <TooltipTrigger>
                  <ButtonIcon
                    aria-label="Download as .tf file"
                    icon={<RiDownloadLine />}
                    size="small"
                    variant="tertiary"
                    onPress={handleDownloadTerraform}
                  />
                  <Tooltip>Download as .tf file</Tooltip>
                </TooltipTrigger>
              </Flex>
            </Flex>
            <Box className={styles.tfPreview}>
              <ReactSyntaxHighlighter
                language="hcl"
                style={theme.palette.type === 'dark' ? atomOneDark : docco}
              >
                {tfConfig}
              </ReactSyntaxHighlighter>
            </Box>
          </Box>
        </AccordionPanel>
      </Accordion>

      {/* Deploy Button */}
      <Flex justify="center" style={{ marginTop: 'var(--bui-space-4)' }}>
        <Button
          variant="primary"
          size="medium"
          onPress={handleDeploy}
          isDisabled={deploying}
          isPending={deploying}
        >
          {deploying ? 'Deploying...' : 'Deploy Cluster'}
        </Button>
      </Flex>
    </Box>
  );
};
