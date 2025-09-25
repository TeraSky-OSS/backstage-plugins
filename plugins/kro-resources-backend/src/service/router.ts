import { LoggerService, PermissionsService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { KubernetesService } from './KubernetesService';
import {
  listInstancesPermission,
  listRGDsPermission,
  listResourcesPermission,
  showEventsInstancesPermission,
  showEventsRGDsPermission,
  showEventsResourcesPermission,
  showResourceGraph,
} from '@terasky/backstage-plugin-kro-common';

export interface RouterOptions {
  logger: LoggerService;
  permissions: PermissionsService;
  discovery: DiscoveryService;
  auth: AuthService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, permissions, discovery, auth } = options;
  const kubernetesService = new KubernetesService(logger, discovery, auth);

  logger.info('Initializing Kro backend');
  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/resources', async (req, res) => {
    const { clusterName, namespace, rgdName, rgdId, instanceId, instanceName, crdName } = req.query;

    if (!clusterName || !namespace || !rgdName || !rgdId || !instanceId || !instanceName || !crdName) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const credentials = await auth.getOwnServiceCredentials();
      // Check permissions
      const [canListInstances, canListRGDs, canListResources] = await Promise.all([
        permissions.authorize([{ permission: listInstancesPermission }], { credentials }),
        permissions.authorize([{ permission: listRGDsPermission }], { credentials }),
        permissions.authorize([{ permission: listResourcesPermission }], { credentials }),
      ]);

      if (!canListInstances[0].result && !canListRGDs[0].result && !canListResources[0].result) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const result = await kubernetesService.getResources(
        clusterName as string,
        namespace as string,
        rgdName as string,
        rgdId as string,
        instanceId as string,
        instanceName as string,
        crdName as string,
      );

      res.json(result);
    } catch (error) {
      logger.error('Failed to fetch resources:', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  });

  router.get('/events', async (req, res) => {
    const { clusterName, namespace, resourceName, resourceKind } = req.query;

    if (!clusterName || !namespace || !resourceName || !resourceKind) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const credentials = await auth.getOwnServiceCredentials();
      // Check permissions based on resource kind
      let permission;
      switch (resourceKind) {
        case 'ResourceGraphDefinition':
          permission = showEventsRGDsPermission;
          break;
        case 'Application':
          permission = showEventsInstancesPermission;
          break;
        default:
          permission = showEventsResourcesPermission;
      }

      const authorized = await permissions.authorize([{ permission }], { credentials });
      if (!authorized[0].result) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const events = await kubernetesService.getEvents(
        clusterName as string,
        namespace as string,
        resourceName as string,
        resourceKind as string,
      );

      res.json({ events });
    } catch (error) {
      logger.error('Failed to fetch events:', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  router.get('/graph', async (req, res) => {
    const { clusterName, namespace, rgdName, rgdId, instanceId, instanceName } = req.query;

    if (!clusterName || !namespace || !rgdName || !rgdId || !instanceId || !instanceName) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const credentials = await auth.getOwnServiceCredentials();
      // Check permissions
      const authorized = await permissions.authorize([{ permission: showResourceGraph }], { credentials });
      if (!authorized[0].result) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const resources = await kubernetesService.getResourceGraph(
        clusterName as string,
        namespace as string,
        rgdName as string,
        rgdId as string,
        instanceId as string,
        instanceName as string,
      );

      res.json({ resources });
    } catch (error) {
      logger.error('Failed to fetch resource graph:', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: 'Failed to fetch resource graph' });
    }
  });

  return router;
}