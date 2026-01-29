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
    const { clusterName, namespace, rgdName, rgdId, instanceId, instanceName, crdName, kind, group, version } = req.query;

    logger.info(`/resources request: cluster=${clusterName}, ns=${namespace}, instance=${instanceName}, kind=${kind}, group=${group}, rgdName=${rgdName}, rgdId=${rgdId}`);

    // Support two modes:
    // 1. Direct lookup with rgdName and crdName (for top-level instances)
    // 2. Lookup by kind/group/version (for nested instances where we need to find the RGD)
    
    if (!clusterName || !namespace || !instanceId || !instanceName) {
      res.status(400).json({ error: 'Missing required parameters: clusterName, namespace, instanceId, instanceName' });
      return;
    }

    // If kind/group/version are provided, look up the RGD (for nested instances)
    let finalRgdName = rgdName as string;
    let finalCrdName = crdName as string;
    let finalRgdId = rgdId as string;

    if (kind && group && version && typeof kind === 'string' && typeof group === 'string' && typeof version === 'string') {
      try {
        // Fetch all RGDs and find the one matching this kind/group
        const rgdList = await kubernetesService.proxyKubernetesRequest(
          clusterName as string,
          '/apis/kro.run/v1alpha1/resourcegraphdefinitions',
        );

        const matchingRgd = rgdList.items?.find((rgd: any) => {
          const rgdGroup = rgd.spec?.schema?.group;
          const rgdKind = rgd.spec?.schema?.kind;
          return rgdGroup === group && rgdKind === kind;
        });

        if (matchingRgd) {
          finalRgdName = matchingRgd.metadata?.name;
          finalRgdId = matchingRgd.metadata?.uid || rgdId as string;
          // Pluralize the kind (simple approach)
          const kindLower = kind.toLowerCase();
          let plural = kindLower + 's';
          if (kindLower.endsWith('s')) plural = kindLower + 'es';
          if (kindLower.endsWith('y')) plural = kindLower.slice(0, -1) + 'ies';
          finalCrdName = group ? `${plural}.${group}` : crdName as string;
          logger.info(`Resolved nested RGD for kind=${kind}, group=${group}: name=${finalRgdName}, id=${finalRgdId}, crd=${finalCrdName}`);
        } else {
          logger.warn(`No RGD found for kind: ${kind}, group: ${group}`);
        }
      } catch (error) {
        logger.error('Failed to lookup RGD by kind/group:', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (!finalRgdName || !finalRgdId || !finalCrdName) {
      res.status(400).json({ error: 'Missing or could not resolve: rgdName, rgdId, crdName' });
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
        finalRgdName,
        finalRgdId,
        instanceId as string,
        instanceName as string,
        finalCrdName,
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