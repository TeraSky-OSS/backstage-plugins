import { DiscoveryApi } from '@backstage/core-plugin-api';
import { AuthService } from '@backstage/backend-plugin-api';
import { KubernetesProxyRequestBody } from '../types';
import { KubernetesResourceFetcher, KubernetesResourceFetcherOptions } from '../types';
import fetch from 'node-fetch';

export class DefaultKubernetesResourceFetcher implements KubernetesResourceFetcher {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly auth: AuthService,
  ) {}

  async getClusters(): Promise<string[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kubernetes');
    const credentials = await this.auth.getOwnServiceCredentials();
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'kubernetes',
    });
    
    const response = await fetch(`${baseUrl}/clusters`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Kubernetes-Ingestor': 'true', // Add custom header for log filtering
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch clusters: ${response.statusText}`);
    }
    const clusters = await response.json();
    return clusters.items.map((cluster: any) => cluster.name);
  }

  async fetchResources<T>(options: KubernetesResourceFetcherOptions): Promise<T[]> {
    const { clusterName, namespace, resourcePath, query } = options;
    
    const baseUrl = await this.discoveryApi.getBaseUrl('kubernetes');
    const credentials = await this.auth.getOwnServiceCredentials();
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'kubernetes',
    });

    let path = `/apis/${resourcePath}`;
    if (namespace) {
      path += `?namespace=${namespace}`;
    }
    if (query) {
      const queryString = new URLSearchParams(query).toString();
      path += path.includes('?') ? '&' : '?' + queryString;
    }

    const response = await fetch(`${baseUrl}/proxy${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Backstage-Kubernetes-Cluster': clusterName,
        'X-Kubernetes-Ingestor': 'true', // Add custom header for log filtering
      },
    });

    if (!response.ok) {
      // Handle 404 errors gracefully for API discovery
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch Kubernetes resources: with response ${JSON.stringify(response)} ${response.statusText} for request to ${path}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async fetchResource<T>(options: KubernetesResourceFetcherOptions): Promise<T> {
    const { clusterName, namespace, resourcePath } = options;
    
    const baseUrl = await this.discoveryApi.getBaseUrl('kubernetes');
    const credentials = await this.auth.getOwnServiceCredentials();
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'kubernetes',
    });

    const path = namespace ? `/apis/${resourcePath}?namespace=${namespace}` : `/apis/${resourcePath}`;

    const response = await fetch(`${baseUrl}/proxy${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Backstage-Kubernetes-Cluster': clusterName,
        'X-Kubernetes-Ingestor': 'true', // Add custom header for log filtering
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Kubernetes resource: with response ${JSON.stringify(response)} ${response.statusText} for request to ${path}`);
    }

    return await response.json();
  }

  async proxyKubernetesRequest(
    clusterName: string,
    request: KubernetesProxyRequestBody,
  ): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kubernetes');
    const credentials = await this.auth.getOwnServiceCredentials();
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'kubernetes',
    });

    const response = await fetch(`${baseUrl}/proxy${request.path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Backstage-Kubernetes-Cluster': clusterName,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Kubernetes resources: ${response.statusText}`);
    }

    return await response.json();
  }
}