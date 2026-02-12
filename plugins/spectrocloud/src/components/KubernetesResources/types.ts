import { Entity } from '@backstage/catalog-model';

export interface FilterState {
  namespaces: string[];
  kubernetesKinds: string[]; // Actual K8s kinds: Deployment, MySQLInstance, etc.
  categories: string[]; // Workload, Crossplane Claim, KRO Instance, etc.
  entityKinds: string[]; // Component, Resource, System
  owner?: string;
  search: string;
}

export interface ResourceTableRow {
  id: string;
  name: string;
  entityKind: string; // Component/Resource/System
  kubernetesKind: string; // Deployment, MySQLInstance, etc.
  category: string; // Workload, Crossplane Claim, KRO Instance, etc.
  namespace: string;
  owner: string;
  status?: string;
  level: number; // 0 for namespace, 1 for resources
  parentId?: string;
  entity: Entity;
  hasChildren: boolean;
}

export interface HierarchyNode {
  entity: Entity;
  children: HierarchyNode[];
}

export interface GraphNode {
  id: string;
  type: 'custom';
  data: {
    name: string;
    kubernetesKind: string;
    category: string;
    status?: string;
    namespace: string;
    entity: Entity;
  };
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: React.CSSProperties;
  animated?: boolean;
  label?: string;
}

export const CATEGORIES = [
  'Workload',
  'Crossplane Claim',
  'Crossplane XR',
  'KRO Instance',
  'CRD',
  'Namespace',
] as const;

export type Category = typeof CATEGORIES[number];
