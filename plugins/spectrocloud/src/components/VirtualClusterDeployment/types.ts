export interface VirtualClusterDeploymentState {
  // Cluster Group Selection
  clusterGroupUid?: string;
  clusterGroupName?: string;
  projectUid?: string;
  
  // Basic Configuration
  clusterName: string;
  clusterDescription?: string;
  clusterTags?: string[];
  
  // Resource Quotas
  cpuCores: number;
  memoryGiB: number;
  storageGiB: number;
  
  // Optional: Advanced Configuration
  kubernetesVersion?: string;
  endpointType: 'Ingress' | 'LoadBalancer';
  hostClusterUid?: string;  // Optional - if not set, cluster group will auto-select
}

export interface VirtualClusterCreationRequest {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    cloudType: 'nested';
    cloudConfig?: {
      kubernetesVersion?: string;
    };
    clusterConfig: {
      hostClusterConfig: {
        clusterGroup: {
          kind: 'ClusterGroup';
          name: string;
          uid: string;
        };
        hostCluster?: {
          kind: 'Cluster';
          name: string;
          uid: string;
        };
        clusterEndpoint: {
          type: 'Ingress' | 'LoadBalancer';
          config?: any;
        };
      };
    };
    machinepoolconfig: Array<{
      cloudConfig: {
        instanceType: {
          minCPU: number;
          maxCPU: number;
          minMemInMiB: number;
          maxMemInMiB: number;
          minStorageGiB: number;
          maxStorageGiB: number;
        };
      };
    }>;
  };
}

export interface ClusterGroup {
  metadata: {
    uid: string;
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    clustersConfig?: {
      endpointType?: 'Ingress' | 'LoadBalancer';
    };
  };
  status?: {
    limitConfig?: {
      cpuMilliCore?: number;
      memoryMiB?: number;
      storageGiB?: number;
    };
  };
}
