import { Config } from '@backstage/config';
import express from 'express';
import { LoggerService, PermissionsService } from '@backstage/backend-plugin-api';
import { VcfAutomationService } from './services/VcfAutomationService';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  permissions: PermissionsService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = express.Router();
  router.use(express.json());

  const vcfService = new VcfAutomationService(config, logger);

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  router.get('/deployments/:deploymentId/history', async (req, res) => {
    const { deploymentId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const history = await vcfService.getDeploymentHistory(deploymentId, instanceName);
    res.json(history);
  });

  router.get('/deployments/:deploymentId/events', async (req, res) => {
    const { deploymentId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const events = await vcfService.getDeploymentEvents(deploymentId, instanceName);
    res.json(events);
  });

  router.get('/deployments/:deploymentId/resources/:resourceId', async (req, res) => {
    const { deploymentId, resourceId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const resource = await vcfService.getResourceDetails(deploymentId, resourceId, instanceName);
    res.json(resource);
  });

  router.get('/projects/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const project = await vcfService.getProjectDetails(projectId, instanceName);
    res.json(project);
  });

  router.get('/deployments/:deploymentId', async (req, res) => {
    const { deploymentId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const deployment = await vcfService.getDeploymentDetails(deploymentId, instanceName);
    res.json(deployment);
  });

  router.get('/projects', async (req, res) => {
    const instanceName = req.query.instance as string | undefined;
    const projects = await vcfService.getProjects(instanceName);
    res.json(projects);
  });

  router.get('/deployments', async (req, res) => {
    const instanceName = req.query.instance as string | undefined;
    const deployments = await vcfService.getDeployments(instanceName);
    res.json(deployments);
  });

  router.get('/deployments/:deploymentId/resources', async (req, res) => {
    const { deploymentId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const resources = await vcfService.getDeploymentResources(deploymentId, instanceName);
    res.json(resources);
  });

  router.get('/supervisor-resources', async (req, res) => {
    const instanceName = req.query.instance as string | undefined;
    const resources = await vcfService.getSupervisorResources(instanceName);
    res.json(resources);
  });

  router.get('/supervisor-resources/:resourceId', async (req, res) => {
    const { resourceId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const resource = await vcfService.getSupervisorResource(resourceId, instanceName);
    res.json(resource);
  });

  router.get('/supervisor-namespaces', async (req, res) => {
    const instanceName = req.query.instance as string | undefined;
    const namespaces = await vcfService.getSupervisorNamespaces(instanceName);
    res.json(namespaces);
  });

  router.get('/supervisor-namespaces/:namespaceId', async (req, res) => {
    const { namespaceId } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const namespace = await vcfService.getSupervisorNamespace(namespaceId, instanceName);
    res.json(namespace);
  });

  // VM Power Management for deployment-managed VMs
  router.get('/resources/:resourceId/power-actions/:action', async (req, res) => {
    const { resourceId, action } = req.params;
    const instanceName = req.query.instance as string | undefined;
    
    if (action !== 'PowerOn' && action !== 'PowerOff') {
      return res.status(400).json({ error: 'Invalid action. Must be PowerOn or PowerOff' });
    }
    
    const result = await vcfService.checkVmPowerAction(resourceId, action as 'PowerOn' | 'PowerOff', instanceName);
    return res.json(result);
  });

  router.post('/resources/:resourceId/power-actions/:action', async (req, res) => {
    const { resourceId, action } = req.params;
    const instanceName = req.query.instance as string | undefined;
    
    if (action !== 'PowerOn' && action !== 'PowerOff') {
      return res.status(400).json({ error: 'Invalid action. Must be PowerOn or PowerOff' });
    }
    
    const result = await vcfService.executeVmPowerAction(resourceId, action as 'PowerOn' | 'PowerOff', instanceName);
    return res.json(result);
  });

  // VM Power Management for standalone VMs
  router.get('/standalone-vms/:namespaceUrnId/:namespaceName/:vmName/status', async (req, res) => {
    const { namespaceUrnId, namespaceName, vmName } = req.params;
    const instanceName = req.query.instance as string | undefined;
    
    const result = await vcfService.getStandaloneVmStatus(namespaceUrnId, namespaceName, vmName, instanceName);
    return res.json(result);
  });

  router.put('/standalone-vms/:namespaceUrnId/:namespaceName/:vmName/power-state', async (req, res) => {
    const { namespaceUrnId, namespaceName, vmName } = req.params;
    const { powerState, vmData } = req.body;
    const instanceName = req.query.instance as string | undefined;
    
    if (powerState !== 'PoweredOn' && powerState !== 'PoweredOff') {
      return res.status(400).json({ error: 'Invalid powerState. Must be PoweredOn or PoweredOff' });
    }
    
    if (!vmData) {
      return res.status(400).json({ error: 'vmData is required' });
    }
    
    const result = await vcfService.executeStandaloneVmPowerAction(namespaceUrnId, namespaceName, vmName, powerState, vmData, instanceName);
    return res.json(result);
  });

  // Supervisor Resource Manifest Management
  router.get('/supervisor-resource-manifest/:namespaceUrnId/:namespaceName/:resourceName', async (req, res) => {
    const { namespaceUrnId, namespaceName, resourceName } = req.params;
    const instanceName = req.query.instance as string | undefined;
    const apiVersion = req.query.apiVersion as string | undefined;
    const kind = req.query.kind as string | undefined;
    
    if (!apiVersion || !kind) {
      return res.status(400).json({ error: 'apiVersion and kind query parameters are required' });
    }
    
    const result = await vcfService.getSupervisorResourceManifest(namespaceUrnId, namespaceName, resourceName, apiVersion, kind, instanceName);
    return res.json(result);
  });

  router.put('/supervisor-resource-manifest/:namespaceUrnId/:namespaceName/:resourceName', async (req, res) => {
    const { namespaceUrnId, namespaceName, resourceName } = req.params;
    const { manifest } = req.body;
    const instanceName = req.query.instance as string | undefined;
    const apiVersion = req.query.apiVersion as string | undefined;
    const kind = req.query.kind as string | undefined;
    
    if (!manifest) {
      return res.status(400).json({ error: 'manifest is required' });
    }
    
    if (!apiVersion || !kind) {
      return res.status(400).json({ error: 'apiVersion and kind query parameters are required' });
    }
    
    const result = await vcfService.updateSupervisorResourceManifest(namespaceUrnId, namespaceName, resourceName, apiVersion, kind, manifest, instanceName);
    return res.json(result);
  });

  return router;
}
