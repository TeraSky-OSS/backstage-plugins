import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

export interface SpectroCloudPack {
  name?: string;
  layer?: string;
  tag?: string;
  version?: string;
  type?: string;
  packUid?: string;
}

export interface SpectroCloudProfileTemplate {
  uid?: string;
  name?: string;
  version?: number;
  cloudType?: string;
  scope?: string;
  type?: string;
  packs?: SpectroCloudPack[];
}

export interface SpectroCloudClusterDetails {
  metadata: {
    uid: string;
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    cloudConfig?: {
      cloudType?: string;
    };
    clusterProfileTemplates?: SpectroCloudProfileTemplate[];
  };
  status?: {
    state?: string;
    kubeMeta?: {
      kubernetesVersion?: string;
    };
  };
}

export interface SpectroCloudProfileVersion {
  uid: string;
  version: string;
}

export interface SpectroCloudProfile {
  metadata: {
    uid: string;
    name: string;
  };
  specSummary?: {
    version?: string;
    versions?: SpectroCloudProfileVersion[];
  };
}

export interface SpectroCloudManifest {
  kind: string;
  name: string;
  uid: string;
  resourceVersion?: string;
}

export interface SpectroCloudPackWithMeta {
  metadata: {
    name: string;
    uid: string;
  };
  spec: {
    name: string;
    layer: string;
    version: string;
    type: string;
    values?: string;
    manifests?: SpectroCloudManifest[];
    presets?: any[];
    schema?: any[];
  };
}

export interface SpectroCloudProfileWithPacks {
  metadata: {
    uid: string;
    name: string;
  };
  spec: {
    cloudType: string;
    type: string;
    packs: SpectroCloudPackWithMeta[];
  };
}

export interface SpectroCloudClusterProfilesResponse {
  profiles: SpectroCloudProfileWithPacks[];
}

export interface SpectroCloudManifestContent {
  metadata: {
    name: string;
    uid: string;
  };
  spec: {
    published: {
      content: string;
      digest?: string;
    };
  };
}

export interface SpectroCloudApi {
  /**
   * Download kubeconfig for a cluster
   */
  getKubeconfig(
    clusterUid: string,
    projectUid?: string,
    instanceName?: string,
    frp?: boolean,
  ): Promise<string>;

  /**
   * Get cluster details
   */
  getClusterDetails(
    clusterUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudClusterDetails>;

  /**
   * Search profiles by names to get version info
   */
  searchProfiles(
    names: string[],
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudProfile[]>;

  /**
   * Get cluster profiles with pack metadata (values, schema, presets)
   */
  getClusterProfiles(
    clusterUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudClusterProfilesResponse>;

  /**
   * Get manifest content for a pack
   */
  getPackManifest(
    clusterUid: string,
    manifestUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudManifestContent>;
}

export const spectroCloudApiRef = createApiRef<SpectroCloudApi>({
  id: 'plugin.spectrocloud.api',
});

export class SpectroCloudApiClient implements SpectroCloudApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async getKubeconfig(
    clusterUid: string,
    projectUid?: string,
    instanceName?: string,
    frp: boolean = true,
  ): Promise<string> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);
    params.append('frp', String(frp));

    const response = await this.fetchApi.fetch(
      `${baseUrl}/clusters/${clusterUid}/kubeconfig?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch kubeconfig: ${error}`);
    }

    return response.text();
  }

  async getClusterDetails(
    clusterUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudClusterDetails> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/clusters/${clusterUid}?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch cluster details: ${error}`);
    }

    return response.json();
  }

  async searchProfiles(
    names: string[],
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudProfile[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/profiles/search?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ names }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to search profiles: ${error}`);
    }

    const result = await response.json();
    return result.profiles || [];
  }

  async getClusterProfiles(
    clusterUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudClusterProfilesResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/clusters/${clusterUid}/profiles?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch cluster profiles: ${error}`);
    }

    return response.json();
  }

  async getPackManifest(
    clusterUid: string,
    manifestUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudManifestContent> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/clusters/${clusterUid}/pack/manifests/${manifestUid}?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch manifest: ${error}`);
    }

    return response.json();
  }
}
