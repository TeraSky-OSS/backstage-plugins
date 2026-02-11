/**
 * Types for the cluster deployment wizard
 */

export type CloudType = 'eks' | 'aws' | 'aks' | 'azure' | 'vsphere';

export interface ProfileSelection {
  uid: string;
  name: string;
  version: string;
  versionUid: string;
  cloudType: string;
  type: string;
  packs?: any[];
}

export interface WorkerPoolConfig {
  name: string;
  size: number;
  useAutoscaler?: boolean;
  // AWS/EKS/AKS style
  instanceType?: string | {
    numCPUs?: number;
    memoryMiB?: number;
    diskGiB?: number;
  };
  minSize?: number;
  maxSize?: number;
  azs?: string[];
  labels?: string[]; // Pool labels like ["worker", "gpu"]
  additionalLabels?: Record<string, string>; // K8s node labels
  additionalAnnotations?: Record<string, string>; // K8s node annotations
  taints?: Array<{
    key: string;
    value: string;
    effect: 'NoSchedule' | 'NoExecute' | 'PreferNoSchedule';
  }>;
  updateStrategy?: {
    type: 'RollingUpdateScaleOut' | 'RollingUpdateScaleIn' | 'OverrideScaling';
    maxSurge?: string;
    maxUnavailable?: string;
  };
  // vSphere-specific placements (per pool)
  placements?: Array<{
    cluster: string;
    datastore: string;
    resourcePool?: string;
    network: {
      networkName: string;
      staticIp: boolean;
      parentPoolUid?: string; // IP Pool UID for static IP
    };
  }>;
  [key: string]: any;
}

export interface ClusterDeploymentState {
  // Step 1: Cloud Type Selection
  cloudType?: CloudType;
  
  // Step 2: Project Selection
  projectUid?: string;
  projectName?: string;
  
  // Step 3: Cloud Account Selection
  cloudAccountUid?: string;
  cloudAccountName?: string;
  
  // Step 4: Profile Selection
  profiles: ProfileSelection[];
  
  // Step 5: Profile Variables
  profileVariables: Record<string, any>;
  profileVariablesByProfile?: Record<string, string[]>; // Maps profile UID to variable names
  
  // Step 6: Cluster Configuration
  clusterName: string;
  clusterDescription?: string;
  clusterTags: string[]; // Array of tag keys (values will be "spectro__tag")
  clusterVariables: Record<string, any>;
  
  // Step 7: Infrastructure Configuration
  controlPlaneConfig: {
    // AWS/EKS/AKS style
    instanceType?: string | {
      numCPUs?: number;
      memoryMiB?: number;
      diskGiB?: number;
    };
    diskSize?: number;
    count?: number;
    size?: number;
    azs?: string[];
    useControlPlaneAsWorker?: boolean; // Allow workloads on control plane
    labels?: string[]; // Pool labels like ["control-plane"]
    additionalLabels?: Record<string, string>; // K8s node labels
    additionalAnnotations?: Record<string, string>; // K8s node annotations
    taints?: Array<{
      key: string;
      value: string;
      effect: 'NoSchedule' | 'NoExecute' | 'PreferNoSchedule';
    }>;
    // vSphere-specific placements
    placements?: Array<{
      cluster: string;
      datastore: string;
      resourcePool?: string;
      network: {
        networkName: string;
        staticIp: boolean;
        parentPoolUid?: string;
      };
    }>;
    [key: string]: any;
  };
  
  workerPools: WorkerPoolConfig[];
  
  // Step 7: Global Settings
  policies: {
    scanPolicy?: {
      configurationScanning?: {
        deployAfter?: string;
        interval?: number;
        schedule?: string;
      };
      penetrationScanning?: {
        deployAfter?: string;
        interval?: number;
        schedule?: string;
      };
      conformanceScanning?: {
        deployAfter?: string;
        interval?: number;
        schedule?: string;
      };
    };
    backupPolicy?: {
      backupConfig?: {
        backupLocationName?: string;
        backupLocationUid?: string;
        backupName?: string;
        backupPrefix?: string;
        durationInHours?: number;
        includeAllDisks?: boolean;
        includeClusterResources?: boolean;
        locationType?: string;
        namespaces?: string[];
        schedule?: {
          scheduledRunTime?: string;
        };
      };
    };
  };
  
  // Additional cloud-specific configuration
  cloudConfig: Record<string, any>;
  
  // Metadata for Terraform generation
  tfMetadata?: {
    sshKeyName?: string;
    sshKeyContext?: 'tenant' | 'project';
    pcgUid?: string; // Private Cloud Gateway UID (for vSphere IP pools)
    ipPools?: Record<string, string>; // Map of IP pool UID to name
  };
}

export const CLOUD_TYPE_LABELS: Record<CloudType, string> = {
  eks: 'Amazon EKS',
  aws: 'AWS (Palette eXtended Kubernetes)',
  aks: 'Azure AKS',
  azure: 'Azure (Palette eXtended Kubernetes)',
  vsphere: 'vSphere (Palette eXtended Kubernetes)',
};

export const CLOUD_TYPE_DESCRIPTIONS: Record<CloudType, string> = {
  eks: 'Deploy a managed Kubernetes cluster on Amazon EKS',
  aws: 'Deploy a Palette-managed Kubernetes cluster on AWS',
  aks: 'Deploy a managed Kubernetes cluster on Azure AKS',
  azure: 'Deploy a Palette-managed Kubernetes cluster on Azure',
  vsphere: 'Deploy a Palette-managed Kubernetes cluster on vSphere',
};

export const initialDeploymentState: ClusterDeploymentState = {
  cloudType: undefined,
  projectUid: undefined,
  projectName: undefined,
  cloudAccountUid: undefined,
  cloudAccountName: undefined,
  profiles: [],
  profileVariables: {},
  profileVariablesByProfile: {},
  clusterName: '',
  clusterDescription: '',
  clusterTags: [],
  clusterVariables: {},
  controlPlaneConfig: {},
  workerPools: [],
  policies: {},
  cloudConfig: {},
};
