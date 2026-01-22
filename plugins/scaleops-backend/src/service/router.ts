import express from 'express';
import Router from 'express-promise-router';
import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import fetch from 'node-fetch';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;
  const router = Router();
  router.use(express.json());

  const scaleopsConfig = config.getConfig('scaleops');
  const baseUrl = scaleopsConfig.getString('baseUrl');
  const authConfig = scaleopsConfig.getOptionalConfig('authentication');

  // Helper function to authenticate with ScaleOps
  const authenticateScaleOps = async (): Promise<string> => {
    // Check if we have a cached token
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      logger.debug('Using cached ScaleOps token');
      return cachedToken.token;
    }

    if (!authConfig || !authConfig.getOptionalBoolean('enabled')) {
      logger.debug('ScaleOps authentication is not enabled');
      throw new Error('ScaleOps authentication is not configured');
    }

    const username = authConfig.getString('user');
    const password = authConfig.getString('password');

    logger.info('Authenticating with ScaleOps...');

    try {
      // Make the authentication request
      const authResponse = await fetch(`${baseUrl}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth_state=TOKEN',
        },
        body: JSON.stringify({ username, password }),
        redirect: 'manual', // Don't follow redirects
      });

      logger.debug(`Auth response status: ${authResponse.status}`);

      // Get the Location header from the redirect
      const location = authResponse.headers.get('location') || authResponse.headers.get('Location');

      if (!location) {
        logger.error('No Location header in authentication response');
        throw new Error('Failed to authenticate with ScaleOps: No redirect location');
      }

      logger.debug(`Location header: ${location}`);

      // Extract the token from the Location header
      if (location.includes('token=')) {
        const urlParams = new URLSearchParams(location.split('?')[1]);
        const encodedToken = urlParams.get('token');

        if (encodedToken) {
          const accessToken = decodeURIComponent(encodedToken);
          logger.info('Successfully authenticated with ScaleOps');

          // Cache the token for 1 hour
          cachedToken = {
            token: accessToken,
            expiresAt: Date.now() + (60 * 60 * 1000),
          };

          return accessToken;
        }
      }

      throw new Error('Failed to extract token from authentication response');
    } catch (error) {
      logger.error(`Error authenticating with ScaleOps: ${error}`);
      throw error;
    }
  };

  // Health check endpoint
  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  // Proxy all ScaleOps API requests
  router.all('/api/*', async (req, res) => {
    try {
      const token = await authenticateScaleOps();

      // Extract the path after /api/
      const apiPath = req.path.replace('/api/', '');
      const queryString = req.url.split('?')[1];
      const fullUrl = `${baseUrl}/${apiPath}${queryString ? `?${queryString}` : ''}`;

      logger.debug(`Proxying request to: ${fullUrl}`);

      const proxyResponse = await fetch(fullUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(req.headers['x-scaleops-cluster'] && {
            'X-Scaleops-Cluster': req.headers['x-scaleops-cluster'] as string,
          }),
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      const data = await proxyResponse.json();

      if (!proxyResponse.ok) {
        logger.error(`ScaleOps API error: ${proxyResponse.status} ${proxyResponse.statusText}`);
        res.status(proxyResponse.status).json(data);
        return;
      }

      res.json(data);
    } catch (error) {
      logger.error(`Error proxying request to ScaleOps: ${error}`);
      res.status(500).json({ error: 'Failed to proxy request to ScaleOps' });
    }
  });

  return router;
}

