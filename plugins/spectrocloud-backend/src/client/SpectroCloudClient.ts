import { LoggerService } from '@backstage/backend-plugin-api';
import fetch, { Response } from 'node-fetch';

export interface SpectroCloudClientOptions {
  url: string;
  tenant: string;
  apiToken: string;
  instanceName?: string;
}

export interface ClusterProfilePack {
  name?: string;
  layer?: string;
  tag?: string;
  version?: string;
  type?: string;
  packUid?: string;
}

export interface ClusterProfileTemplateRef {
  uid?: string;
  name?: string;
  /** The version iteration number */
  version?: number;
  /** The cloud type of the profile */
  cloudType?: string;
  /** The scope of the profile (tenant/project) */
  scope?: string;
  /** The type of profile (infra/add-on) */
  type?: string;
  /** The packs in this profile */
  packs?: ClusterProfilePack[];
}

export interface SpectroCloudCluster {
  metadata: {
    uid: string;
    name: string;
    annotations?: {
      scope?: string;
      projectUid?: string;
      overlordUid?: string;
      tenantUid?: string;
    };
  };
  spec?: {
    cloudType?: string;
    clusterProfileTemplates?: ClusterProfileTemplateRef[];
    clusterConfig?: {
      kubernetesVersion?: string;
    };
  };
  status?: {
    state?: string;
    kubeMeta?: {
      kubernetesVersion?: string;
    };
  };
}

export interface SpectroCloudProject {
  metadata: {
    uid: string;
    name: string;
    annotations?: {
      scope?: string;
      tenantUid?: string;
    };
  };
  spec?: {
    description?: string;
  };
}

export interface ClusterProfileVersion {
  uid: string;
  version: string;
}

export interface SpectroCloudClusterProfile {
  metadata: {
    uid: string;
    name: string;
    annotations?: {
      scope?: string;
      projectUid?: string;
      overlordUid?: string;
    };
  };
  specSummary?: {
    draft?: {
      cloudType?: string;
      type?: string;
      version?: string;
    };
    published?: {
      cloudType?: string;
      type?: string;
      version?: string;
    };
    /** The current/latest version of the profile */
    version?: string;
    /** All available versions of this profile with their UIDs */
    versions?: ClusterProfileVersion[];
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
        registryUid?: string;
        values?: string;
      }>;
    };
  };
}

export class SpectroCloudClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly logger: LoggerService;
  private readonly instanceName?: string;

  constructor(options: SpectroCloudClientOptions, logger: LoggerService) {
    this.baseUrl = options.url;
    this.apiToken = options.apiToken;
    this.logger = logger;
    this.instanceName = options.instanceName;
  }

  /**
   * Get all clusters from SpectroCloud (basic metadata)
   */
  async getAllClusters(): Promise<SpectroCloudCluster[]> {
    try {
      const response = await this.makeRequest('/v1/dashboard/spectroclusters/meta');
      const clusters = await response.json() as SpectroCloudCluster[];
      return clusters;
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud clusters: ${error}`);
      return [];
    }
  }

  /**
   * Get full cluster details including cluster profile templates
   */
  async getCluster(clusterUid: string, projectUid?: string): Promise<SpectroCloudCluster | undefined> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      // Use the dashboard endpoint which returns more complete cluster data
      const response = await this.makeRequest(`/v1/dashboard/spectroclusters/${clusterUid}`, 'GET', headers);
      const cluster = await response.json() as SpectroCloudCluster;
      return cluster;
    } catch (error) {
      this.logger.debug(`Failed to fetch cluster details for ${clusterUid}: ${error}`);
      return undefined;
    }
  }

  /**
   * Get all projects from SpectroCloud using the dashboard filter API
   */
  async getAllProjects(): Promise<SpectroCloudProject[]> {
    try {
      const allProjects: SpectroCloudProject[] = [];
      let continueToken: string | undefined;
      
      do {
        const body: any = {
          filter: {},
        };
        
        if (continueToken) {
          body.continue = continueToken;
        }

        const response = await this.makeRequest(
          '/v1/dashboard/projects',
          'POST',
          undefined,
          false,
          JSON.stringify(body)
        );
        
        const result = await response.json() as any;
        
        if (result.items && Array.isArray(result.items)) {
          allProjects.push(...result.items);
        }
        
        continueToken = result.listmeta?.continue;
      } while (continueToken);

      return allProjects;
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud projects: ${error}`);
      return [];
    }
  }

  /**
   * Get a specific project by UID
   */
  async getProject(projectUid: string): Promise<SpectroCloudProject | undefined> {
    try {
      const response = await this.makeRequest(`/v1/projects/${projectUid}`);
      const project = await response.json() as SpectroCloudProject;
      return project;
    } catch (error) {
      this.logger.debug(`Failed to fetch project ${projectUid}: ${error}`);
      return undefined;
    }
  }

  /**
   * Get all cluster profiles from SpectroCloud using the dashboard filter API (tenant-scoped)
   */
  async getAllClusterProfiles(): Promise<SpectroCloudClusterProfile[]> {
    try {
      const allProfiles: SpectroCloudClusterProfile[] = [];
      let continueToken: string | undefined;
      
      do {
        const body: any = {
          filter: {},
        };
        
        if (continueToken) {
          body.continue = continueToken;
        }

        const response = await this.makeRequest(
          '/v1/dashboard/clusterprofiles',
          'POST',
          undefined,
          false,
          JSON.stringify(body)
        );
        
        const result = await response.json() as any;
        
        if (result.items && Array.isArray(result.items)) {
          allProfiles.push(...result.items);
        }
        
        continueToken = result.listmeta?.continue;
      } while (continueToken);

      return allProfiles;
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud cluster profiles: ${error}`);
      return [];
    }
  }

  /**
   * Get cluster profiles for a specific project
   */
  async getProjectClusterProfiles(projectUid: string): Promise<SpectroCloudClusterProfile[]> {
    const MAX_PAGES = 100; // Safeguard against infinite loops
    try {
      const allProfiles: SpectroCloudClusterProfile[] = [];
      let continueToken: string | undefined;
      let pageCount = 0;
      const seenTokens = new Set<string>();
      
      do {
        pageCount++;
        
        // Safety check for infinite loops
        if (pageCount > MAX_PAGES) {
          this.logger.warn(`Hit max page limit (${MAX_PAGES}) for project ${projectUid}. Total profiles: ${allProfiles.length}`);
          break;
        }
        
        const body: any = {
          filter: {
            scope: 'project',
          },
        };
        
        if (continueToken) {
          // Check for infinite loop - same continue token
          if (seenTokens.has(continueToken)) {
            this.logger.error(`Infinite pagination loop detected for project ${projectUid}. Stopping at ${allProfiles.length} profiles.`);
            break;
          }
          seenTokens.add(continueToken);
          body.continue = continueToken;
        }

        const headers: Record<string, string> = {
          ProjectUid: projectUid,
        };
        
        const response = await this.makeRequest(
          '/v1/dashboard/clusterprofiles',
          'POST',
          headers,
          false,
          JSON.stringify(body)
        );
        
        const result = await response.json() as any;
        
        if (result.items && Array.isArray(result.items)) {
          allProfiles.push(...result.items);
        }
        
        continueToken = result.listmeta?.continue;
      } while (continueToken);

      return allProfiles;
    } catch (error) {
      this.logger.error(`Failed to fetch cluster profiles for project ${projectUid}: ${error}`);
      return [];
    }
  }

  /**
   * Get a specific cluster profile by UID
   */
  async getClusterProfile(profileUid: string, projectUid?: string): Promise<SpectroCloudClusterProfile | undefined> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(`/v1/clusterprofiles/${profileUid}`, 'GET', headers);
      const profile = await response.json() as SpectroCloudClusterProfile;
      return profile;
    } catch (error) {
      this.logger.debug(`Failed to fetch cluster profile ${profileUid}: ${error}`);
      return undefined;
    }
  }

  /**
   * Search for cluster profiles by name
   */
  async searchClusterProfilesByName(
    names: string[],
    projectUid?: string,
  ): Promise<SpectroCloudClusterProfile[]> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      // Search with name filter
      const body = {
        filter: {
          profileName: {
            contains: '', // We'll filter client-side for exact matches
          },
        },
      };

      const response = await this.makeRequest(
        '/v1/dashboard/clusterprofiles',
        'POST',
        headers,
        false,
        JSON.stringify(body),
      );

      const result = await response.json() as any;
      const profiles: SpectroCloudClusterProfile[] = result.items || [];

      // Filter to only include profiles with matching names
      const nameSet = new Set(names.map(n => n.toLowerCase()));
      return profiles.filter(p => 
        p.metadata?.name && nameSet.has(p.metadata.name.toLowerCase())
      );
    } catch (error) {
      this.logger.error(`Failed to search cluster profiles: ${error}`);
      return [];
    }
  }

  /**
   * Get client/OIDC kubeconfig for the cluster (non-admin access)
   */
  async getClientKubeConfig(
    clusterUid: string,
    projectUid?: string,
    frp: boolean = true,
  ): Promise<string | undefined> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const endpoint = `/v1/spectroclusters/${clusterUid}/assets/kubeconfig?frp=${frp}`;
      const response = await this.makeRequest(endpoint, 'GET', headers, true);
      return await response.text();
    } catch (error) {
      this.logger.debug(`Failed to fetch client kubeconfig for cluster ${clusterUid}: ${error}`);
      return undefined;
    }
  }

  /**
   * Get cluster profiles with pack metadata (values, schema, presets)
   */
  async getClusterProfiles(
    clusterUid: string,
    projectUid?: string,
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const endpoint = `/v1/spectroclusters/${clusterUid}/profiles?includePackMeta=schema,presets`;
      const response = await this.makeRequest(endpoint, 'GET', headers);
      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch cluster profiles for ${clusterUid}: ${error}`);
      return { profiles: [] };
    }
  }

  /**
   * Get manifest content for a pack
   */
  async getPackManifest(
    clusterUid: string,
    manifestUid: string,
    projectUid?: string,
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const endpoint = `/v1/spectroclusters/${clusterUid}/pack/manifests/${manifestUid}`;
      const response = await this.makeRequest(endpoint, 'GET', headers);
      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch manifest ${manifestUid} for cluster ${clusterUid}: ${error}`);
      return null;
    }
  }

  getInstanceName(): string | undefined {
    return this.instanceName;
  }

  private async makeRequest(
    path: string,
    method: string = 'GET',
    headers?: Record<string, string>,
    skipJsonHeaders: boolean = false,
    body?: string,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const defaultHeaders: Record<string, string> = {
      ApiKey: this.apiToken,
    };

    if (!skipJsonHeaders) {
      defaultHeaders.Accept = 'application/json';
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const allHeaders = { ...defaultHeaders, ...headers };

    const response = await fetch(url, {
      method,
      headers: allHeaders,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SpectroCloud API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
    return response;
  }
}

