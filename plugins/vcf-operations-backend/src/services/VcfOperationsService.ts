import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import fetch, { RequestInit } from 'node-fetch';

interface VcfOperationsAuthResponse {
  token: string;
}



interface VcfOperationsInstance {
  baseUrl: string;
  name: string;
  majorVersion: number;
  authentication: {
    username: string;
    password: string;
  };
  relatedVCFAInstances?: string[];
  token?: string;
  tokenExpiry?: Date;
}

interface MetricQueryRequest {
  resourceIds: string[];
  statKeys: string[];
  begin?: number;
  end?: number;
  rollUpType?: string;
  intervalType?: string;
  intervalQuantifier?: number;
}

interface MetricData {
  resourceId: string;
  stat: {
    statKey: {
      key: string;
    };
    timestamps: number[];
    data: number[];
  };
}

interface StatsResponse {
  values: MetricData[];
}

interface ResourceQueryRequest {
  propertyConditions?: {
    conjunctionOperator: 'AND' | 'OR';
    conditions: Array<{
      key: string;
      operator: 'EQ' | 'NE' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH';
      stringValue?: string;
      numericValue?: number;
    }>;
  };
  nameConditions?: {
    conjunctionOperator: 'AND' | 'OR';
    conditions: Array<{
      key: 'resourceName';
      operator: 'EQ' | 'NE' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH';
      stringValue: string;
    }>;
  };
}

interface ProjectQueryRequest {
  name: string[];
  adapterKind: string[];
  resourceKind: string[];
}

interface Resource {
  identifier: string;
  resourceKey: {
    name: string;
    adapterKindKey: string;
    resourceKindKey: string;
    resourceIdentifiers: Array<{
      identifierType: {
        name: string;
      };
      value: string;
    }>;
  };
}

export class VcfOperationsService {
  private readonly instances: VcfOperationsInstance[];
  private readonly defaultInstance: VcfOperationsInstance;

  constructor(config: Config, private readonly logger: LoggerService) {
    // Get instances configuration
    let instances: VcfOperationsInstance[] = [];
    
    try {
      const instancesConfig = config.getOptionalConfigArray('vcfOperations.instances');
      
      if (instancesConfig && instancesConfig.length > 0) {
        // Multi-instance configuration
        instances = instancesConfig.map(instanceConfig => {
          const baseUrl = instanceConfig.getString('baseUrl');
          return {
            baseUrl,
            name: instanceConfig.getOptionalString('name') ?? new URL(baseUrl).hostname,
            majorVersion: instanceConfig.getOptionalNumber('majorVersion') ?? 9,
            authentication: {
              username: instanceConfig.getString('authentication.username'),
              password: instanceConfig.getString('authentication.password'),
            },
            relatedVCFAInstances: instanceConfig.getOptionalStringArray('relatedVCFAInstances'),
          };
        });
      }
    } catch (error) {
      this.logger.error('Failed to read VCF Operations configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to initialize VCF Operations service: Invalid configuration');
    }

    if (instances.length === 0) {
      throw new Error('No VCF Operations instances configured');
    }

    this.instances = instances;
    this.defaultInstance = instances[0];
    this.logger.info(`VcfOperationsService initialized with ${instances.length} instance(s)`);
  }

  private async authenticate(instance: VcfOperationsInstance, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (instance.token && instance.tokenExpiry && instance.tokenExpiry > new Date()) {
          this.logger.debug(`Using existing valid token for instance ${instance.name}`);
          return;
        }

        this.logger.debug(`Authentication attempt ${attempt} of ${retries} for instance ${instance.name} (version ${instance.majorVersion})`);
        
        const authUrl = `${instance.baseUrl}/suite-api/api/auth/token/acquire`;
        const authBody = {
          username: instance.authentication.username,
          password: instance.authentication.password,
        };

        const response = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(authBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
        }

        const authResponse: VcfOperationsAuthResponse = await response.json() as VcfOperationsAuthResponse;
        
        instance.token = authResponse.token;
        instance.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes from now
        
        this.logger.debug(`Successfully authenticated with instance ${instance.name}`);
        return;
      } catch (error) {
        this.logger.warn(`Authentication attempt ${attempt} failed for instance ${instance.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        
        if (attempt === retries) {
          throw new Error(`Failed to authenticate with VCF Operations instance ${instance.name} after ${retries} attempts`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private   async makeRequest<T>(
    instance: VcfOperationsInstance,
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    await this.authenticate(instance);

    const url = `${instance.baseUrl}/suite-api${endpoint}`;
    const headers = {
      Authorization: `vRealizeOpsToken ${instance.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    let debugBody: any;
    if (options.body) {
      debugBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }
    this.logger.debug(`Making request to ${url}`, {
      method: options.method || 'GET',
      body: debugBody,
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorBodyParsed = typeof options.body === 'string' ? JSON.parse(options.body) : 'Binary data';
      const errorBody = options.body ? errorBodyParsed : undefined;
      this.logger.error(`Request failed: ${response.status} - ${errorText}`, {
        url,
        method: options.method || 'GET',
        headers: { ...headers, Authorization: '[REDACTED]' },
        body: errorBody,
      });
      throw new Error(`Request failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    // Log detailed response for debugging metrics issues
    if (endpoint.includes('/stats')) {
      this.logger.debug(`Metrics response received`, {
        url,
        responseKeys: Object.keys(responseData),
        valuesCount: responseData.values?.length || 0,
        sampleResponse: responseData.values?.slice(0, 2), // Show first 2 items for debugging
      });
    } else {
      this.logger.debug(`Request successful`, {
        url,
        responseKeys: Object.keys(responseData),
      });
    }

    return responseData as T;
  }

  private getInstance(instanceName?: string): VcfOperationsInstance {
    if (!instanceName) {
      return this.defaultInstance;
    }

    const instance = this.instances.find(inst => inst.name === instanceName);
    if (!instance) {
      throw new Error(`VCF Operations instance '${instanceName}' not found`);
    }

    return instance;
  }

  async getResourceMetrics(
    resourceId: string,
    statKeys: string[],
    begin?: number,
    end?: number,
    rollUpType?: string,
    instanceName?: string,
  ): Promise<StatsResponse> {
    const instance = this.getInstance(instanceName);
    
    this.logger.debug(`Getting metrics for resource: ${resourceId}`, {
      statKeys,
      begin,
      end,
      rollUpType,
      instanceName,
      beginDate: begin ? new Date(begin).toISOString() : 'undefined',
      endDate: end ? new Date(end).toISOString() : 'undefined',
      currentTime: new Date().toISOString(),
    });
    
    // Use the correct endpoint pattern from Python code: /api/resources/stats
    const endpoint = '/api/resources/stats';
    const params = new URLSearchParams();
    
    // resourceId as array parameter (not in URL path)
    params.append('resourceId', resourceId);
    
    // Add stat keys
    statKeys.forEach(statKey => params.append('statKey', statKey));
    
    // Always add rollUpType and interval parameters (required for VCF Operations)
    const mappedRollUp = rollUpType === 'AVERAGE' ? 'AVG' : (rollUpType || 'AVG');
    params.append('rollUpType', mappedRollUp);
    params.append('intervalType', 'MINUTES');
    
    // Calculate interval quantifier based on time range
    let intervalQuantifier = 5; // Default 5 minutes
    if (begin && end) {
      const timeRangeMs = end - begin;
      const timeRangeHours = timeRangeMs / (1000 * 60 * 60);
      
      if (timeRangeHours <= 6) {
        intervalQuantifier = 5;   // 5-minute intervals for short ranges
      } else if (timeRangeHours <= 24) {
        intervalQuantifier = 15;  // 15-minute intervals for day ranges
      } else if (timeRangeHours <= 168) {
        intervalQuantifier = 60;  // 1-hour intervals for week ranges
        params.set('intervalType', 'HOURS');
        intervalQuantifier = 1;
      } else {
        intervalQuantifier = 1;   // 1-day intervals for long ranges
        params.set('intervalType', 'DAYS');
      }
    }
    params.append('intervalQuantifier', intervalQuantifier.toString());
    
    // Handle timestamp parameters  
    if (begin && end) {
      params.append('begin', begin.toString());
      params.append('end', end.toString());
      this.logger.debug(`Using timestamps: begin=${new Date(begin).toISOString()}, end=${new Date(end).toISOString()}`);
    } else {
      // Use default time range like Python code
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      params.append('begin', oneDayAgo.toString());
      params.append('end', now.toString());
      this.logger.debug(`Using default 24h range: begin=${new Date(oneDayAgo).toISOString()}, end=${new Date(now).toISOString()}`);
    }
    
    const finalEndpoint = `${endpoint}?${params.toString()}`;
    this.logger.debug(`Final metrics endpoint: ${finalEndpoint}`);
    this.logger.debug(`API Parameters:`, Object.fromEntries(params.entries()));

    try {
      const response = await this.makeRequest<any>(instance, finalEndpoint);
      
      this.logger.debug(`Raw API Response:`, {
        keys: Object.keys(response),
        valuesLength: response.values?.length || 0,
        firstValue: response.values?.[0] || null,
      });
      
      // Transform the response to match our expected format
      const transformedResponse: StatsResponse = {
        values: this.transformMetricsResponse(response, resourceId),
      };
      
      this.logger.debug(`Transformed response:`, {
        valuesLength: transformedResponse.values.length,
      });
      
      return transformedResponse;
    } catch (error) {
      this.logger.error(`Error getting metrics for resource ${resourceId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private transformMetricsResponse(response: any, resourceId: string): MetricData[] {
    const values = response.values || [];
    const metricData: MetricData[] = [];
    
    this.logger.debug(`Transforming response with ${values.length} value items`);
    
    for (let i = 0; i < values.length; i++) {
      const valueItem = values[i];
      this.logger.debug(`Processing value item ${i} for resourceId: ${valueItem.resourceId}`);
      
      const statList = valueItem['stat-list'] || {};
      const stats = statList.stat || [];
      this.logger.debug(`Found ${stats.length} stats in stat-list`);
      
      for (let j = 0; j < stats.length; j++) {
        const stat = stats[j];
        const statKey = stat.statKey || {};
        const metricKey = statKey.key;
        
        if (metricKey) {
          const timestamps = stat.timestamps || [];
          const data = stat.data || [];
          
          this.logger.debug(`Metric ${metricKey}: ${timestamps.length} timestamps, ${data.length} data points`);
          
          metricData.push({
            resourceId: valueItem.resourceId || resourceId,
            stat: {
              statKey: {
                key: metricKey,
              },
              timestamps,
              data,
            },
          });
        }
      }
    }
    
    this.logger.debug(`Final transformed metrics: ${metricData.length} metrics`);
    return metricData;
  }

  async queryResourceMetrics(
    queryRequest: MetricQueryRequest,
    instanceName?: string,
  ): Promise<StatsResponse> {
    const instance = this.getInstance(instanceName);
    
    // Use the stats query endpoint for complex queries
    const endpoint = '/api/resources/stats/query';
    
    return this.makeRequest<StatsResponse>(instance, endpoint, {
      method: 'POST',
      body: JSON.stringify(queryRequest),
    });
  }

  async getLatestResourceMetrics(
    resourceIds: string[],
    statKeys: string[],
    instanceName?: string,
  ): Promise<StatsResponse> {
    const instance = this.getInstance(instanceName);
    
    let endpoint = '/api/resources/stats/latest';
    const params = new URLSearchParams();
    
    resourceIds.forEach(resourceId => params.append('resourceId', resourceId));
    statKeys.forEach(statKey => params.append('statKey', statKey));
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeRequest<StatsResponse>(instance, endpoint);
  }

  async getResourceDetails(resourceId: string, instanceName?: string): Promise<any> {
    const instance = this.getInstance(instanceName);
    const endpoint = `/api/resources/${resourceId}`;
    
    return this.makeRequest(instance, endpoint);
  }

  async getAvailableMetrics(resourceId: string, instanceName?: string): Promise<any> {
    const instance = this.getInstance(instanceName);
    const endpoint = `/api/resources/${resourceId}/statkeys`;
    
    try {
      const result = await this.makeRequest<any>(instance, endpoint);
      this.logger.debug(`Available metrics for resource ${resourceId}:`, {
        count: result['stat-key']?.length || 0,
        sampleKeys: result['stat-key']?.slice(0, 10) || [],
      });
      return result;
    } catch (error) {
      this.logger.warn(`Could not get available metrics for resource ${resourceId}`, error instanceof Error ? error : new Error(String(error)));
      return { 'stat-key': [] };
    }
  }

  async searchResources(
    name?: string,
    adapterKind?: string,
    resourceKind?: string,
    instanceName?: string,
  ): Promise<any> {
    const instance = this.getInstance(instanceName);
    
    let endpoint = '/api/resources';
    const params = new URLSearchParams();
    
    if (name) params.append('name', name);
    if (adapterKind) params.append('adapterKind', adapterKind);
    if (resourceKind) params.append('resourceKind', resourceKind);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeRequest(instance, endpoint);
  }

  async queryResources(
    queryRequest: ResourceQueryRequest,
    instanceName?: string,
  ): Promise<{ resourceList: Resource[] }> {
    const instance = this.getInstance(instanceName);
    
    const endpoint = '/api/resources/query?page=0&pageSize=1000&_no_links=true';
    
    return this.makeRequest<{ resourceList: Resource[] }>(instance, endpoint, {
      method: 'POST',
      body: JSON.stringify(queryRequest),
    });
  }

  async queryProjectResources(
    queryRequest: ProjectQueryRequest,
    instanceName?: string,
  ): Promise<{ resourceList: Resource[] }> {
    const instance = this.getInstance(instanceName);
    
    this.logger.debug(`Querying project resources with request: ${JSON.stringify(queryRequest)}`);
    
    const endpoint = '/api/resources/query?page=0&pageSize=1000&_no_links=true';
    
    return this.makeRequest<{ resourceList: Resource[] }>(instance, endpoint, {
      method: 'POST',
      body: JSON.stringify(queryRequest),
    });
  }

  async queryClusterResources(
    queryRequest: ProjectQueryRequest,
    instanceName?: string,
  ): Promise<{ resourceList: Resource[] }> {
    const instance = this.getInstance(instanceName);
    
    this.logger.debug(`Querying cluster resources with request: ${JSON.stringify(queryRequest)}`);
    
    const endpoint = '/api/resources/query?page=0&pageSize=1000&_no_links=true';
    
    return this.makeRequest<{ resourceList: Resource[] }>(instance, endpoint, {
      method: 'POST',
      body: JSON.stringify(queryRequest),
    });
  }

  async findResourceByProperty(
    propertyKey: string,
    propertyValue: string,
    instanceName?: string,
  ): Promise<Resource | null> {
    const queryRequest: ResourceQueryRequest = {
      propertyConditions: {
        conjunctionOperator: 'OR',
        conditions: [
          {
            key: propertyKey,
            operator: 'EQ',
            stringValue: propertyValue,
          },
        ],
      },
    };

    const result = await this.queryResources(queryRequest, instanceName);
    return result.resourceList.length > 0 ? result.resourceList[0] : null;
  }

  async findResourceByName(
    resourceName: string,
    instanceName?: string,
    resourceType?: string,
  ): Promise<Resource | null> {
    this.logger.debug(`Searching for resource by name: ${resourceName}, type: ${resourceType}`);
    
    // Route to specific query method based on resource type
    if (resourceType === 'project') {
      return this.findProjectResource(resourceName, instanceName);
    } else if (resourceType === 'vm') {
      return this.findVMResource(resourceName, instanceName);
    } else if (resourceType === 'supervisor-namespace') {
      return this.findSupervisorNamespaceResource(resourceName, instanceName);
    } else if (resourceType === 'cluster') {
      return this.findClusterResource(resourceName, instanceName);
    }
    
    // Fallback to general search if no specific type provided
    return this.findGeneralResource(resourceName, instanceName);
  }

  private async findProjectResource(
    resourceName: string,
    instanceName?: string,
  ): Promise<Resource | null> {
    try {
      const projectQueryRequest: ProjectQueryRequest = {
        name: [resourceName],
        adapterKind: ['VCFAutomation'],
        resourceKind: ['ProjectAssignment'],
      };

      this.logger.debug(`Searching for ProjectAssignment with name: ${resourceName}`);
      const projectResult = await this.queryProjectResources(projectQueryRequest, instanceName);
      if (projectResult.resourceList && projectResult.resourceList.length > 0) {
        this.logger.debug(`Found ProjectAssignment: ${projectResult.resourceList[0].identifier}`);
        return projectResult.resourceList[0];
      }
    } catch (error) {
      this.logger.error(`ProjectAssignment search failed for ${resourceName}`, error instanceof Error ? error : new Error(String(error)));
    }
    
    return null;
  }

  private async findVMResource(
    resourceName: string,
    instanceName?: string,
  ): Promise<Resource | null> {
    const instance = this.getInstance(instanceName);
    
    try {
      let endpoint = '/api/resources';
      const params = new URLSearchParams();
      params.append('name', resourceName);
      params.append('adapterKind', 'VMWARE');
      params.append('resourceKind', 'VirtualMachine');
      endpoint += `?${params.toString()}`;

      this.logger.debug(`Searching for VirtualMachine with name: ${resourceName}`);
      const vmResult = await this.makeRequest<{ resourceList: Resource[] }>(instance, endpoint);
      if (vmResult.resourceList && vmResult.resourceList.length > 0) {
        this.logger.debug(`Found VirtualMachine: ${vmResult.resourceList[0].identifier}`);
        return vmResult.resourceList[0];
      }
    } catch (error) {
      this.logger.error(`VirtualMachine search failed for ${resourceName}`, error instanceof Error ? error : new Error(String(error)));
    }
    
    return null;
  }

  private async findClusterResource(
    resourceName: string,
    instanceName?: string,
  ): Promise<Resource | null> {
    try {
      const clusterQueryRequest: ProjectQueryRequest = {
        name: [resourceName],
        adapterKind: ['VMWARE'],
        resourceKind: ['ResourcePool'],
      };

      this.logger.debug(`Searching for ResourcePool with name: ${resourceName}`);
      const clusterResult = await this.queryClusterResources(clusterQueryRequest, instanceName);
      if (clusterResult.resourceList && clusterResult.resourceList.length > 0) {
        this.logger.debug(`Found ResourcePool: ${clusterResult.resourceList[0].identifier}`);
        return clusterResult.resourceList[0];
      }
    } catch (error) {
      this.logger.error(`ResourcePool search failed for ${resourceName}`, error instanceof Error ? error : new Error(String(error)));
    }
    
    return null;
  }

  private async findSupervisorNamespaceResource(
    resourceName: string,
    instanceName?: string,
  ): Promise<Resource | null> {
    // For supervisor namespaces, we can use the general property-based search
    // since they should be findable by name in the general API
    return this.findGeneralResource(resourceName, instanceName);
  }

  private async findGeneralResource(
    resourceName: string,
    instanceName?: string,
  ): Promise<Resource | null> {
    const instance = this.getInstance(instanceName);
    
    // Try direct resource search first
    try {
      let endpoint = '/api/resources';
      const params = new URLSearchParams();
      params.append('name', resourceName);
      endpoint += `?${params.toString()}`;

      const directResult = await this.makeRequest<{ resourceList: Resource[] }>(instance, endpoint);
      if (directResult.resourceList && directResult.resourceList.length > 0) {
        this.logger.debug(`Found resource via direct search: ${directResult.resourceList[0].identifier}`);
        return directResult.resourceList[0];
      }
    } catch (error) {
      this.logger.warn(`Direct resource search failed, trying query approach`, error instanceof Error ? error : new Error(String(error)));
    }

    // Fallback to property-based query search
    try {
      const queryRequest: ResourceQueryRequest = {
        propertyConditions: {
          conjunctionOperator: 'OR',
          conditions: [
            {
              key: 'summary|config|name',
              operator: 'EQ',
              stringValue: resourceName,
            },
            {
              key: 'summary|config|displayName',
              operator: 'EQ',
              stringValue: resourceName,
            },
          ],
        },
      };

      const result = await this.queryResources(queryRequest, instanceName);
      if (result.resourceList.length > 0) {
        this.logger.debug(`Found resource via query search: ${result.resourceList[0].identifier}`);
        return result.resourceList[0];
      }
    } catch (error) {
      this.logger.error(`Query resource search failed for ${resourceName}`, error instanceof Error ? error : new Error(String(error)));
    }

    this.logger.debug(`No resource found with name: ${resourceName}`);
    return null;
  }



  getInstances(): Array<{ name: string; relatedVCFAInstances?: string[] }> {
    return this.instances.map(instance => ({
      name: instance.name,
      relatedVCFAInstances: instance.relatedVCFAInstances,
    }));
  }
}