import { KubernetesObject } from '@backstage/plugin-kubernetes';

export interface KroResource extends KubernetesObject {
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
    crossplane?: {
      resourceRefs?: Array<any>;
    };
    forProvider?: any;
    providerConfigRef?: { name?: string };
    package?: string;
  };
}

export interface KroEvent {
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

export interface KroResourceTableRow {
  type: 'RGD' | 'Instance' | 'Resource';
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
  resource: KroResource;
  level: number;
  parentId?: string;
  isLastChild?: boolean;
  isExternal?: boolean; // Indicates if this is an external reference
}

export interface KroResourceListResponse {
  resources: KroResourceTableRow[];
  supportingResources: KroResource[];
}

export interface KroEventsResponse {
  events: KroEvent[];
}

export interface KroResourceGraphResponse {
  resources: KroResource[];
}

// API Request Types
export interface GetResourcesRequest {
  clusterName: string;
  namespace: string;
  rgdName?: string; // Optional for nested instances (will be looked up by kind/group/version)
  rgdId?: string;
  instanceId: string;
  instanceName: string;
  crdName?: string; // Optional for nested instances (will be looked up by kind/group/version)
  // New fields for nested instance lookup
  kind?: string;
  group?: string;
  version?: string;
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
  rgdName: string;
  rgdId: string;
  instanceId: string;
  instanceName: string;
}

// API Routes
export const KRO_BACKEND_ROUTES = {
  getResources: '/api/kro/resources',
  getEvents: '/api/kro/events',
  getResourceGraph: '/api/kro/graph',
} as const;
