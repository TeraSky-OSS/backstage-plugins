import { LoggerService } from '@backstage/backend-plugin-api';
import fetch, { Response } from 'node-fetch';
import * as yaml from 'js-yaml';

export interface SpectroCloudClientOptions {
  url: string;
  tenant: string;
  apiToken: string;
}

export interface SpectroCloudCluster {
  metadata: {
    uid: string;
    name: string;
    annotations?: {
      scope?: string;
      projectUid?: string;
    };
  };
  spec: {
    cloudType: string;
  };
  status: {
    state: string;
    kubeMeta?: {
      hasKubeConfigClient?: boolean;
    };
  };
}

export interface SpectroCloudProject {
  metadata: {
    uid: string;
    name: string;
  };
}

export interface KubeConfig {
  apiVersion: string;
  clusters: Array<{
    cluster: {
      'certificate-authority-data'?: string;
      server: string;
    };
    name: string;
  }>;
  contexts: Array<{
    context: {
      cluster: string;
      user: string;
    };
    name: string;
  }>;
  'current-context': string;
  kind: string;
  users: Array<{
    name: string;
    user: {
      'client-certificate-data'?: string;
      'client-key-data'?: string;
      token?: string;
    };
  }>;
}

export class SpectroCloudClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly logger: LoggerService;

  constructor(options: SpectroCloudClientOptions, logger: LoggerService) {
    this.baseUrl = options.url;
    this.apiToken = options.apiToken;
    this.logger = logger;
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

  async getAdminKubeConfig(
    clusterUid: string,
    projectUid?: string,
  ): Promise<string | undefined> {
    try {
      const endpoint = projectUid
        ? `/v1/spectroclusters/${clusterUid}/assets/adminKubeconfig?ProjectUid=${projectUid}`
        : `/v1/spectroclusters/${clusterUid}/assets/adminKubeconfig`;

      const response = await this.makeRequest(endpoint, 'GET', undefined, true);
      return await response.text();
    } catch (error) {
      this.logger.debug(`Failed to fetch admin kubeconfig for cluster ${clusterUid}: ${error}`);
      return undefined;
    }
  }

  parseKubeConfig(kubeconfigText: string): KubeConfig | undefined {
    try {
      return yaml.load(kubeconfigText) as KubeConfig;
    } catch (error) {
      this.logger.error(`Failed to parse kubeconfig: ${error}`);
      return undefined;
    }
  }

  private async makeRequest(
    path: string,
    method: string = 'GET',
    headers?: Record<string, string>,
    skipJsonHeaders: boolean = false,
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

