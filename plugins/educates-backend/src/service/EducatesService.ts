import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import fetch from 'node-fetch';

interface TrainingPortal {
  name: string;
  url: string;
  auth: {
    robotUsername: string;
    robotPassword: string;
    clientId: string;
    clientSecret: string;
  };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class EducatesService {
  private readonly trainingPortals: TrainingPortal[];

  constructor(
    private readonly config: Config,
    private readonly logger: LoggerService,
  ) {
    this.trainingPortals = config.getConfigArray('educates.trainingPortals').map(portal => ({
      name: portal.getString('name'),
      url: portal.getString('url'),
      auth: {
        robotUsername: portal.getConfig('auth').getString('robotUsername'),
        robotPassword: portal.getConfig('auth').getString('robotPassword'),
        clientId: portal.getConfig('auth').getString('clientId'),
        clientSecret: portal.getConfig('auth').getString('clientSecret'),
      },
    }));
  }

  private async getAccessToken(portal: TrainingPortal): Promise<TokenResponse> {
    const tokenResponse = await fetch(`${portal.url}/oauth2/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${portal.auth.clientId}:${portal.auth.clientSecret}`).toString('base64')}`,
      },
      body: `grant_type=password&username=${encodeURIComponent(portal.auth.robotUsername)}&password=${encodeURIComponent(portal.auth.robotPassword)}`,
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }

    return await tokenResponse.json();
  }

  async getTrainingPortals() {
    return this.trainingPortals.map(portal => ({
      name: portal.name,
      url: portal.url,
    }));
  }

  async getWorkshops(portalName: string) {
    const portal = this.trainingPortals.find(p => p.name === portalName);
    if (!portal) {
      throw new Error('Training portal not found');
    }

    try {
      const tokenData = await this.getAccessToken(portal);
      const accessToken = tokenData.access_token;

      const catalogResponse = await fetch(`${portal.url}/workshops/catalog/workshops/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!catalogResponse.ok) {
        throw new Error(`Failed to get workshops catalog: ${catalogResponse.statusText}`);
      }

      return await catalogResponse.json();
    } catch (err) {
      this.logger.error(`Failed to get workshops catalog: ${err}`);
      throw err;
    }
  }

  async requestWorkshopSession(portalName: string, workshopEnvName: string) {
    const portal = this.trainingPortals.find(p => p.name === portalName);
    if (!portal) {
      throw new Error('Training portal not found');
    }

    try {
      const tokenData = await this.getAccessToken(portal);
      const accessToken = tokenData.access_token;

      // Get workshops catalog to find the workshop name
      const catalogResponse = await fetch(`${portal.url}/workshops/catalog/workshops/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!catalogResponse.ok) {
        throw new Error(`Failed to get workshops catalog: ${catalogResponse.statusText}`);
      }

      const catalogData = await catalogResponse.json();
      const workshop = catalogData.workshops?.find((w: any) => w.environment.name === workshopEnvName);
      
      if (!workshop) {
        throw new Error(`Workshop not found with environment name: ${workshopEnvName}`);
      }

      const appBaseUrl = this.config.getString('app.baseUrl');
      const indexUrl = `${appBaseUrl}/educates`;
      const sessionUrl = `${portal.url}/workshops/environment/${workshopEnvName}/request/?index_url=${encodeURIComponent(indexUrl)}`;
      
      const sessionResponse = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to request workshop session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      return {
        ...sessionData,
        url: `${portal.url}${sessionData.url}`,
      };
    } catch (err) {
      this.logger.error(`Failed to request workshop: ${err}`);
      throw err;
    }
  }
}
