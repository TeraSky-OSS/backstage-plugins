import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  GetPolicyReportsRequest,
  GetPolicyReportsResponse,
  GetPolicyRequest,
  GetPolicyResponse,
} from '@terasky/backstage-plugin-kyverno-common';

export interface KyvernoApi {
  getPolicyReports(request: GetPolicyReportsRequest): Promise<GetPolicyReportsResponse>;
  getPolicy(request: GetPolicyRequest): Promise<GetPolicyResponse>;
}

export const kyvernoApiRef = createApiRef<KyvernoApi>({
  id: 'plugin.kyverno.api',
});

export class KyvernoApiClient implements KyvernoApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  private async fetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kyverno');
    const response = await this.fetchApi.fetch(`${baseUrl}${path}`, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch from Kyverno backend: ${response.statusText}`);
    }

    return await response.json();
  }

  async getPolicyReports(request: GetPolicyReportsRequest): Promise<GetPolicyReportsResponse> {
    return this.fetch('/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  }

  async getPolicy(request: GetPolicyRequest): Promise<GetPolicyResponse> {
    const params = new URLSearchParams({
      clusterName: request.clusterName,
      policyName: request.policyName,
      ...(request.namespace && { namespace: request.namespace }),
    });

    return this.fetch(`/policy?${params.toString()}`);
  }
}
