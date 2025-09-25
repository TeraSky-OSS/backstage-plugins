import express from 'express';
import Router from 'express-promise-router';
import { LoggerService, PermissionsService, DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { KubernetesService } from './KubernetesService';
import { showKyvernoReportsPermission, viewPolicyYAMLPermission } from '@terasky/backstage-plugin-kyverno-common';

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

  router.post('/reports', async (req, res) => {
    const credentials = await auth.getOwnServiceCredentials();
    const authorized = await permissions.authorize(
      [{ permission: showKyvernoReportsPermission }],
      { credentials }
    );

    if (authorized[0].result !== 'ALLOW') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const reports = await kubernetesService.getPolicyReports(req.body);
    res.json({ items: reports });
  });

  router.get('/policy', async (req, res) => {
    const credentials = await auth.getOwnServiceCredentials();
    const authorized = await permissions.authorize(
      [{ permission: viewPolicyYAMLPermission }],
      { credentials }
    );

    if (authorized[0].result !== 'ALLOW') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { clusterName, namespace, policyName } = req.query;
    if (!clusterName || !policyName || typeof clusterName !== 'string' || typeof policyName !== 'string') {
      res.status(400).json({ error: 'Missing required query parameters' });
      return;
    }

    const policy = await kubernetesService.getPolicy(
      clusterName,
      namespace as string | undefined,
      policyName,
    );
    res.json({ policy });
  });

  return router;
}