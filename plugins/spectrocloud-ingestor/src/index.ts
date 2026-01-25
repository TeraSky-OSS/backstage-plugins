/**
 * SpectroCloud catalog ingestor module for Backstage
 *
 * Ingests SpectroCloud resources (projects, clusters, profiles) into the catalog.
 *
 * @packageDocumentation
 */

export { catalogModuleSpectroCloudIngestor as default } from './module';
export { catalogModuleSpectroCloudIngestor } from './module';
export { SpectroCloudEntityProvider } from './providers';
export { SpectroCloudClient } from './client/SpectroCloudClient';
export type {
  SpectroCloudClientOptions,
  SpectroCloudCluster,
  SpectroCloudProject,
  SpectroCloudClusterProfile,
  ClusterProfileVersion,
  ClusterProfileTemplateRef,
} from './client/SpectroCloudClient';

