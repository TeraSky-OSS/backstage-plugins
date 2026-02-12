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
  createClusterPermission,
} from '@terasky/backstage-plugin-spectrocloud-common';
import { getSessionTokenByEmail } from './tokenCache';

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
  const getClient = async (req: express.Request, res: express.Response, instanceName?: string): Promise<SpectroCloudClient | undefined> => {
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

    // Extract user's HS256 token from the global cache using email sent by frontend
    let userToken: string | undefined;
    let needsReAuth = false;
    
    // Get user email from custom header (sent by frontend)
    const userEmail = req.headers['x-spectrocloud-user-email'] as string | undefined;
    
    if (userEmail) {
      // Get HS256 token from shared global cache
      const cachedToken = getSessionTokenByEmail(userEmail);
      if (cachedToken) {
        userToken = cachedToken;
      } else {
        logger.warn(`No cached token found for user: ${userEmail} - user needs to re-authenticate`);
        needsReAuth = true;
      }
    }
    
    // Fallback: Try custom header
    if (!userToken) {
      const oidcToken = req.headers['x-spectrocloud-token'] as string | undefined;
      if (oidcToken) {
        userToken = oidcToken;
        needsReAuth = false; // Token provided directly
      }
    }
    
    // Add header to indicate re-auth is needed (but allow request to proceed with fallback)
    if (needsReAuth) {
      res.setHeader('X-SpectroCloud-ReAuth-Required', 'true');
    }
    
    if (!userToken && !clientConfig.apiToken) {
      // No token and no fallback - cannot proceed
      logger.error('No authentication token available and no fallback API token configured');
      return undefined;
    }
    
    if (!userToken) {
      logger.warn('No user token available - backend will use fallback API token');
    }

    return new SpectroCloudClient(
      {
        url: clientConfig.url,
        tenant: clientConfig.tenant,
        apiToken: clientConfig.apiToken, // Fallback
        userToken, // Preferred if provided
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

  // Debug endpoint to check authentication
  router.get('/auth/debug', async (req, res) => {
    const oidcToken = req.headers['x-spectrocloud-token'] as string | undefined;
    
    return res.json({
      hasOidcToken: !!oidcToken,
      tokenLength: oidcToken?.length || 0,
      tokenPrefix: oidcToken ? oidcToken.substring(0, 20) + '...' : 'none',
      headers: Object.keys(req.headers),
    });
  });

  // Get user's accessible projects
  router.get('/users/me/projects', async (req, res) => {
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const userInfo = await client.getUserInfo();
      const projectPermissions = userInfo.status?.projectPermissions || {};
      const projectUids = Object.keys(projectPermissions);
      
      // Get project names from the projects API
      const allProjects = await client.getAllProjects();
      const accessibleProjects = allProjects
        .filter(p => projectUids.includes(p.metadata.uid))
        .map(p => ({
          uid: p.metadata.uid,
          name: p.metadata.name,
        }));
      
      logger.info(`User has access to ${accessibleProjects.length} projects`);
      return res.json({ projects: accessibleProjects });
    } catch (error) {
      logger.error(`Failed to get user projects: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get user projects' 
      });
    }
  });

  // Get all clusters (basic metadata)
  router.get('/clusters', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewClusterInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: cluster info view not allowed' });
    }

    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const clusters = await client.getAllClusters();
      logger.info(`Successfully fetched ${clusters.length} clusters from SpectroCloud API`);
      logger.debug(`Cluster UIDs: ${clusters.map(c => c.metadata.uid).join(', ')}`);
      return res.json({ clusters });
    } catch (error) {
      logger.error(`Failed to get clusters: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get clusters' 
      });
    }
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

    const client = await getClient(req, res, instanceName);
    
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

    const client = await getClient(req, res, instanceName);
    
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

    const client = await getClient(req, res, instanceName);
    
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

    const client = await getClient(req, res, instanceName);
    
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

    const client = await getClient(req, res, instanceName);
    
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

    const client = await getClient(req, res, instanceName);
    
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

  // ====================
  // Cluster Deployment Endpoints
  // ====================

  // Get all projects
  router.get('/projects', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewClusterInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: cluster info view not allowed' });
    }

    const instanceName = req.query.instance as string | undefined;
    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const projects = await client.getAllProjects();
      return res.json({ projects });
    } catch (error) {
      logger.error(`Failed to get projects: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get projects' 
      });
    }
  });

  // Get cloud accounts for a cloud type
  router.get('/cloudaccounts/:cloudType', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewClusterInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: cluster info view not allowed' });
    }

    const { cloudType } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const accounts = await client.getCloudAccounts(cloudType, projectUid);
      return res.json({ accounts });
    } catch (error) {
      logger.error(`Failed to get ${cloudType} cloud accounts: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get cloud accounts' 
      });
    }
  });

  // Get profiles for a project
  router.get('/projects/:projectUid/profiles', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewProfileInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: profile info view not allowed' });
    }

    const { projectUid } = req.params;
    const cloudType = req.query.cloudType as string | undefined;
    const profileType = req.query.profileType as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const profiles = await client.getProjectClusterProfiles(projectUid, cloudType, profileType);
      return res.json({ profiles });
    } catch (error) {
      logger.error(`Failed to get profiles for project ${projectUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get profiles' 
      });
    }
  });

  // Get profile with pack details
  router.get('/profiles/:profileUid/packs', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewPackValuesPermission)) {
      return res.status(403).json({ error: 'Permission denied: pack values view not allowed' });
    }

    const { profileUid } = req.params;
    const versionUid = req.query.versionUid as string | undefined;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const profile = await client.getProfileWithPacks(profileUid, versionUid, projectUid);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.json(profile);
    } catch (error) {
      logger.error(`Failed to get profile packs for ${profileUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get profile packs' 
      });
    }
  });

  // Create cluster (cloud type determined from request body)
  router.post('/clusters', async (req, res) => {
    // Check permission
    if (!await checkPermission(createClusterPermission)) {
      return res.status(403).json({ error: 'Permission denied: cluster creation not allowed' });
    }

    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;
    const clusterConfig = req.body;

    if (!clusterConfig || !clusterConfig.spec || !clusterConfig.spec.cloudType) {
      return res.status(400).json({ error: 'Invalid cluster configuration: cloudType is required' });
    }

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      let result;
      const cloudType = clusterConfig.spec.cloudType.toLowerCase();

      switch (cloudType) {
        case 'eks':
          result = await client.createEKSCluster(clusterConfig, projectUid);
          break;
        case 'aws':
          result = await client.createAWSCluster(clusterConfig, projectUid);
          break;
        case 'aks':
          result = await client.createAKSCluster(clusterConfig, projectUid);
          break;
        case 'azure':
          result = await client.createAzureCluster(clusterConfig, projectUid);
          break;
        case 'vsphere':
          result = await client.createVSphereCluster(clusterConfig, projectUid);
          break;
        default:
          return res.status(400).json({ error: `Unsupported cloud type: ${cloudType}` });
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error(`Failed to create cluster: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create cluster' 
      });
    }
  });

  // Get profile variables
  router.get('/profiles/:profileUid/variables', async (req, res) => {
    const { profileUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const variables = await client.getProfileVariables(profileUid, projectUid);
      return res.json(variables);
    } catch (error) {
      logger.error(`Failed to get variables for profile ${profileUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get profile variables' 
      });
    }
  });

  // Get vSphere cloud account metadata (must come before generic route)
  router.get('/cloudaccounts/vsphere/:accountUid/metadata', async (req, res) => {
    const { accountUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const metadata = await client.getVSphereCloudAccountMetadata(accountUid, projectUid);
      return res.json(metadata);
    } catch (error) {
      logger.error(`Failed to get metadata for vSphere account ${accountUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get vSphere metadata' 
      });
    }
  });

  // Get vSphere compute cluster resources
  router.get('/cloudaccounts/vsphere/:accountUid/computecluster/resources', async (req, res) => {
    const { accountUid } = req.params;
    const datacenter = req.query.datacenter as string;
    const computecluster = req.query.computecluster as string;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    if (!datacenter || !computecluster) {
      return res.status(400).json({ error: 'datacenter and computecluster are required' });
    }

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const resources = await client.getVSphereComputeClusterResources(accountUid, datacenter, computecluster, projectUid);
      return res.json(resources);
    } catch (error) {
      logger.error(`Failed to get compute cluster resources: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get compute cluster resources' 
      });
    }
  });

  // Get specific cloud account details (generic route, must come after specific routes)
  router.get('/cloudaccounts/:cloudType/:accountUid', async (req, res) => {
    // Check permission
    if (!await checkPermission(viewClusterInfoPermission)) {
      return res.status(403).json({ error: 'Permission denied: cluster info view not allowed' });
    }

    const { cloudType, accountUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const account = await client.getCloudAccount(cloudType, accountUid, projectUid);
      return res.json(account);
    } catch (error) {
      logger.error(`Failed to get cloud account ${accountUid}: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get cloud account' 
      });
    }
  });

  // Get user SSH keys
  router.get('/users/sshkeys', async (req, res) => {
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const sshKeys = await client.getUserSSHKeys(projectUid);
      return res.json(sshKeys);
    } catch (error) {
      logger.error(`Failed to get SSH keys: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get SSH keys' 
      });
    }
  });

  // Get overlords
  router.get('/overlords', async (req, res) => {
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const overlords = await client.getOverlords(projectUid);
      return res.json(overlords);
    } catch (error) {
      logger.error(`Failed to get overlords: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get overlords' 
      });
    }
  });

  // Get vSphere IP pools
  router.get('/overlords/vsphere/:overlordUid/pools', async (req, res) => {
    const { overlordUid } = req.params;
    const projectUid = req.query.projectUid as string | undefined;
    const instanceName = req.query.instance as string | undefined;

    const client = await getClient(req, res, instanceName);
    
    if (!client) {
      logger.error('No SpectroCloud configuration found');
      return res.status(500).json({ error: 'No SpectroCloud configuration found' });
    }

    try {
      const ipPools = await client.getVSphereIPPools(overlordUid, projectUid);
      return res.json(ipPools);
    } catch (error) {
      logger.error(`Failed to get IP pools: ${error}`);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get IP pools' 
      });
    }
  });

  return router;
}
