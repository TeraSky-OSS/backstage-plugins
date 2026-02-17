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

export interface SpectroCloudClusterGroup {
  metadata: {
    uid: string;
    name: string;
    annotations?: {
      scope?: string;
      projectUid?: string;
      tenantUid?: string;
    };
  };
  spec?: {
    clusterRefs?: Array<{
      clusterName?: string;
      clusterUid?: string;
    }>;
    clustersConfig?: {
      endpointType?: string;
    };
    clusterProfileTemplates?: ClusterProfileTemplateRef[];
  };
  status?: {
    state?: string;
  };
}

export interface SpectroCloudVirtualCluster extends SpectroCloudCluster {
  status?: SpectroCloudCluster['status'] & {
    virtual?: {
      clusterGroup?: {
        uid: string;
        name: string;
        projectUid?: string;
        tenantUid?: string;
      };
      hostCluster?: {
        uid: string;
        name: string;
        projectUid?: string;
        tenantUid?: string;
      };
    };
  };
  specSummary?: {
    clusterProfileTemplates?: ClusterProfileTemplateRef[];
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

  async getAllProjects(): Promise<SpectroCloudProject[]> {
    try {
      const allProjects: SpectroCloudProject[] = [];
      let continueToken: string | undefined;
      const seenTokens = new Set<string>();

      do {
        const body: any = { filter: {} };
        let endpoint = '/v1/dashboard/projects';
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.warn(
              `getAllProjects: Duplicate continue token detected, stopping pagination`,
            );
            break;
          }
          seenTokens.add(continueToken);
          endpoint = `${endpoint}?continue=${encodeURIComponent(continueToken)}`;
        }

        const response = await this.makeRequest(
          endpoint,
          'POST',
          undefined,
          false,
          JSON.stringify(body),
        );

        const result = (await response.json()) as any;
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

  async getAllClusterProfiles(): Promise<SpectroCloudClusterProfile[]> {
    try {
      const allProfiles: SpectroCloudClusterProfile[] = [];
      let continueToken: string | undefined;
      const seenTokens = new Set<string>();

      do {
        const body: any = { filter: {} };
        let endpoint = '/v1/dashboard/clusterprofiles';
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.warn(
              `getAllClusterProfiles: Duplicate continue token detected, stopping pagination`,
            );
            break;
          }
          seenTokens.add(continueToken);
          endpoint = `${endpoint}?continue=${encodeURIComponent(continueToken)}`;
        }

        const response = await this.makeRequest(
          endpoint,
          'POST',
          undefined,
          false,
          JSON.stringify(body),
        );

        const result = (await response.json()) as any;
        if (result.items && Array.isArray(result.items)) {
          allProfiles.push(...result.items);
        }
        continueToken = result.listmeta?.continue;
      } while (continueToken);

      return allProfiles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch SpectroCloud cluster profiles: ${error}`,
      );
      return [];
    }
  }

  async getProjectClusterProfiles(projectUid: string): Promise<SpectroCloudClusterProfile[]> {
    const MAX_PAGES = 100;
    try {
      const allProfiles: SpectroCloudClusterProfile[] = [];
      let continueToken: string | undefined;
      let pageCount = 0;
      const seenTokens = new Set<string>();

      do {
        pageCount++;
        if (pageCount > MAX_PAGES) {
          this.logger.warn(
            `Hit max page limit (${MAX_PAGES}) for project ${projectUid}`,
          );
          break;
        }

        const body: any = { filter: { scope: 'project' } };
        let endpoint = '/v1/dashboard/clusterprofiles';
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.error(
              `Infinite pagination loop detected for project ${projectUid}`,
            );
            break;
          }
          seenTokens.add(continueToken);
          endpoint = `${endpoint}?continue=${encodeURIComponent(continueToken)}`;
        }

        const headers: Record<string, string> = { ProjectUid: projectUid };
        const response = await this.makeRequest(
          endpoint,
          'POST',
          headers,
          false,
          JSON.stringify(body),
        );

        const result = (await response.json()) as any;
        if (result.items && Array.isArray(result.items)) {
          allProfiles.push(...result.items);
        }
        continueToken = result.listmeta?.continue;
      } while (continueToken);

      return allProfiles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch cluster profiles for project ${projectUid}: ${error}`,
      );
      return [];
    }
  }

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

  async getAllClusterGroups(): Promise<SpectroCloudClusterGroup[]> {
    try {
      const response = await this.makeRequest('/v1/clustergroups/hostCluster');
      const result = await response.json() as any;
      
      // The API returns cluster groups in a 'summaries' property
      if (result.summaries && Array.isArray(result.summaries)) {
        this.logger.info(`Fetched ${result.summaries.length} tenant-scoped cluster groups`);
        return result.summaries;
      } else if (Array.isArray(result)) {
        this.logger.info(`Fetched ${result.length} tenant-scoped cluster groups`);
        return result;
      } else if (result.items && Array.isArray(result.items)) {
        this.logger.info(`Fetched ${result.items.length} tenant-scoped cluster groups`);
        return result.items;
      }
      
      this.logger.warn(`getAllClusterGroups: Unexpected response format`);
      this.logger.warn(`Response keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud cluster groups: ${error}`);
      return [];
    }
  }

  async getProjectClusterGroups(projectUid: string): Promise<SpectroCloudClusterGroup[]> {
    try {
      const headers: Record<string, string> = { ProjectUid: projectUid };
      const response = await this.makeRequest('/v1/clustergroups/hostCluster', 'GET', headers);
      const result = await response.json() as any;
      
      // The API returns cluster groups in a 'summaries' property
      if (result.summaries && Array.isArray(result.summaries)) {
        this.logger.info(`Fetched ${result.summaries.length} cluster groups for project ${projectUid}`);
        return result.summaries;
      } else if (Array.isArray(result)) {
        this.logger.info(`Fetched ${result.length} cluster groups for project ${projectUid}`);
        return result;
      } else if (result.items && Array.isArray(result.items)) {
        this.logger.info(`Fetched ${result.items.length} cluster groups for project ${projectUid}`);
        return result.items;
      }
      
      this.logger.warn(`getProjectClusterGroups: Unexpected response format for project ${projectUid}`);
      this.logger.warn(`Response keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch cluster groups for project ${projectUid}: ${error}`);
      return [];
    }
  }

  async getAllVirtualClusters(): Promise<SpectroCloudVirtualCluster[]> {
    try {
      const allVirtualClusters: SpectroCloudVirtualCluster[] = [];
      let offset = 0;
      const limit = 50;
      let continueToken: string | undefined;
      const seenTokens = new Set<string>();

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

        let endpoint = `/v1/dashboard/spectroclusters/search?limit=${limit}&offset=${offset}`;
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.warn('getAllVirtualClusters: Duplicate continue token detected, stopping pagination');
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

        const result = (await response.json()) as any;
        if (result.items && Array.isArray(result.items)) {
          allVirtualClusters.push(...result.items);
        }

        continueToken = result.listmeta?.continue;
        offset += limit;

        // Break if no more items
        if (!result.items || result.items.length === 0) {
          break;
        }
      } while (continueToken);

      return allVirtualClusters;
    } catch (error) {
      this.logger.error(`Failed to fetch SpectroCloud virtual clusters: ${error}`);
      return [];
    }
  }

  async getClusterGroup(clusterGroupUid: string, projectUid?: string): Promise<SpectroCloudClusterGroup | undefined> {
    try {
      const headers: Record<string, string> = {};
      if (projectUid) {
        headers.ProjectUid = projectUid;
      }

      const response = await this.makeRequest(`/v1/clustergroups/${clusterGroupUid}`, 'GET', headers);
      const clusterGroup = await response.json() as SpectroCloudClusterGroup;
      return clusterGroup;
    } catch (error) {
      this.logger.debug(`Failed to fetch cluster group details for ${clusterGroupUid}: ${error}`);
      return undefined;
    }
  }

  async getProjectVirtualClusters(projectUid: string): Promise<SpectroCloudVirtualCluster[]> {
    try {
      const allVirtualClusters: SpectroCloudVirtualCluster[] = [];
      let offset = 0;
      const limit = 50;
      let continueToken: string | undefined;
      const seenTokens = new Set<string>();

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

        let endpoint = `/v1/dashboard/spectroclusters/search?limit=${limit}&offset=${offset}`;
        if (continueToken) {
          if (seenTokens.has(continueToken)) {
            this.logger.warn(`getProjectVirtualClusters: Duplicate continue token detected for project ${projectUid}, stopping pagination`);
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

        const result = (await response.json()) as any;
        if (result.items && Array.isArray(result.items)) {
          allVirtualClusters.push(...result.items);
        }

        continueToken = result.listmeta?.continue;
        offset += limit;

        // Break if no more items
        if (!result.items || result.items.length === 0) {
          break;
        }
      } while (continueToken);

      return allVirtualClusters;
    } catch (error) {
      this.logger.error(`Failed to fetch virtual clusters for project ${projectUid}: ${error}`);
      return [];
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
