import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { KubernetesResourceFilter } from './types';

/**
 * Extension point for narrowing what the ingestor puts in the catalog.
 *
 * The configuration options cover the two common cases — a namespace list and an
 * annotation on the object itself — but neither reaches resources that are spread
 * across every namespace and deployed from charts the adopter does not own. A filter
 * is code, so it can decide on any part of the resource: name, labels, owner
 * references, whatever the installation needs.
 */
export interface KubernetesIngestorExtensionPoint {
  /** Registers one or more filters. All of them must pass for a resource to be ingested. */
  addResourceFilter(...filters: KubernetesResourceFilter[]): void;
}

export const kubernetesIngestorExtensionPoint =
  createExtensionPoint<KubernetesIngestorExtensionPoint>({
    id: 'kubernetes-ingestor',
  });
