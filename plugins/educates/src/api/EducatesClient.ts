import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { WorkshopsCatalogResponse, WorkshopSession } from '@terasky/backstage-plugin-educates-common';

export const educatesApiRef = createApiRef<EducatesApi>({
  id: 'plugin.educates.service',
});

export interface EducatesApi {
  getWorkshops(portalName: string): Promise<WorkshopsCatalogResponse>;
  requestWorkshop(portalName: string, workshopEnvName: string, openInNewTab: boolean): Promise<WorkshopSession>;
}

export class EducatesClient implements EducatesApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async getBaseUrl() {
    const baseUrl = await this.discoveryApi.getBaseUrl('educates');
    return baseUrl;
  }

  private async fetchCatalogHtml(portalUrl: string, accessToken: string): Promise<string | undefined> {
    try {
      const response = await this.fetchApi.fetch(`${portalUrl}/workshops/catalog/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch catalog HTML: ${response.statusText}`);
      }

      const html = await response.text();
      return html;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching catalog HTML:', error);
      return undefined;
    }
  }

  private extractLogoFromHtml(html: string): string | undefined {
    try {
      const logoMatch = html.match(/src="(data:image\/png;base64,[^"]+)"/);
      return logoMatch?.[1];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error extracting logo from HTML:', error);
      return undefined;
    }
  }

  async getWorkshops(portalName: string): Promise<WorkshopsCatalogResponse> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/workshops/${encodeURIComponent(portalName)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch workshops: ${response.statusText}`);
    }
    const data = await response.json();

    // Get the access token from the backend
    const tokenResponse = await this.fetchApi.fetch(
      `${baseUrl}/workshops/${encodeURIComponent(portalName)}/token`,
      {
        method: 'POST',
      },
    );
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }
    const { access_token: accessToken } = await tokenResponse.json();

    // Fetch the catalog HTML and extract the logo
    const html = await this.fetchCatalogHtml(data.portal.url, accessToken);
    if (html) {
      const logo = this.extractLogoFromHtml(html);
      if (logo) {
        data.portal.logo = logo;
      }
    }

    return data;
  }

  async requestWorkshop(
    portalName: string,
    workshopEnvName: string,
    openInNewTab: boolean,
  ): Promise<WorkshopSession> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/workshops/${encodeURIComponent(portalName)}/${encodeURIComponent(workshopEnvName)}/request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ openInNewTab }),
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to request workshop: ${response.statusText}`);
    }
    return await response.json();
  }
} 