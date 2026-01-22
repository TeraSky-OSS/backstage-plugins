import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import fetch from 'node-fetch';

export class ScaleOpsService {
  private readonly baseUrl: string;
  private readonly authConfig: any;
  private readonly linkToDashboard: boolean;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: Config,
    private readonly logger: LoggerService
  ) {
    const scaleopsConfig = this.config.getConfig('scaleops');
    this.baseUrl = scaleopsConfig.getString('baseUrl');
    this.authConfig = scaleopsConfig.getOptionalConfig('authentication');
    this.linkToDashboard = scaleopsConfig.getOptionalBoolean('linkToDashboard') ?? false;
  }

  /**
   * Generates a ScaleOps dashboard URL for a workload
   */
  generateDashboardUrl(workloadName: string, labels?: string[]): string | null {
    if (!this.linkToDashboard) {
      return null;
    }

    const labelsQuery = labels 
      ? labels.map(label => `labels=${encodeURIComponent(label)}`).join('&')
      : '';
    
    return `${this.baseUrl}/cost-report/compute?searchTerms=${encodeURIComponent(workloadName)}&selectedTable=Workloads&groupByCluster=0&groupByNamespace=0&logicalLabel=AND${labelsQuery ? `&${labelsQuery}` : ''}`;
  }

  private async authenticate(): Promise<string> {
    // Check if we have a cached token
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      this.logger.debug('Using cached ScaleOps token');
      return this.cachedToken.token;
    }

    if (!this.authConfig || !this.authConfig.getOptionalBoolean('enabled')) {
      this.logger.debug('ScaleOps authentication is not enabled');
      throw new Error('ScaleOps authentication is not configured');
    }

    const username = this.authConfig.getString('user');
    const password = this.authConfig.getString('password');

    this.logger.info('Authenticating with ScaleOps...');

    try {
      const authResponse = await fetch(`${this.baseUrl}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth_state=TOKEN',
        },
        body: JSON.stringify({ username, password }),
        redirect: 'manual',
      });

      this.logger.debug(`Auth response status: ${authResponse.status}`);

      const location = authResponse.headers.get('location') || authResponse.headers.get('Location');

      if (!location) {
        this.logger.error('No Location header in authentication response');
        throw new Error('Failed to authenticate with ScaleOps: No redirect location');
      }

      if (location.includes('token=')) {
        const urlParams = new URLSearchParams(location.split('?')[1]);
        const encodedToken = urlParams.get('token');

        if (encodedToken) {
          const accessToken = decodeURIComponent(encodedToken);
          this.logger.info('Successfully authenticated with ScaleOps');

          // Cache the token for 1 hour
          this.cachedToken = {
            token: accessToken,
            expiresAt: Date.now() + (60 * 60 * 1000),
          };

          return accessToken;
        }
      }

      throw new Error('Failed to extract token from authentication response');
    } catch (error) {
      this.logger.error(`Error authenticating with ScaleOps: ${error}`);
      throw error;
    }
  }

  async getWorkloadsByLabels(
    labels: string[],
    multiCluster: boolean = true,
    logicalLabel: string = 'AND'
  ): Promise<any> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/api/v1/dashboard/byNamespace?multiCluster=${multiCluster}&logicalLabel=${logicalLabel}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ label: labels }),
      }
    );

    if (!response.ok) {
      throw new Error(`ScaleOps API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getWorkloadCostDetails(
    clusterName: string,
    namespace: string,
    workloadType: string,
    labels: string[],
    range: string = '7d'
  ): Promise<any> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/detailedCostReport/getWorkloads?multiCluster=true&range=${range}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Scaleops-Cluster': clusterName,
        },
        body: JSON.stringify({
          clusterFilters: [clusterName],
          namespaces: [namespace],
          workloadTypes: [workloadType],
          labels,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ScaleOps API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async checkNetworkCostEnabled(multiCluster: boolean = true): Promise<any> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/api/v1/networkCost/networkCostEnabled?multiCluster=${multiCluster}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`ScaleOps API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getWorkloadNetworkUsage(
    clusterName: string,
    namespace: string,
    workloadName: string,
    workloadType: string,
    from: number,
    to: number
  ): Promise<any> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/api/v1/workload-network?name=${workloadName}&namespace=${namespace}&workloadType=${workloadType}&from=${from}&to=${to}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Scaleops-Cluster': clusterName,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`ScaleOps API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getPolicyByName(policyName: string, clusterName?: string): Promise<any> {
    const token = await this.authenticate();

    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    if (clusterName) {
      headers['X-Scaleops-Cluster'] = clusterName;
    }

    const response = await fetch(
      `${this.baseUrl}/api/v1/policies`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`ScaleOps API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter to return only the requested policy
    const policy = data.policies?.find((p: any) => p.metadata?.name === policyName);
    
    return policy || null;
  }
}

