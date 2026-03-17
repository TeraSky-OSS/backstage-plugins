import { LoggerService } from '@backstage/backend-plugin-api';
import fetch from 'node-fetch';

export interface VcfaVksClientOptions {
  baseUrl: string;
  orgName: string;
  username: string;
  password: string;
}

export interface VcfaSupervisorNamespace {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    annotations: {
      'infrastructure.cci.vmware.com/id': string;
      'infrastructure.cci.vmware.com/project-id': string;
    };
  };
  status: {
    phase: string;
    namespaceEndpointURL: string;
  };
}

export interface VcfaSupervisorNamespaceResponse {
  apiVersion: string;
  kind: string;
  items: VcfaSupervisorNamespace[];
  metadata: {
    resourceVersion: string;
  };
}

export interface VcfaVksCluster {
  id: string;
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    labels?: Record<string, string>;
  };
  spec: any;
  status: any;
}

interface VcfaSupervisorResourceResponse {
  content: VcfaVksCluster[];
  totalPages: number;
  number: number;
  totalElements: number;
  last: boolean;
  first: boolean;
}

export class VcfaVksClient {
  private readonly baseUrl: string;
  private readonly orgName: string;
  private readonly username: string;
  private readonly password: string;
  private readonly logger: LoggerService;

  private token?: string;
  private tokenExpiry?: Date;

  constructor(options: VcfaVksClientOptions, logger: LoggerService) {
    this.baseUrl = options.baseUrl;
    this.orgName = options.orgName;
    this.username = options.username;
    this.password = options.password;
    this.logger = logger;
  }

  async authenticate(): Promise<void> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      this.logger.debug('Using cached VCFA token');
      return;
    }

    const qualifiedUser = `${this.username}@${this.orgName}`;
    const basicAuth = Buffer.from(`${qualifiedUser}:${this.password}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/cloudapi/1.0.0/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;version=40.0',
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `VCFA authentication failed: ${response.status} ${response.statusText}`,
      );
    }

    const accessToken = response.headers.get('x-vmware-vcloud-access-token');
    if (!accessToken) {
      throw new Error('No access token received from VCFA (missing x-vmware-vcloud-access-token header)');
    }

    this.token = accessToken;
    this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    this.logger.debug('Successfully authenticated with VCFA');
  }

  /**
   * Returns a map of supervisorNamespaceName -> namespaceId (the URN from the annotation).
   */
  async fetchSupervisorNamespaceMap(): Promise<Map<string, string>> {
    await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/cci/kubernetes/apis/infrastructure.cci.vmware.com/v1alpha2/supervisornamespaces?limit=500`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch supervisor namespaces: ${response.status} ${response.statusText}`,
      );
    }

    const data: VcfaSupervisorNamespaceResponse = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      this.logger.warn('No supervisor namespace items returned from VCFA');
      return new Map();
    }

    const namespaceMap = new Map<string, string>();
    for (const ns of data.items) {
      const namespaceId = ns.metadata.annotations?.['infrastructure.cci.vmware.com/id'];
      if (namespaceId) {
        namespaceMap.set(ns.metadata.name, namespaceId);
      }
    }

    this.logger.debug(`Fetched ${namespaceMap.size} supervisor namespaces from VCFA`);
    return namespaceMap;
  }

  /**
   * Returns all supervisor resources of kind 'Cluster' across all pages.
   * Includes both standalone clusters and those managed by deployments.
   */
  async fetchVksClusters(): Promise<VcfaVksCluster[]> {
    await this.authenticate();

    const clusters: VcfaVksCluster[] = [];
    let page = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await fetch(
        `${this.baseUrl}/deployment/api/supervisor-resources?page=${page}&size=20`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
          },
        },
      );

      if (response.status === 404) {
        break;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch supervisor resources (page ${page}): ${response.status} ${response.statusText}`,
        );
      }

      const data: VcfaSupervisorResourceResponse = await response.json();

      if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
        break;
      }

      const clusterResources = data.content.filter(r => r.kind === 'Cluster');
      clusters.push(...clusterResources);

      if (page >= data.totalPages - 1 || data.content.length === 0) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    this.logger.debug(`Fetched ${clusters.length} VKS clusters from VCFA supervisor resources`);
    return clusters;
  }

  /**
   * Fetches the admin kubeconfig for a VKS cluster via the VCFA proxy API.
   * The kubeconfig is stored as a Kubernetes Secret in the supervisor namespace;
   * its `data.value` field is base64-encoded kubeconfig YAML.
   */
  async getAdminKubeConfig(
    namespaceId: string,
    namespaceName: string,
    clusterName: string,
  ): Promise<string | undefined> {
    await this.authenticate();

    const url = `${this.baseUrl}/proxy/k8s/namespaces/${namespaceId}/api/v1/namespaces/${namespaceName}/secrets/${clusterName}-kubeconfig`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch kubeconfig for cluster ${clusterName}: ${response.status} ${response.statusText}`,
        );
        return undefined;
      }

      const secret = await response.json() as { data?: { value?: string } };

      if (!secret.data?.value) {
        this.logger.warn(`Kubeconfig secret for cluster ${clusterName} has no 'data.value' field`);
        return undefined;
      }

      return Buffer.from(secret.data.value, 'base64').toString('utf-8');
    } catch (error) {
      this.logger.error(
        `Error fetching kubeconfig for cluster ${clusterName}: ${error instanceof Error ? error.message : error}`,
      );
      return undefined;
    }
  }
}
