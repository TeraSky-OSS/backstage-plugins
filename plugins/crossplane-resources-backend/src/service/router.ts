import express from 'express';
import Router from 'express-promise-router';
import { LoggerService, PermissionsService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { KubernetesService } from './KubernetesService';
import {
  listClaimsPermission,
  listCompositeResourcesPermission,
  listManagedResourcesPermission,
  showEventsClaimsPermission,
  showEventsCompositeResourcesPermission,
  showEventsManagedResourcesPermission,
} from '@terasky/backstage-plugin-crossplane-common';

export interface RouterOptions {
  logger: LoggerService;
  permissions: PermissionsService;
  discovery: DiscoveryService;
  auth: AuthService;
  kubernetesService: KubernetesService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { permissions, auth, kubernetesService } = options;
  const router = Router();
  router.use(express.json());

  router.post('/resources', async (req, res) => {
    const credentials = await auth.getOwnServiceCredentials();
    const authorized = await permissions.authorize(
      [
        { permission: listClaimsPermission },
        { permission: listCompositeResourcesPermission },
        { permission: listManagedResourcesPermission },
      ],
      { credentials }
    );

    if (authorized.some(a => a.result !== 'ALLOW')) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const resources = await kubernetesService.getResources(req.body);
    res.json(resources);
  });

  router.get('/events', async (req, res) => {
    const credentials = await auth.getOwnServiceCredentials();
    const authorized = await permissions.authorize(
      [
        { permission: showEventsClaimsPermission },
        { permission: showEventsCompositeResourcesPermission },
        { permission: showEventsManagedResourcesPermission },
      ],
      { credentials }
    );

    if (authorized.some(a => a.result !== 'ALLOW')) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { clusterName, namespace, resourceName, resourceKind } = req.query;
    if (!clusterName || !namespace || !resourceName || !resourceKind ||
        typeof clusterName !== 'string' || typeof namespace !== 'string' ||
        typeof resourceName !== 'string' || typeof resourceKind !== 'string') {
      res.status(400).json({ error: 'Missing required query parameters' });
      return;
    }

    const events = await kubernetesService.getEvents({
      clusterName,
      namespace,
      resourceName,
      resourceKind,
    });
    res.json(events);
  });

  router.get('/graph', async (req, res) => {
    const credentials = await auth.getOwnServiceCredentials();
    const authorized = await permissions.authorize(
      [
        { permission: listClaimsPermission },
        { permission: listCompositeResourcesPermission },
        { permission: listManagedResourcesPermission },
      ],
      { credentials }
    );

    if (authorized.some(a => a.result !== 'ALLOW')) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { 
      clusterName, 
      namespace, 
      xrdName, 
      xrdId, 
      claimId, 
      claimName,
      claimGroup,
      claimVersion,
      claimPlural,
    } = req.query;
    if (!clusterName || !namespace || !xrdName || !xrdId || !claimId || !claimName ||
        !claimGroup || !claimVersion || !claimPlural ||
        typeof clusterName !== 'string' || typeof namespace !== 'string' ||
        typeof xrdName !== 'string' || typeof xrdId !== 'string' ||
        typeof claimId !== 'string' || typeof claimName !== 'string' ||
        typeof claimGroup !== 'string' || typeof claimVersion !== 'string' ||
        typeof claimPlural !== 'string') {
      res.status(400).json({ error: 'Missing required query parameters' });
      return;
    }

    const graph = await kubernetesService.getResourceGraph({
      clusterName,
      namespace,
      xrdName,
      xrdId,
      claimId,
      claimName,
      claimGroup,
      claimVersion,
      claimPlural,
    });
    res.json(graph);
  });

  router.get('/v2/graph', async (req, res) => {
    const credentials = await auth.getOwnServiceCredentials();
    const authorized = await permissions.authorize(
      [
        { permission: listCompositeResourcesPermission },
        { permission: listManagedResourcesPermission },
      ],
      { credentials }
    );

    if (authorized.some(a => a.result !== 'ALLOW')) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { 
      clusterName, 
      namespace, 
      name,
      group,
      version,
      plural,
      scope,
    } = req.query;
    if (!clusterName || !namespace || !name || !group || !version || !plural || !scope ||
        typeof clusterName !== 'string' || typeof namespace !== 'string' ||
        typeof name !== 'string' || typeof group !== 'string' ||
        typeof version !== 'string' || typeof plural !== 'string' ||
        typeof scope !== 'string' ||
        !['Namespaced', 'Cluster'].includes(scope)) {
      res.status(400).json({ error: 'Missing required query parameters' });
      return;
    }

    const graph = await kubernetesService.getV2ResourceGraph({
      clusterName,
      namespace,
      name,
      group,
      version,
      plural,
      scope: scope as 'Namespaced' | 'Cluster',
    });
    res.json(graph);
  });

  return router;
}