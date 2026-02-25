import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  GetResourcesRequest,
  GetEventsRequest,
  GetResourceGraphRequest,
  GetV2ResourceGraphRequest,
  CrossplaneResourceListResponse,
  CrossplaneEventsResponse,
  CrossplaneResourceGraphResponse,
  ManagedResourceDefinitionListResponse,
  CROSSPLANE_BACKEND_ROUTES,
} from '@terasky/backstage-plugin-crossplane-common';

export interface CrossplaneApi {
  getResources(request: GetResourcesRequest): Promise<CrossplaneResourceListResponse>;
  getEvents(request: GetEventsRequest): Promise<CrossplaneEventsResponse>;
  getResourceGraph(request: GetResourceGraphRequest): Promise<CrossplaneResourceGraphResponse>;
  getV2ResourceGraph(request: GetV2ResourceGraphRequest): Promise<CrossplaneResourceGraphResponse>;
  getManagedResourceDefinitions(
    clusterName: string,
    providerName?: string,
  ): Promise<ManagedResourceDefinitionListResponse>;
}

export const crossplaneApiRef = createApiRef<CrossplaneApi>({
  id: 'plugin.crossplane.api',
});

export class CrossplaneApiClient implements CrossplaneApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  private async fetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await this.discoveryApi.getBaseUrl('crossplane');
    const response = await this.fetchApi.fetch(`${baseUrl}${path}`, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch from Crossplane backend: ${response.statusText}`);
    }

    return await response.json();
  }

  async getResources(request: GetResourcesRequest): Promise<CrossplaneResourceListResponse> {
    return this.fetch(CROSSPLANE_BACKEND_ROUTES.getResources, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  }

  async getEvents(request: GetEventsRequest): Promise<CrossplaneEventsResponse> {
    const params = new URLSearchParams({
      clusterName: request.clusterName,
      namespace: request.namespace,
      resourceName: request.resourceName,
      resourceKind: request.resourceKind,
    });

    return this.fetch(`${CROSSPLANE_BACKEND_ROUTES.getEvents}?${params.toString()}`);
  }

  async getResourceGraph(request: GetResourceGraphRequest): Promise<CrossplaneResourceGraphResponse> {
    const params = new URLSearchParams({
      clusterName: request.clusterName,
      namespace: request.namespace,
      xrdName: request.xrdName,
      xrdId: request.xrdId,
      claimId: request.claimId,
      claimName: request.claimName,
      claimGroup: request.claimGroup,
      claimVersion: request.claimVersion,
      claimPlural: request.claimPlural,
    });

    return this.fetch(`${CROSSPLANE_BACKEND_ROUTES.getResourceGraph}?${params.toString()}`);
  }

  async getV2ResourceGraph(request: GetV2ResourceGraphRequest): Promise<CrossplaneResourceGraphResponse> {
    const params = new URLSearchParams({
      clusterName: request.clusterName,
      namespace: request.namespace,
      name: request.name,
      group: request.group,
      version: request.version,
      plural: request.plural,
      scope: request.scope,
    });

    return this.fetch(`${CROSSPLANE_BACKEND_ROUTES.getV2ResourceGraph}?${params.toString()}`);
  }

  async getManagedResourceDefinitions(
    clusterName: string,
    providerName?: string,
  ): Promise<ManagedResourceDefinitionListResponse> {
    const params = new URLSearchParams({ clusterName });
    if (providerName) {
      params.set('providerName', providerName);
    }
    return this.fetch(
      `${CROSSPLANE_BACKEND_ROUTES.getManagedResourceDefinitions}?${params.toString()}`,
    );
  }
}
