import { LoggerService } from '@backstage/backend-plugin-api';
import fetch, { Response } from 'node-fetch';

export interface SpectroCloudClientOptions {
  url: string;
  tenant: string;
  apiToken?: string; // Optional - used as fallback if no user token provided
  instanceName?: string;
  userToken?: string; // User's OIDC/OAuth token
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
    cloudConfig?: {
      cloudType?: string;
    };
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
    metrics?: {
      cpu?: {
        limit?: number;
        request?: number;
        total?: number;
        usage?: number;
        unit?: string;
      };
      memory?: {
        limit?: number;
        request?: number;
        total?: number;
        usage?: number;
        unit?: string;
      };
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

export interface SpectroCloudAccount {
  metadata: {
    uid: string;
    name: string;
    annotations?: {
      scope?: string;
      projectUid?: string;
    };
  };
  spec?: {
    cloudType?: string;
    [key: string]: any;
  };
}

export interface ProfilePackMeta {
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
    schema?: any;
    presets?: any[];
  };
}

export interface CreateClusterRequest {
  metadata: {
    name: string;
    labels?: Record<string, string>;
  };
  spec: {
    cloudType: string;
    cloudAccountUid: string;
    cloudConfig: any;
    profiles: Array<{
      uid: string;
      packValues?: Array<{
        name: string;
        values?: string;
      }>;
    }>;
    clusterConfig?: {
      kubernetesVersion?: string;
      ntpServers?: string[];
      sshKeys?: string[];
      location?: {
        countryCode?: string;
        countryName?: string;
        geoLoc?: {
          lat?: number;
          long?: number;
        };
        latitude?: number;
        longitude?: number;
        regionCode?: string;
        regionName?: string;
      };
    };
    policies?: {
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
  };
}

export class SpectroCloudClient {
  private readonly baseUrl: string;
  private readonly apiToken?: string; // Static API token (fallback)
  private readonly userToken?: string; // User's OIDC/OAuth token (preferred)
  private readonly logger: LoggerService;
  private readonly instanceName?: string;

  constructor(options: SpectroCloudClientOptions, logger: LoggerService) {
    this.baseUrl = options.url;
    this.apiToken = options.apiToken;
    this.userToken = options.userToken;
    this.logger = logger;
    this.instanceName = options.instanceName;
  }

  /**
   * Get user info including project permissions
   */
  async getUserInfo(): Promise<any> {
    try {
      const response = await this.makeRequest('/v1/users/me');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch user info: ${error}`);
      throw error;
    }
  }

  /**
   * Get clusters for a specific project
   */
  async getClustersForProject(projectUid: string): Promise<SpectroCloudCluster[]> {
    try {
      const headers = {
        'ProjectUid': projectUid,
      };
      
      const response = await this.makeRequest('/v1/dashboard/spectroclusters/meta', 'GET', headers);
      
      if (!response.ok) {
        this.logger.warn(`Failed to fetch clusters for project ${projectUid}: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data as SpectroCloudCluster[];
      } else if (data.items && Array.isArray(data.items)) {
        return data.items as SpectroCloudCluster[];
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch clusters for project ${projectUid}: ${error}`);
      return [];
    }
  }

  /**
   * Get tenant-scoped clusters
   */
  async getTenantClusters(): Promise<SpectroCloudCluster[]> {
    try {
      // Don't pass ProjectUid header to get tenant-scoped clusters
      const response = await this.makeRequest('/v1/dashboard/spectroclusters/meta', 'GET');
      
      if (!response.ok) {
        this.logger.warn(`Failed to fetch tenant clusters: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      // Handle different response formats and filter to only tenant-scoped
      let clusters: SpectroCloudCluster[] = [];
      if (Array.isArray(data)) {
        clusters = data as SpectroCloudCluster[];
      } else if (data.items && Array.isArray(data.items)) {
        clusters = data.items as SpectroCloudCluster[];
      }
      
      // Filter to only tenant-scoped clusters
      return clusters.filter(c => c.metadata.annotations?.scope === 'tenant');
    } catch (error) {
      this.logger.error(`Failed to fetch tenant clusters: ${error}`);
      return [];
    }
  }

  /**
   * Get all clusters from SpectroCloud (basic metadata) that the user has access to
   */
  async getAllClusters(): Promise<SpectroCloudCluster[]> {
    try {
      // First get user info to find which projects they have access to
      const userInfo = await this.getUserInfo();
      const projectPermissions = userInfo.status?.projectPermissions || {};
      const tenantPermissions = userInfo.status?.tenantPermissions || {};
      const projectUids = Object.keys(projectPermissions);
      
      this.logger.info(`User has access to ${projectUids.length} projects`);
      
      // Fetch clusters for each project
      const clusterPromises = projectUids.map(projectUid => 
        this.getClustersForProject(projectUid)
      );
      
      const clusterArrays = await Promise.all(clusterPromises);
      
      // Flatten and deduplicate clusters by UID
      const clusterMap = new Map<string, SpectroCloudCluster>();
      for (const clusters of clusterArrays) {
        for (const cluster of clusters) {
          if (cluster.metadata?.uid) {
            clusterMap.set(cluster.metadata.uid, cluster);
          }
        }
      }
      
      // Check if user has tenant-level cluster permissions
      const hasTenantClusterPermissions = 
        tenantPermissions.tenant?.includes('cluster.list') || 
        tenantPermissions.tenant?.includes('cluster.get');
      
      if (hasTenantClusterPermissions) {
        this.logger.info('User has tenant-level cluster permissions, fetching tenant-scoped clusters');
        const tenantClusters = await this.getTenantClusters();
        for (const cluster of tenantClusters) {
          if (cluster.metadata?.uid && !clusterMap.has(cluster.metadata.uid)) {
            clusterMap.set(cluster.metadata.uid, cluster);
          }
        }
        this.logger.info(`Added ${tenantClusters.length} tenant-scoped clusters`);
      }
      
      const allClusters = Array.from(clusterMap.values());
      this.logger.info(`Found ${allClusters.length} unique clusters total (project + tenant scoped)`);
      
      return allClusters;
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud clusters: ${error}`);
      throw error;
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
   * Get virtual clusters for a specific project
   */
  async getVirtualClustersForProject(projectUid: string): Promise<SpectroCloudCluster[]> {
    try {
      this.logger.info(`[VIRTUAL CLUSTERS] Fetching virtual clusters for project ${projectUid}`);
      
      const allVirtualClusters: SpectroCloudCluster[] = [];
      let continueToken: string | undefined;
      const seenTokens = new Set<string>();
      const limit = 50; // API maximum
      
      do {
        const body = {
          filter: {
            conjunction: 'and',
            filterGroups: [
              {
                conjunction: 'and',
                filters: [
                  {
                    property: 'environment',
                    type: 'string',
                    condition: {
                      string: {
                        operator: 'eq',
                        negation: false,
                        match: {
                          conjunction: 'or',
                          values: ['nested'],
                        },
                        ignoreCase: false,
                      },
                    },
                  },
                  {
                    property: 'isDeleted',
                    type: 'bool',
                    condition: {
                      bool: {
                        value: false,
                      },
                    },
                  },
                ],
              },
            ],
          },
          sort: [
            {
              field: 'lastModifiedTimestamp',
              order: 'desc',
            },
          ],
        };

        let endpoint = `/v1/dashboard/spectroclusters/search?limit=${limit}`;
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.warn(`[VIRTUAL CLUSTERS] Duplicate continue token detected for project ${projectUid}, stopping pagination`);
            break;
          }
          seenTokens.add(continueToken);
          endpoint = `${endpoint}&continue=${encodeURIComponent(continueToken)}`;
        }

        const headers: Record<string, string> = { ProjectUid: projectUid };
        const response = await this.makeRequest(
          endpoint,
          'POST',
          headers,
          false,
          JSON.stringify(body),
        );

        const result = await response.json() as any;
        const items = result.items || [];
        
        if (items.length > 0) {
          allVirtualClusters.push(...items);
          this.logger.debug(`[VIRTUAL CLUSTERS] Page fetched ${items.length} virtual clusters`);
        }
        
        continueToken = result.listmeta?.continue;
        
        // Break if no more items
        if (items.length === 0) {
          break;
        }
      } while (continueToken);
      
      this.logger.info(`[VIRTUAL CLUSTERS] Project ${projectUid}: Found ${allVirtualClusters.length} virtual clusters`);
      if (allVirtualClusters.length > 0) {
        this.logger.debug(`[VIRTUAL CLUSTERS] First VC: ${allVirtualClusters[0]?.metadata?.name} (${allVirtualClusters[0]?.metadata?.uid})`);
      }
      return allVirtualClusters;
    } catch (error) {
      this.logger.error(`Failed to fetch virtual clusters for project ${projectUid}: ${error}`);
      return [];
    }
  }

  /**
   * Get tenant-scoped virtual clusters (no project filter)
   */
  async getTenantVirtualClusters(): Promise<SpectroCloudCluster[]> {
    try {
      const allVirtualClusters: SpectroCloudCluster[] = [];
      let continueToken: string | undefined;
      const seenTokens = new Set<string>();
      const limit = 50; // API maximum
      
      do {
        const body = {
          filter: {
            conjunction: 'and',
            filterGroups: [
              {
                conjunction: 'and',
                filters: [
                  {
                    property: 'environment',
                    type: 'string',
                    condition: {
                      string: {
                        operator: 'eq',
                        negation: false,
                        match: {
                          conjunction: 'or',
                          values: ['nested'],
                        },
                        ignoreCase: false,
                      },
                    },
                  },
                  {
                    property: 'isDeleted',
                    type: 'bool',
                    condition: {
                      bool: {
                        value: false,
                      },
                    },
                  },
                ],
              },
            ],
          },
          sort: [
            {
              field: 'lastModifiedTimestamp',
              order: 'desc',
            },
          ],
        };

        let endpoint = `/v1/dashboard/spectroclusters/search?limit=${limit}`;
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.warn(`[VIRTUAL CLUSTERS] Duplicate continue token detected for tenant, stopping pagination`);
            break;
          }
          seenTokens.add(continueToken);
          endpoint = `${endpoint}&continue=${encodeURIComponent(continueToken)}`;
        }

        const response = await this.makeRequest(
          endpoint,
          'POST',
          undefined,
          false,
          JSON.stringify(body),
        );

        const result = await response.json() as any;
        const items = result.items || [];
        
        if (items.length > 0) {
          allVirtualClusters.push(...items);
          this.logger.debug(`[VIRTUAL CLUSTERS] Tenant page fetched ${items.length} virtual clusters`);
        }
        
        continueToken = result.listmeta?.continue;
        
        // Break if no more items
        if (items.length === 0) {
          break;
        }
      } while (continueToken);
      
      return allVirtualClusters;
    } catch (error) {
      this.logger.error(`Failed to fetch tenant virtual clusters: ${error}`);
      return [];
    }
  }

  /**
   * Get all virtual clusters that the user has access to
   */
  async getAllVirtualClusters(): Promise<SpectroCloudCluster[]> {
    try {
      // First get user info to find which projects they have access to
      const userInfo = await this.getUserInfo();
      const projectPermissions = userInfo.status?.projectPermissions || {};
      const tenantPermissions = userInfo.status?.tenantPermissions || {};
      const projectUids = Object.keys(projectPermissions);
      
      this.logger.info(`[VIRTUAL CLUSTERS] User has access to ${projectUids.length} projects`);
      this.logger.info(`[VIRTUAL CLUSTERS] Project UIDs: ${projectUids.join(', ')}`);
      
      // Fetch virtual clusters for each project
      const virtualClusterPromises = projectUids.map(projectUid => 
        this.getVirtualClustersForProject(projectUid)
      );
      
      const virtualClusterArrays = await Promise.all(virtualClusterPromises);
      
      this.logger.info(`[VIRTUAL CLUSTERS] Fetched ${virtualClusterArrays.length} arrays from projects`);
      virtualClusterArrays.forEach((arr, idx) => {
        this.logger.info(`[VIRTUAL CLUSTERS] Project ${projectUids[idx]}: ${arr.length} virtual clusters`);
      });
      
      // Flatten and deduplicate virtual clusters by UID
      const virtualClusterMap = new Map<string, SpectroCloudCluster>();
      for (const virtualClusters of virtualClusterArrays) {
        for (const virtualCluster of virtualClusters) {
          if (virtualCluster.metadata?.uid) {
            virtualClusterMap.set(virtualCluster.metadata.uid, virtualCluster);
            this.logger.debug(`[VIRTUAL CLUSTERS] Added: ${virtualCluster.metadata.name} (${virtualCluster.metadata.uid})`);
          }
        }
      }
      
      // Check if user has tenant-level cluster permissions (includes virtual clusters)
      const hasTenantClusterPermissions = 
        tenantPermissions.tenant?.includes('cluster.list') || 
        tenantPermissions.tenant?.includes('cluster.get') ||
        tenantPermissions.tenant?.includes('virtualCluster.list') ||
        tenantPermissions.tenant?.includes('virtualCluster.get');
      
      this.logger.info(`[VIRTUAL CLUSTERS] Has tenant permissions: ${hasTenantClusterPermissions}`);
      
      if (hasTenantClusterPermissions) {
        this.logger.info('[VIRTUAL CLUSTERS] Fetching tenant-scoped virtual clusters');
        const tenantVirtualClusters = await this.getTenantVirtualClusters();
        this.logger.info(`[VIRTUAL CLUSTERS] Got ${tenantVirtualClusters.length} tenant-scoped virtual clusters`);
        for (const virtualCluster of tenantVirtualClusters) {
          if (virtualCluster.metadata?.uid && !virtualClusterMap.has(virtualCluster.metadata.uid)) {
            virtualClusterMap.set(virtualCluster.metadata.uid, virtualCluster);
            this.logger.debug(`[VIRTUAL CLUSTERS] Added tenant VC: ${virtualCluster.metadata.name} (${virtualCluster.metadata.uid})`);
          }
        }
      }
      
      const allVirtualClusters = Array.from(virtualClusterMap.values());
      this.logger.info(`[VIRTUAL CLUSTERS] Found ${allVirtualClusters.length} unique virtual clusters total (project + tenant scoped)`);
      
      return allVirtualClusters;
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud virtual clusters: ${error}`);
      throw error;
    }
  }

  /**
   * Get full virtual cluster details
   */
  async getVirtualCluster(clusterUid: string, projectUid?: string): Promise<SpectroCloudCluster | undefined> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      // Use the dashboard endpoint - virtual clusters are accessed the same way as regular clusters
      const response = await this.makeRequest(`/v1/dashboard/spectroclusters/${clusterUid}`, 'GET', headers);
      const virtualCluster = await response.json() as SpectroCloudCluster;
      
      // Verify it's actually a virtual cluster
      const cloudType = (virtualCluster.spec as any)?.cloudConfig?.cloudType || virtualCluster.spec?.cloudType;
      if (cloudType !== 'nested') {
        this.logger.warn(`Cluster ${clusterUid} is not a virtual cluster (cloudType: ${cloudType})`);
        return undefined;
      }
      
      return virtualCluster;
    } catch (error) {
      this.logger.debug(`Failed to fetch virtual cluster details for ${clusterUid}: ${error}`);
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
  async getProjectClusterProfiles(projectUid: string, cloudType?: string, profileType?: string): Promise<SpectroCloudClusterProfile[]> {
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
            profileType: profileType ? [profileType] : ['infra', 'cluster'],
            resourceType: 'spectrocluster',
          },
          sort: [
            {
              field: 'lastModifiedTimestamp',
              order: 'desc',
            },
          ],
        };

        // Add cloud type filter if provided (using 'environment' as per Palette UI)
        if (cloudType) {
          body.filter.environment = [cloudType];
        }
        
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

  /**
   * Get cloud accounts for a specific cloud type (aws, azure, vsphere, etc.)
   */
  async getCloudAccounts(
    cloudType: string,
    projectUid?: string,
  ): Promise<SpectroCloudAccount[]> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(`/v1/cloudaccounts/${cloudType}`, 'GET', headers);
      const result = await response.json() as any;
      
      // API returns either array directly or wrapped in items
      return Array.isArray(result) ? result : (result.items || []);
    } catch (error) {
      this.logger.error(`Failed to fetch ${cloudType} cloud accounts: ${error}`);
      return [];
    }
  }

  /**
   * Get a specific cloud account by UID
   */
  async getCloudAccount(
    cloudType: string,
    accountUid: string,
    projectUid?: string,
  ): Promise<SpectroCloudAccount | undefined> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/cloudaccounts/${cloudType}/${accountUid}`,
        'GET',
        headers
      );
      return await response.json() as SpectroCloudAccount;
    } catch (error) {
      this.logger.debug(`Failed to fetch ${cloudType} account ${accountUid}: ${error}`);
      return undefined;
    }
  }

  /**
   * Get profile with pack details including schemas and values
   */
  async getProfileWithPacks(
    profileUid: string,
    versionUid?: string,
    projectUid?: string,
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      // Only use versionUid if it's different from profileUid
      // Sometimes the version UID is the same as the profile UID, indicating the latest version
      let endpoint = `/v1/clusterprofiles/${profileUid}`;
      if (versionUid && versionUid !== profileUid) {
        endpoint = `/v1/clusterprofiles/${profileUid}/versions/${versionUid}`;
      }

      const response = await this.makeRequest(endpoint, 'GET', headers);
      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch profile ${profileUid} with packs: ${error}`);
      return null;
    }
  }

  /**
   * Get profile variables
   */
  async getProfileVariables(profileUid: string, projectUid?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/clusterprofiles/${profileUid}/variables`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch profile variables for ${profileUid}: ${error}`);
      return { variables: [] };
    }
  }

  /**
   * Get vSphere cloud account metadata (datacenters, folders, networks, etc.)
   */
  async getVSphereCloudAccountMetadata(accountUid: string, projectUid?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/cloudaccounts/vsphere/${accountUid}/properties/datacenters`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch vSphere cloud account metadata for ${accountUid}: ${error}`);
      return { items: [] };
    }
  }

  /**
   * Get vSphere compute cluster resources (datastores, networks, resource pools)
   */
  async getVSphereComputeClusterResources(
    accountUid: string,
    datacenter: string,
    computecluster: string,
    projectUid?: string
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const params = new URLSearchParams({
        datacenter,
        computecluster,
      });

      const response = await this.makeRequest(
        `/v1/cloudaccounts/vsphere/${accountUid}/properties/computecluster/resources?${params.toString()}`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch vSphere compute cluster resources: ${error}`);
      return { computecluster: { datastores: [], networks: [], resourcePools: [] } };
    }
  }

  /**
   * Get user SSH keys
   */
  async getUserSSHKeys(projectUid?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/users/assets/sshkeys`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch SSH keys: ${error}`);
      return { items: [] };
    }
  }

  /**
   * Get overlords (PCGs)
   */
  async getOverlords(projectUid?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/overlords`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch overlords: ${error}`);
      return { items: [] };
    }
  }

  /**
   * Get vSphere IP pools from overlord/PCG
   */
  async getVSphereIPPools(overlordUid: string, projectUid?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/overlords/vsphere/${overlordUid}/pools`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch vSphere IP pools: ${error}`);
      return { items: [] };
    }
  }

  /**
   * Create an EKS cluster
   */
  async createEKSCluster(
    clusterConfig: CreateClusterRequest,
    projectUid?: string,
  ): Promise<{ uid: string }> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        '/v1/spectroclusters/eks',
        'POST',
        headers,
        false,
        JSON.stringify(clusterConfig),
      );
      
      return await response.json() as { uid: string };
    } catch (error) {
      this.logger.error(`Failed to create EKS cluster: ${error}`);
      throw error;
    }
  }

  /**
   * Create an AWS PXK cluster
   */
  async createAWSCluster(
    clusterConfig: CreateClusterRequest,
    projectUid?: string,
  ): Promise<{ uid: string }> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        '/v1/spectroclusters/aws',
        'POST',
        headers,
        false,
        JSON.stringify(clusterConfig),
      );
      
      return await response.json() as { uid: string };
    } catch (error) {
      this.logger.error(`Failed to create AWS cluster: ${error}`);
      throw error;
    }
  }

  /**
   * Create an AKS cluster
   */
  async createAKSCluster(
    clusterConfig: CreateClusterRequest,
    projectUid?: string,
  ): Promise<{ uid: string }> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        '/v1/spectroclusters/aks',
        'POST',
        headers,
        false,
        JSON.stringify(clusterConfig),
      );
      
      return await response.json() as { uid: string };
    } catch (error) {
      this.logger.error(`Failed to create AKS cluster: ${error}`);
      throw error;
    }
  }

  /**
   * Create an Azure PXK cluster
   */
  async createAzureCluster(
    clusterConfig: CreateClusterRequest,
    projectUid?: string,
  ): Promise<{ uid: string }> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        '/v1/spectroclusters/azure',
        'POST',
        headers,
        false,
        JSON.stringify(clusterConfig),
      );
      
      return await response.json() as { uid: string };
    } catch (error) {
      this.logger.error(`Failed to create Azure cluster: ${error}`);
      throw error;
    }
  }

  /**
   * Create a vSphere PXK cluster
   */
  async createVSphereCluster(
    clusterConfig: CreateClusterRequest,
    projectUid?: string,
  ): Promise<{ uid: string }> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        '/v1/spectroclusters/vsphere',
        'POST',
        headers,
        false,
        JSON.stringify(clusterConfig),
      );
      
      return await response.json() as { uid: string };
    } catch (error) {
      this.logger.error(`Failed to create vSphere cluster: ${error}`);
      throw error;
    }
  }

  /**
   * Get cluster group details by UID
   */
  async getClusterGroup(clusterGroupUid: string, projectUid?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(
        `/v1/clustergroups/${clusterGroupUid}`,
        'GET',
        headers
      );

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch cluster group ${clusterGroupUid}: ${error}`);
      throw error;
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
    const defaultHeaders: Record<string, string> = {};

    // Prefer user token (OIDC/OAuth) over static API token
    // NOTE: Try both Authorization and ApiKey headers with user token
    if (this.userToken) {
      // Try Authorization header first (for OIDC tokens)
      defaultHeaders.Authorization = this.userToken;
    } else if (this.apiToken) {
      defaultHeaders.ApiKey = this.apiToken;
    } else {
      throw new Error('No authentication credentials provided (neither user token nor API token)');
    }

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

