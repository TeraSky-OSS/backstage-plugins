import { Config } from '@backstage/config';
import express from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { LoggerService, PermissionsService, HttpAuthService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { viewMetricsPermission } from '@terasky/backstage-plugin-vcf-operations-common';
import { VcfOperationsService } from './services/VcfOperationsService';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  permissions: PermissionsService;
  httpAuth: HttpAuthService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, permissions, httpAuth } = options;

  // eslint-disable-next-line new-cap
  const router = express.Router();
  router.use(express.json());

  // Every route below proxies to VCF Operations, so cap how often a single
  // user can hit them. Keyed by user so users behind a shared proxy are not
  // throttled together.
  router.use(
    rateLimit({
      windowMs:
        config.getOptionalNumber('vcfOperations.rateLimit.windowMs') ?? 60_000,
      limit: config.getOptionalNumber('vcfOperations.rateLimit.max') ?? 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: req => req.path === '/health',
      keyGenerator: async req => {
        try {
          const credentials = await httpAuth.credentials(req, { allow: ['user'] });
          return credentials.principal.userEntityRef;
        } catch {
          return ipKeyGenerator(req.ip ?? '');
        }
      },
    }),
  );

  const vcfOperationsService = new VcfOperationsService(config, logger);

  // Helper function to check permissions
  const checkPermission = async (req: express.Request, res: express.Response): Promise<boolean> => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const decision = await permissions.authorize(
        [{ permission: viewMetricsPermission }],
        { credentials }
      );

      if (decision[0].result !== AuthorizeResult.ALLOW) {
        res.status(403).json({ 
          error: 'Access denied. You do not have permission to view VCF Operations metrics.' 
        });
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Error checking permissions', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Permission check failed' });
      return false;
    }
  };

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  // Get VCF Operations instances
  router.get('/instances', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const instances = vcfOperationsService.getInstances();
      res.json(instances);
    } catch (error) {
      logger.error('Error getting instances', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to get instances' });
    }
  });

  // Get metrics for a specific resource
  router.get('/resources/:resourceId/metrics', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { resourceId } = req.params;
      const { statKeys, begin, end, rollUpType, instance } = req.query;
      
      logger.info(`Getting metrics for resource: ${resourceId}`, {
        statKeys,
        begin,
        end,
        rollUpType,
        instance,
      });
      
      if (!statKeys) {
        res.status(400).json({ error: 'statKeys parameter is required' });
        return;
      }

      const statKeysArray = Array.isArray(statKeys) ? statKeys : [statKeys];
      
      const metrics = await vcfOperationsService.getResourceMetrics(
        resourceId,
        statKeysArray as string[],
        begin ? parseInt(begin as string, 10) : undefined,
        end ? parseInt(end as string, 10) : undefined,
        rollUpType as string,
        instance as string,
      );
      
      logger.info(`Metrics retrieved successfully for resource: ${resourceId}`, {
        metricsCount: metrics.values?.length || 0,
      });
      
      res.json(metrics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error getting resource metrics for ${req.params.resourceId}`, {
        error: errorMessage,
        statKeys: req.query.statKeys,
        instance: req.query.instance,
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ 
        error: 'Failed to get resource metrics',
        details: errorMessage,
      });
    }
  });

  // Query metrics for multiple resources
  router.post('/metrics/query', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { instance } = req.query;
      const queryRequest = req.body;
      
      if (!queryRequest.resourceIds || !queryRequest.statKeys) {
        res.status(400).json({ 
          error: 'resourceIds and statKeys are required in the request body' 
        });
        return;
      }
      
      const metrics = await vcfOperationsService.queryResourceMetrics(
        queryRequest,
        instance as string,
      );
      
      res.json(metrics);
    } catch (error) {
      logger.error('Error querying metrics', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to query metrics' });
    }
  });

  // Get latest metrics for resources
  router.get('/metrics/latest', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { resourceIds, statKeys, instance } = req.query;
      
      if (!resourceIds || !statKeys) {
        res.status(400).json({ 
          error: 'resourceIds and statKeys parameters are required' 
        });
        return;
      }

      const resourceIdsArray = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
      const statKeysArray = Array.isArray(statKeys) ? statKeys : [statKeys];
      
      const metrics = await vcfOperationsService.getLatestResourceMetrics(
        resourceIdsArray as string[],
        statKeysArray as string[],
        instance as string,
      );
      
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting latest metrics', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to get latest metrics' });
    }
  });

  // Find resource by property (must come before /:resourceId route)
  router.get('/resources/find-by-property', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { propertyKey, propertyValue, instance } = req.query;
      
      if (!propertyKey || !propertyValue) {
        res.status(400).json({ 
          error: 'propertyKey and propertyValue parameters are required' 
        });
        return;
      }
      
      const resource = await vcfOperationsService.findResourceByProperty(
        propertyKey as string,
        propertyValue as string,
        instance as string,
      );
      
      res.json(resource);
    } catch (error) {
      logger.error('Error finding resource by property', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to find resource by property' });
    }
  });

  // Find resource by name (must come before /:resourceId route)
  router.get('/resources/find-by-name', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { resourceName, instance, resourceType } = req.query;
      
      logger.info(`Finding resource by name: ${resourceName}, instance: ${instance}, type: ${resourceType}`);
      
      if (!resourceName) {
        res.status(400).json({ 
          error: 'resourceName parameter is required' 
        });
        return;
      }
      
      const resource = await vcfOperationsService.findResourceByName(
        resourceName as string,
        instance as string,
        resourceType as string,
      );
      
      if (resource) {
        logger.info(`Resource found: ${resource.identifier}, type: ${resource.resourceKey?.resourceKindKey}`);
        
        // Log resource details for debugging
        logger.debug(`Resource details:`, {
          identifier: resource.identifier,
          name: resource.resourceKey?.name,
          adapterKind: resource.resourceKey?.adapterKindKey,
          resourceKind: resource.resourceKey?.resourceKindKey,
        });
        
        res.json(resource);
      } else {
        logger.info(`No resource found with name: ${resourceName}`);
        res.json(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error finding resource by name: ${req.query.resourceName}`, {
        error: errorMessage,
        instance: req.query.instance,
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ 
        error: 'Failed to find resource by name',
        details: errorMessage,
      });
    }
  });

  // Query resources with advanced filters
  router.post('/resources/query', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { instance } = req.query;
      const queryRequest = req.body;
      
      const resources = await vcfOperationsService.queryResources(
        queryRequest,
        instance as string,
      );
      
      res.json(resources);
    } catch (error) {
      logger.error('Error querying resources', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to query resources' });
    }
  });

  // Get available metrics for a resource
  router.get('/resources/:resourceId/available-metrics', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { resourceId } = req.params;
      const { instance } = req.query;
      
      const metrics = await vcfOperationsService.getAvailableMetrics(
        resourceId,
        instance as string,
      );
      
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting available metrics', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to get available metrics' });
    }
  });

  // Get resource details (must come after specific routes)
  router.get('/resources/:resourceId', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { resourceId } = req.params;
      const { instance } = req.query;
      
      const resource = await vcfOperationsService.getResourceDetails(
        resourceId,
        instance as string,
      );
      
      res.json(resource);
    } catch (error) {
      logger.error('Error getting resource details', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to get resource details' });
    }
  });

  // Query project resources using VCF Operations query format
  router.post('/resources/query-projects', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { instance } = req.query;
      const queryRequest = req.body;
      
      logger.info(`Querying project resources with request:`, queryRequest);
      
      const result = await vcfOperationsService.queryProjectResources(
        queryRequest,
        instance as string,
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error querying project resources', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to query project resources' });
    }
  });

  // Search resources (must come last as it's the most general)
  router.get('/resources', async (req, res) => {
    if (!(await checkPermission(req, res))) return;
    
    try {
      const { name, adapterKind, resourceKind, instance } = req.query;
      
      const resources = await vcfOperationsService.searchResources(
        name as string,
        adapterKind as string,
        resourceKind as string,
        instance as string,
      );
      
      res.json(resources);
    } catch (error) {
      logger.error('Error searching resources', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: 'Failed to search resources' });
    }
  });

  return router;
}