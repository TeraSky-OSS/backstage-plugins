import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { GetResourcesRequest, KroResourceListResponse, GetEventsRequest, KroEventsResponse, KroResourceGraphResponse } from '@terasky/backstage-plugin-kro-common';

export interface KroApi {
  getResources(params: GetResourcesRequest): Promise<KroResourceListResponse>;

  getEvents(params: GetEventsRequest): Promise<KroEventsResponse>;

  getResourceGraph(params: {
    clusterName: string;
    namespace: string;
    rgdName: string;
    rgdId: string;
    instanceId: string;
    instanceName: string;
  }): Promise<KroResourceGraphResponse>;
}

export const kroApiRef = createApiRef<KroApi>({
  id: 'plugin.kro.api',
});

export class KroApiClient implements KroApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  private async fetch<T = any>(path: string, params: Record<string, any>): Promise<T> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kro');
    const queryString = new URLSearchParams(params).toString();
    const response = await this.fetchApi.fetch(`${baseUrl}${path}?${queryString}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch from KRO backend: ${response.statusText}`);
    }

    return await response.json();
  }

  async getResources(params: GetResourcesRequest): Promise<KroResourceListResponse> {
    return this.fetch('/resources', params);
  }

  async getEvents(params: GetEventsRequest): Promise<KroEventsResponse> {
    return this.fetch('/events', params);
  }

  async getResourceGraph(params: {
    clusterName: string;
    namespace: string;
    rgdName: string;
    rgdId: string;
    instanceId: string;
    instanceName: string;
  }): Promise<KroResourceGraphResponse> {
    return this.fetch('/graph', params);
  }
}
