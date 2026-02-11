import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type { SpectroCloudAuthApi } from '@terasky/backstage-plugin-spectrocloud-auth';

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
  spec?: {
    published?: {
      cloudType?: string;
      type?: string;
      version?: string;
      packs?: Array<{
        name?: string;
        tag?: string;
        uid?: string;
        layer?: string;
        type?: string;
        values?: string;
      }>;
    };
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

export interface SpectroCloudProject {
  metadata: {
    uid: string;
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    description?: string;
  };
}

export interface SpectroCloudAccount {
  metadata: {
    uid: string;
    name: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    cloudType?: string;
    [key: string]: any;
  };
}

export interface ClusterCreationRequest {
  metadata: {
    name: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    cloudType: string;
    cloudAccountUid: string;
    cloudConfig: any;
    machinePoolConfig?: any[]; // For vSphere
    profiles: Array<{
      uid: string;
      packValues?: Array<{
        name: string;
        values?: string;
      }>;
    }>;
    clusterConfig?: any;
    policies?: any;
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

  /**
   * Get all projects
   */
  getProjects(instanceName?: string): Promise<SpectroCloudProject[]>;

  /**
   * Get cloud accounts for a specific cloud type
   */
  getCloudAccounts(
    cloudType: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudAccount[]>;

  /**
   * Get a specific cloud account by UID
   */
  getCloudAccount(
    cloudType: string,
    accountUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudAccount | null>;

  /**
   * Get profiles for a project
   */
  getProjectProfiles(
    projectUid: string,
    cloudType?: string,
    profileType?: string,
    instanceName?: string,
  ): Promise<SpectroCloudProfile[]>;

  /**
   * Get profile with pack details
   */
  getProfileWithPacks(
    profileUid: string,
    versionUid?: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;

  /**
   * Create a new cluster
   */
  createCluster(
    clusterConfig: ClusterCreationRequest,
    projectUid?: string,
    instanceName?: string,
  ): Promise<{ uid: string }>;

  /**
   * Get profile variables
   */
  getProfileVariables(
    profileUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;

  /**
   * Get vSphere cloud account metadata
   */
  getVSphereCloudAccountMetadata(
    accountUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;

  /**
   * Get vSphere compute cluster resources (datastores, networks, resource pools)
   */
  getVSphereComputeClusterResources(
    accountUid: string,
    datacenter: string,
    computecluster: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;

  /**
   * Get user SSH keys
   */
  getUserSSHKeys(
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;

  /**
   * Get overlords (PCGs)
   */
  getOverlords(
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;

  /**
   * Get vSphere IP pools from overlord/PCG
   */
  getVSphereIPPools(
    overlordUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any>;
}

export const spectroCloudApiRef = createApiRef<SpectroCloudApi>({
  id: 'plugin.spectrocloud.api',
});

export class SpectroCloudApiClient implements SpectroCloudApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private readonly spectroCloudAuthApi?: SpectroCloudAuthApi;

  constructor(options: { 
    discoveryApi: DiscoveryApi; 
    fetchApi: FetchApi;
    spectroCloudAuthApi?: SpectroCloudAuthApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
    this.spectroCloudAuthApi = options.spectroCloudAuthApi;
  }

  /**
   * Get the user's Spectro Cloud API token (HS256 session token)
   */
  private async getUserToken(): Promise<string | undefined> {
    if (!this.spectroCloudAuthApi) {
      return undefined;
    }
    
    try {
      // For Spectro Cloud API calls, we need the HS256 session token
      // NOT the RS256 OIDC ID token (which is used for Kubernetes/Backstage auth)
      const apiToken = await (this.spectroCloudAuthApi as any).getSpectroCloudApiToken();
      
      if (!apiToken) {
        console.warn('[SpectroCloud] No API token available from auth provider');
        return undefined;
      }
      
      return apiToken;
    } catch (error) {
      console.error('[SpectroCloud] Failed to get Spectro Cloud API token:', error);
      return undefined;
    }
  }

  /**
   * Handle authentication errors by triggering re-authentication
   */
  private async handleAuthError(): Promise<void> {
    if (this.spectroCloudAuthApi) {
      console.warn('[SpectroCloud] Authentication failed - please sign in again');
      // Clear session and redirect to sign in
      await this.spectroCloudAuthApi.signOut();
    }
  }

  /**
   * Wrapper for fetch that handles authentication errors
   */
  private async fetchWithAuthCheck(url: string, options?: RequestInit): Promise<Response> {
    const response = await this.fetchApi.fetch(url, options);
    
    // Check for re-authentication header (set by backend when cache is empty)
    const reAuthHeader = response.headers.get('X-SpectroCloud-ReAuth-Required');
    if (reAuthHeader === 'true') {
      console.warn('[SpectroCloud] Token cache empty - triggering re-authentication');
      // Don't await - let the request complete first, then trigger re-auth
      setTimeout(() => this.handleAuthError(), 1000);
    }
    
    // Also check for authentication errors
    if (response.status === 401) {
      try {
        const errorData = await response.clone().json();
        if (errorData.requiresReAuth) {
          console.warn('[SpectroCloud] Session expired - triggering re-authentication');
          await this.handleAuthError();
        }
      } catch (e) {
        // Error response wasn't JSON, just handle as regular 401
      }
    }
    
    return response;
  }

  /**
   * Helper to add user token header to fetch options
   */
  private async addAuthHeaders(init?: RequestInit): Promise<RequestInit> {
    const userToken = await this.getUserToken();
    const headers = new Headers(init?.headers);
    
    if (userToken) {
      headers.set('X-SpectroCloud-Token', userToken);
      
      // Also send user email so backend can look up HS256 token from cache
      if (this.spectroCloudAuthApi) {
        try {
          const profile = await this.spectroCloudAuthApi.getProfile();
          if (profile?.email) {
            headers.set('X-SpectroCloud-User-Email', profile.email);
          }
        } catch (e) {
          // Silently fail - backend will use token directly
        }
      }
    }
    
    return {
      ...init,
      headers,
    };
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
      await this.addAuthHeaders(),
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
      await this.addAuthHeaders(),
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
      await this.addAuthHeaders({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ names }),
      }),
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
      await this.addAuthHeaders(),
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
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch manifest: ${error}`);
    }

    return response.json();
  }

  /**
   * Debug method to test authentication - can be called from browser console
   */
  async testAuth(): Promise<{ hasToken: boolean; tokenLength?: number; error?: string }> {
    try {
      if (!this.spectroCloudAuthApi) {
        return { hasToken: false, error: 'spectroCloudAuthApi not available' };
      }
      
      const token = await (this.spectroCloudAuthApi as any).getAccessToken(['openid', 'profile', 'email']);
      
      return {
        hasToken: !!token,
        tokenLength: token?.length,
      };
    } catch (error) {
      return { hasToken: false, error: String(error) };
    }
  }

  async getProjects(instanceName?: string): Promise<SpectroCloudProject[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchWithAuthCheck(
      `${baseUrl}/projects?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch projects: ${error}`);
    }

    const result = await response.json();
    return result.projects || [];
  }

  async getCloudAccounts(
    cloudType: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudAccount[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchWithAuthCheck(
      `${baseUrl}/cloudaccounts/${cloudType}?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch cloud accounts: ${error}`);
    }

    const result = await response.json();
    return result.accounts || [];
  }

  async getCloudAccount(
    cloudType: string,
    accountUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<SpectroCloudAccount | null> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/cloudaccounts/${cloudType}/${accountUid}?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async getProjectProfiles(
    projectUid: string,
    cloudType?: string,
    profileType?: string,
    instanceName?: string,
  ): Promise<SpectroCloudProfile[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (cloudType) params.append('cloudType', cloudType);
    if (profileType) params.append('profileType', profileType);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/projects/${projectUid}/profiles?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch project profiles: ${error}`);
    }

    const result = await response.json();
    return result.profiles || [];
  }

  async getProfileWithPacks(
    profileUid: string,
    versionUid?: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (versionUid) params.append('versionUid', versionUid);
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/profiles/${profileUid}/packs?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile with packs: ${error}`);
    }

    return response.json();
  }

  async createCluster(
    clusterConfig: ClusterCreationRequest,
    projectUid?: string,
    instanceName?: string,
  ): Promise<{ uid: string }> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/clusters?${params.toString()}`,
      await this.addAuthHeaders({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clusterConfig),
      }),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create cluster: ${error}`);
    }

    return response.json();
  }

  async getProfileVariables(
    profileUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/profiles/${profileUid}/variables?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile variables: ${error}`);
    }

    return response.json();
  }

  async getVSphereCloudAccountMetadata(
    accountUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/cloudaccounts/vsphere/${accountUid}/metadata?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch vSphere metadata: ${error}`);
    }

    return response.json();
  }

  async getVSphereComputeClusterResources(
    accountUid: string,
    datacenter: string,
    computecluster: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    params.append('datacenter', datacenter);
    params.append('computecluster', computecluster);
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/cloudaccounts/vsphere/${accountUid}/computecluster/resources?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch compute cluster resources: ${error}`);
    }

    return response.json();
  }

  async getUserSSHKeys(
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/users/sshkeys?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch SSH keys: ${error}`);
    }

    return response.json();
  }

  async getOverlords(
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/overlords?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch overlords: ${error}`);
    }

    return response.json();
  }

  async getVSphereIPPools(
    overlordUid: string,
    projectUid?: string,
    instanceName?: string,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('spectrocloud');
    
    const params = new URLSearchParams();
    if (projectUid) params.append('projectUid', projectUid);
    if (instanceName) params.append('instance', instanceName);

    const response = await this.fetchApi.fetch(
      `${baseUrl}/overlords/vsphere/${overlordUid}/pools?${params.toString()}`,
      await this.addAuthHeaders(),
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch IP pools: ${error}`);
    }

    return response.json();
  }
}
