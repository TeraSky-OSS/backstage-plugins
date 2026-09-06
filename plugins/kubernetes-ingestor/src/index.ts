export { catalogModuleKubernetesIngestor as default } from './module';
export { KubernetesEntityProvider, XRDTemplateEntityProvider } from './providers';
export type { DeltaEvent } from './providers';
export type { KubernetesResourceFetcher, KubernetesResourceFetcherOptions } from './types';
export { kubernetesIngestorExtensionPoint } from './extensions';
export type { KubernetesIngestorExtensionPoint } from './extensions';
export type {
  KubernetesResourceFilter,
  KubernetesResourceFilterContext,
  KubernetesResourceFilterInput,
} from './types';
