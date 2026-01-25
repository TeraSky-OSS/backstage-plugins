/**
 * SpectroCloud backend plugin for Backstage
 *
 * Provides HTTP API endpoints for frontend and MCP actions for AI agents.
 * 
 * For catalog entity ingestion, use the separate ingestor:
 * backend.add(import('@terasky/backstage-plugin-spectrocloud-ingestor'));
 *
 * @packageDocumentation
 */

export { spectroCloudPlugin as default } from './plugin';
export { spectroCloudPlugin } from './plugin';
export { createRouter } from './router';
export { SpectroCloudClient } from './client/SpectroCloudClient';
export { registerMcpActions } from './actions';
export type {
  SpectroCloudClientOptions,
  SpectroCloudCluster,
  SpectroCloudProject,
  SpectroCloudClusterProfile,
  ClusterProfileVersion,
  ClusterProfileTemplateRef,
} from './client/SpectroCloudClient';
