
import { LoggerService, PermissionsService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';

export interface RouterOptions {
  logger: LoggerService;
  permissions: PermissionsService;
}
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger } = options;
  logger.info('Initializing Kro backend');
  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });
  return router;
}