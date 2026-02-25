import { KubernetesObject } from '@backstage/plugin-kubernetes';

export interface CrossplaneResource extends KubernetesObject {
  apiVersion?: string;
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      reason?: string;
      lastTransitionTime?: string;
      message?: string;
    }>;
  };
  spec?: {
    compositionRef?: { name: string };
    compositionRevisionRef?: { name: string };
    compositionSelector?: { matchLabels: Record<string, string> };
    resourceRefs?: Array<any>;
    forProvider?: any;
    providerConfigRef?: { name?: string };
    package?: string;
    crossplane?: {
      resourceRefs?: Array<{
        apiVersion: string;
        kind: string;
        name: string;
        namespace?: string;
      }>;
      compositionRef?: { name: string };
      compositionSelector?: { matchLabels: Record<string, string> };
      composedTemplate?: any;
      composition?: any;
    };
  };
}

export interface CrossplaneEvent {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  involvedObject?: {
    kind?: string;
    name?: string;
    namespace?: string;
  };
  reason?: string;
  message?: string;
  type?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  count?: number;
}

export interface CrossplaneResourceTableRow {
  type: 'XRD' | 'Claim' | 'Resource';
  name: string;
  namespace?: string;
  group: string;
  kind: string;
  status: {
    synced: boolean;
    ready: boolean;
    conditions: any[];
  };
  createdAt: string;
  resource: CrossplaneResource;
  level: number;
  parentId?: string;
  isLastChild?: boolean;
}

export interface CrossplaneResourceListResponse {
  resources: CrossplaneResourceTableRow[];
  supportingResources: CrossplaneResource[];
}

export interface CrossplaneEventsResponse {
  events: CrossplaneEvent[];
}

export interface CrossplaneResourceGraphResponse {
  resources: CrossplaneResource[];
}

// API Request Types
export interface GetResourcesRequest {
  clusterName: string;
  namespace?: string;
  group: string;
  version: string;
  plural: string;
  name: string;
  kind?: string;
  claimName?: string;
  crdName?: string;
  xrdName?: string;
}

export interface GetEventsRequest {
  clusterName: string;
  namespace: string;
  resourceName: string;
  resourceKind: string;
}

export interface GetResourceGraphRequest {
  clusterName: string;
  namespace: string;
  xrdName: string;
  xrdId: string;
  claimId: string;
  claimName: string;
  claimGroup: string;
  claimVersion: string;
  claimPlural: string;
}

// V2-specific types
export interface GetV2ResourceGraphRequest {
  clusterName: string;
  namespace: string;
  name: string;
  group: string;
  version: string;
  plural: string;
  scope: 'Namespaced' | 'Cluster';
}

export interface ManagedResourceDefinitionNames {
  categories?: string[];
  kind: string;
  listKind?: string;
  plural: string;
  singular?: string;
}

export interface ManagedResourceDefinitionOwnerReference {
  apiVersion: string;
  blockOwnerDeletion?: boolean;
  controller?: boolean;
  kind: string;
  name: string;
  uid: string;
}

export interface ManagedResourceDefinitionSchemaProps {
  type?: string;
  description?: string;
  properties?: Record<string, ManagedResourceDefinitionSchemaProps>;
  items?: ManagedResourceDefinitionSchemaProps;
  required?: string[];
  [key: string]: any;
}

export interface ManagedResourceDefinitionVersion {
  name: string;
  served?: boolean;
  referenceable?: boolean;
  schema?: {
    openAPIV3Schema?: ManagedResourceDefinitionSchemaProps;
  };
}

export interface ManagedResourceDefinition {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    uid?: string;
    creationTimestamp?: string;
    generation?: number;
    resourceVersion?: string;
    ownerReferences?: ManagedResourceDefinitionOwnerReference[];
    annotations?: Record<string, string>;
  };
  spec: {
    group: string;
    names: ManagedResourceDefinitionNames;
    scope: 'Namespaced' | 'Cluster';
    state?: 'Active' | 'Inactive';
    versions?: ManagedResourceDefinitionVersion[];
  };
}

export interface ManagedResourceDefinitionListResponse {
  items: ManagedResourceDefinition[];
  namespacedCount: number;
  clusterScopedCount: number;
  activeCount: number;
  inactiveCount: number;
}

export interface GetManagedResourceDefinitionsRequest {
  clusterName: string;
  providerName?: string;
}

// API Routes
export const CROSSPLANE_BACKEND_ROUTES = {
  getResources: '/resources',
  getEvents: '/events',
  getResourceGraph: '/graph',
  getV2ResourceGraph: '/v2/graph',
  getManagedResourceDefinitions: '/managed-resource-definitions',
} as const;