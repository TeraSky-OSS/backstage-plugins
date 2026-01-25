import { Config } from '@backstage/config';
import express from 'express';
import { LoggerService, PermissionsService, AuthService } from '@backstage/backend-plugin-api';
import { SpectroCloudClient } from './client/SpectroCloudClient';
import {
  downloadKubeconfigPermission,
  viewClusterInfoPermission,
  viewPackValuesPermission,
  viewPackManifestsPermission,
  viewProfileInfoPermission,
} from '@terasky/backstage-plugin-spectrocloud-common';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  permissions: PermissionsService;
  auth: AuthService;
}

interface SpectroCloudClientConfig {
  url: string;
  tenant: string;
  apiToken: string;
  name?: string;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, permissions, auth } = options;
  
  const router = express.Router();
  router.use(express.json());

  // Load SpectroCloud configuration (object with environments array)
  const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
  const enablePermissions = spectroCloudConfig?.getOptionalBoolean('enablePermissions') ?? false;
  
  const spectroCloudConfigs: SpectroCloudClientConfig[] = [];
  const environmentsArray = spectroCloudConfig?.getOptionalConfigArray('environments');
  
  if (environmentsArray) {
    for (const cfg of environmentsArray) {
      spectroCloudConfigs.push({
        url: cfg.getString('url'),
        tenant: cfg.getString('tenant'),
        apiToken: cfg.getString('apiToken'),
        name: cfg.getOptionalString('name'),
      });
    }
  }

  // Helper to get client for a request
  const getClient = (instanceName?: string): SpectroCloudClient | undefined => {
    if (spectroCloudConfigs.length === 0) {
      return undefined;
    }

    let clientConfig = spectroCloudConfigs[0];
    
    if (instanceName) {
      const found = spectroCloudConfigs.find(cfg => cfg.name === instanceName);
      if (found) {
        clientConfig = found;
      }
    }

    return new SpectroCloudClient(
      {
        url: clientConfig.url,
        tenant: clientConfig.tenant,
        apiToken: clientConfig.apiToken,
        instanceName: clientConfig.name,
      },
      logger,
    );
  };

  // Helper to check permission
  const checkPermission = async (
    permission: typeof downloadKubeconfigPermission,
  ): Promise<boolean> => {
    if (!enablePermissions) {
      return true;
    }
    
    try {
      const credentials = await auth.getOwnServiceCredentials();
      const authorized = await permissions.authorize(
        [{ permission }],
        { credentials }
      );
      return authorized.every(a => a.result === 'ALLOW');
    } catch (error) {
      logger.warn(`Permission check failed: ${error}`);
      return false;
    }
  };

  // Health check
  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  // Get kubeconfig for a cluster
  router.get('/clusters/:clusterUid/kubeconfig', async (req, res) => {
    // Check permission
    if (!await checkPermission(downloadKubeconfigPermission)) {
      return res.status(403).json({ error: 'Permission denied: kubeconfig download not allowed' });
    }

    const { clusterUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;
    const frp = req.query.frp !== 'false'; // Default to true

    const client = getClient(instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const kubeconfig = await client.getClientKubeConfig(clusterUid, projectUid, frp);
      
      if (!kubeconfig) {
        return res.status(404).json({ error: 'Kubeconfig not found' });
      }

      res.setHeader('Content-Type', 'application/x-yaml');
      res.setHeader('Content-Disposition', `attachment; filename="${clusterUid}-kubeconfig.yaml"`);
      return res.send(kubeconfig);
    } catch (error) {
      logger.error(`Failed to get kubeconfig for cluster ${clusterUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get kubeconfig' 
      });
    }
  });

  // Get cluster details
  router.get('/clusters/:clusterUid', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewClusterInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: cluster info view not allowed' });
    }

    const { clusterUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = getClient(instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const cluster = await client.getCluster(clusterUid, projectUid);
      
      if (!cluster) {
        return res.status(404).json({ error: 'Cluster not found' });
      }

      return res.json(cluster);
    } catch (error) {
      logger.error(`Failed to get cluster ${clusterUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get cluster' 
      });
    }
  });

  // Get cluster profile details
  router.get('/profiles/:profileUid', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewProfileInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: profile info view not allowed' });
    }

    const { profileUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = getClient(instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const profile = await client.getClusterProfile(profileUid, projectUid);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.json(profile);
    } catch (error) {
      logger.error(`Failed to get profile ${profileUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get profile' 
      });
    }
  });

  // Search profiles by names (POST with body containing names array)
  router.post('/profiles/search', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewProfileInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: profile info view not allowed' });
    }

    const { names } = req.body as { names?: string[] };
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'names array is required in request body' });
    }

    const client = getClient(instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const profiles = await client.searchClusterProfilesByName(names, projectUid);
      return res.json({ profiles });
    } catch (error) {
      logger.error(`Failed to search profiles: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to search profiles' 
      });
    }
  });

  // Get cluster profiles with pack metadata (values, schema, presets)
  router.get('/clusters/:clusterUid/profiles', async (req, res) => {
    // Check permission - need pack values permission to see full pack details
    if (!await checkPermission(viewPackValuesPermission)) {
      return res.status(403).json({ error: 'Permission denied: pack values view not allowed' });
    }

    const { clusterUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = getClient(instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const profiles = await client.getClusterProfiles(clusterUid, projectUid);
      return res.json(profiles);
    } catch (error) {
      logger.error(`Failed to get cluster profiles for ${clusterUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get cluster profiles' 
      });
    }
  });

  // Get pack manifest content
  router.get('/clusters/:clusterUid/pack/manifests/:manifestUid', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewPackManifestsPermission)) {
      return res.status(403).json({ error: 'Permission denied: pack manifests view not allowed' });
    }

    const { clusterUid, manifestUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = getClient(instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const manifest = await client.getPackManifest(clusterUid, manifestUid, projectUid);
      
      if (!manifest) {
        return res.status(404).json({ error: 'Manifest not found' });
      }

      return res.json(manifest);
    } catch (error) {
      logger.error(`Failed to get manifest ${manifestUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get manifest' 
      });
    }
  });

  return router;
}
