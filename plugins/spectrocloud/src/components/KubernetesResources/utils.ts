import { Entity } from '@backstage/catalog-model';
import { CatalogApi } from '@backstage/catalog-client';
import { FilterState, HierarchyNode, ResourceTableRow } from './types';

/**
 * Extract cluster name from entity annotations/tags
 * For a SpectroCloud cluster entity itself, returns its title/name
 * For other entities, looks for cluster reference in annotations/tags
 */
export const getClusterName = (entity: Entity, _annotationPrefix: string): string | undefined => {
  // If this is a SpectroCloud cluster entity itself, return its name
  if (entity.spec?.type === 'spectrocloud-cluster') {
    return entity.metadata.title || entity.metadata.name;
  }

  // Try annotation first
  const clusterAnnotation = entity.metadata.annotations?.['backstage.io/kubernetes-cluster'];
  if (clusterAnnotation) {
    return clusterAnnotation;
  }

  // Try tags
  const tags = entity.metadata.tags || [];
  const clusterTag = tags.find(tag => tag.startsWith('cluster:'));
  if (clusterTag) {
    return clusterTag.replace('cluster:', '');
  }

  return undefined;
};

/**
 * Query catalog for related entities by cluster name
 */
export const fetchRelatedEntities = async (
  catalogApi: CatalogApi,
  clusterName: string,
): Promise<Entity[]> => {
  // Query by annotation
  const { items: annotatedItems } = await catalogApi.getEntities({
    filter: {
      'metadata.annotations.backstage.io/kubernetes-cluster': clusterName,
    },
  });

  // Query by tag as fallback
  const { items: taggedItems } = await catalogApi.getEntities({
    filter: {
      'metadata.tags': `cluster:${clusterName}`,
    },
  });

  // Merge and deduplicate by UID
  const entityMap = new Map<string, Entity>();
  [...annotatedItems, ...taggedItems].forEach(entity => {
    entityMap.set(entity.metadata.uid!, entity);
  });

  return Array.from(entityMap.values());
};

/**
 * Get the actual Kubernetes kind from entity
 * Examples: "Deployment", "LegacyAppClaim", "ClusterApp", "WorkerPool", "Namespace"
 */
export const getKubernetesKind = (entity: Entity, annotationPrefix: string): string => {
  const annotations = entity.metadata.annotations || {};
  const specType = entity.spec?.type as string;

  // For Crossplane Claims - check claim-kind annotation
  if (specType === 'crossplane-claim') {
    const claimKind = annotations[`${annotationPrefix}/claim-kind`];
    if (claimKind) return claimKind;
  }

  // For Crossplane Composites (XRs) - check composite-kind annotation
  if (specType === 'crossplane-xr') {
    const compositeKind = annotations[`${annotationPrefix}/composite-kind`];
    if (compositeKind) return compositeKind;
  }

  // For KRO instances - check kro-rgd-name annotation or derive from CRD name
  if (specType === 'kro-instance') {
    const rgdName = annotations[`${annotationPrefix}/kro-rgd-name`];
    if (rgdName) {
      // Convert kebab-case to PascalCase: "worker-pool" -> "WorkerPool"
      return rgdName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    }
    const crdName = annotations[`${annotationPrefix}/kro-rgd-crd-name`];
    if (crdName) {
      // Extract kind from CRD name: "workerpools.kro.run" -> "WorkerPool"
      const kind = crdName.split('.')[0];
      // Remove plural 's' and capitalize
      const singular = kind.endsWith('s') ? kind.slice(0, -1) : kind;
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
  }

  // For regular Kubernetes resources - check kubernetes-resource-kind annotation
  if (specType === 'service' || !specType || specType.startsWith('kubernetes-')) {
    const resourceKind = annotations[`${annotationPrefix}/kubernetes-resource-kind`];
    if (resourceKind) return resourceKind;
  }

  // For namespaces
  if (specType === 'kubernetes-namespace') {
    return 'Namespace';
  }

  // Fallback to generic extraction from spec.type
  if (specType) {
    // Remove prefixes like "kubernetes-", "crossplane-", "kro-"
    const withoutPrefix = specType.replace(/^(kubernetes|crossplane|kro)-/, '');
    return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
  }

  return 'Unknown';
};

/**
 * Categorize resource by type based on spec.type
 */
export const getResourceCategory = (entity: Entity, annotationPrefix: string): string => {
  const specType = entity.spec?.type as string || '';
  const annotations = entity.metadata.annotations || {};

  // Direct mapping from spec.type
  if (specType === 'crossplane-claim') {
    return 'Crossplane Claim';
  }
  if (specType === 'crossplane-xr') {
    return 'Crossplane XR';
  }
  if (specType === 'kro-instance') {
    return 'KRO Instance';
  }
  if (specType === 'kubernetes-namespace') {
    return 'Namespace';
  }

  // For spec.type === 'service', determine if it's a native workload
  if (specType === 'service') {
    const k8sKind = annotations[`${annotationPrefix}/kubernetes-resource-kind`];
    if (k8sKind) {
      const lowerKind = k8sKind.toLowerCase();
      if (['deployment', 'statefulset', 'daemonset', 'cronjob', 'job', 'replicaset', 'pod'].includes(lowerKind)) {
        return 'Workload';
      }
    }
  }

  // Check component-type annotation as fallback
  const componentType = annotations[`${annotationPrefix}/component-type`];
  if (componentType === 'crossplane-claim') return 'Crossplane Claim';
  if (componentType === 'crossplane-xr') return 'Crossplane XR';
  if (componentType === 'kro-instance') return 'KRO Instance';

  // Default to CRD for anything else
  return 'CRD';
};

/**
 * Get resource type from entity (legacy compatibility)
 */
export const getResourceType = (entity: Entity): string => {
  return entity.spec?.type as string || 'unknown';
};

/**
 * Get status from entity (check Kubernetes plugin annotations)
 */
export const getEntityStatus = (entity: Entity): string | undefined => {
  const annotations = entity.metadata.annotations || {};
  
  // Check various status annotations
  if (annotations['backstage.io/kubernetes-status']) {
    return annotations['backstage.io/kubernetes-status'];
  }
  
  // Check for common status patterns in annotations
  const statusKeys = Object.keys(annotations).filter(key => 
    key.toLowerCase().includes('status')
  );
  
  if (statusKeys.length > 0) {
    return annotations[statusKeys[0]];
  }

  return undefined;
};

/**
 * Extract all unique Kubernetes kinds from entity list
 */
export const extractUniqueKinds = (entities: Entity[], annotationPrefix: string): string[] => {
  const kinds = new Set<string>();
  entities.forEach(entity => {
    const kind = getKubernetesKind(entity, annotationPrefix);
    if (kind !== 'Unknown') {
      kinds.add(kind);
    }
  });
  return Array.from(kinds).sort();
};

/**
 * Extract all unique namespaces from entity list
 */
export const extractUniqueNamespaces = (entities: Entity[], annotationPrefix: string): string[] => {
  const namespaces = new Set<string>();
  entities.forEach(entity => {
    const namespace = getEntityNamespace(entity, annotationPrefix);
    if (namespace) {
      namespaces.add(namespace);
    }
  });
  return Array.from(namespaces).sort();
};

/**
 * Extract all unique owners from entity list
 */
export const extractUniqueOwners = (entities: Entity[]): string[] => {
  const owners = new Set<string>();
  entities.forEach(entity => {
    const owner = getEntityOwner(entity);
    if (owner) {
      owners.add(owner);
    }
  });
  return Array.from(owners).sort();
};

/**
 * Get Kubernetes namespace from entity annotations
 * The Backstage entity namespace (metadata.namespace) is NOT the same as the K8s namespace
 */
export const getEntityNamespace = (entity: Entity, annotationPrefix: string): string => {
  const annotations = entity.metadata.annotations || {};
  const specType = entity.spec?.type as string || '';

  // For namespaces themselves, extract from entity name
  // Entity name format: "cluster-name-namespace-name", e.g., "kubestage-demo-01-default"
  if (specType === 'kubernetes-namespace') {
    const name = entity.metadata.name;
    // Extract namespace name from entity name (last part after cluster prefix)
    const parts = name.split('-');
    // Typically format is: clustername-namespacename or cluster-name-namespace
    // Try to extract the actual namespace name
    // If entity has a title, that's usually the k8s namespace name
    if (entity.metadata.title) {
      return entity.metadata.title;
    }
    // Otherwise try to parse from name - take last part
    return parts[parts.length - 1];
  }

  // Primary source: backstage.io/kubernetes-namespace annotation (added by ingestor)
  if (annotations['backstage.io/kubernetes-namespace']) {
    return annotations['backstage.io/kubernetes-namespace'];
  }

  // For Crossplane Claims - check claim namespace (if cluster-scoped, might not have one)
  if (specType === 'crossplane-claim') {
    const claimNamespace = annotations[`${annotationPrefix}/claim-namespace`];
    if (claimNamespace) return claimNamespace;
  }

  // For Crossplane Composites (XRs) - check composite namespace (might be cluster-scoped)
  if (specType === 'crossplane-xr') {
    const compositeNamespace = annotations[`${annotationPrefix}/composite-namespace`];
    if (compositeNamespace) return compositeNamespace;
    // Cluster-scoped composites don't have a namespace
    const scope = annotations[`${annotationPrefix}/crossplane-scope`];
    if (scope === 'Cluster') return '-'; // Cluster-scoped indicator
  }

  // For KRO instances - check kro-instance-namespace annotation
  if (specType === 'kro-instance') {
    const kroNamespace = annotations[`${annotationPrefix}/kro-instance-namespace`];
    if (kroNamespace) return kroNamespace;
  }

  // For regular Kubernetes resources - check kubernetes-resource-namespace annotation
  const resourceNamespace = annotations[`${annotationPrefix}/kubernetes-resource-namespace`];
  if (resourceNamespace) return resourceNamespace;

  // Default to "default" namespace
  return 'default';
};

/**
 * Get entity owner
 */
export const getEntityOwner = (entity: Entity): string => {
  const owner = entity.spec?.owner as string;
  if (owner) {
    // Remove 'group:' or 'user:' prefix if present
    return owner.replace(/^(group|user):/, '');
  }
  return 'unknown';
};

/**
 * Group kinds by category for filter dropdown
 */
export const groupKindsByCategory = (
  kinds: string[],
  entities: Entity[],
  annotationPrefix: string,
): Map<string, string[]> => {
  const groups = new Map<string, string[]>();

  kinds.forEach(kind => {
    // Find an entity with this kind to determine its category
    const entity = entities.find(e => getKubernetesKind(e, annotationPrefix) === kind);
    if (entity) {
      const category = getResourceCategory(entity, annotationPrefix);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(kind);
    }
  });

  return groups;
};

/**
 * Check if entity is a namespace
 */
export const isNamespaceEntity = (entity: Entity, _annotationPrefix: string): boolean => {
  const specType = entity.spec?.type as string || '';
  return specType === 'kubernetes-namespace';
};

/**
 * Build namespace hierarchy from entities
 */
export const buildHierarchy = (entities: Entity[], annotationPrefix: string): HierarchyNode[] => {
  // Separate namespaces from other resources
  const namespaceEntities = entities.filter(e => isNamespaceEntity(e, annotationPrefix));
  const resourceEntities = entities.filter(e => !isNamespaceEntity(e, annotationPrefix));

  // Build hierarchy: namespace -> resources in that namespace
  return namespaceEntities.map(nsEntity => {
    const nsName = nsEntity.metadata.name;
    const children = resourceEntities
      .filter(resource => getEntityNamespace(resource, annotationPrefix) === nsName)
      .map(resource => ({ entity: resource, children: [] }));

    return {
      entity: nsEntity,
      children,
    };
  });
};

/**
 * Convert hierarchy to flat table rows
 */
export const hierarchyToTableRows = (
  hierarchy: HierarchyNode[],
  annotationPrefix: string,
): ResourceTableRow[] => {
  const rows: ResourceTableRow[] = [];

  hierarchy.forEach(nsNode => {
    const nsEntity = nsNode.entity;
    const nsId = nsEntity.metadata.uid!;

    // Add namespace row
    rows.push({
      id: nsId,
      name: nsEntity.metadata.title || nsEntity.metadata.name,
      entityKind: nsEntity.kind,
      kubernetesKind: getKubernetesKind(nsEntity, annotationPrefix),
      category: getResourceCategory(nsEntity, annotationPrefix),
      namespace: nsEntity.metadata.name,
      owner: getEntityOwner(nsEntity),
      status: getEntityStatus(nsEntity),
      level: 0,
      parentId: undefined,
      entity: nsEntity,
      hasChildren: nsNode.children.length > 0,
    });

    // Add resource rows
    nsNode.children.forEach(resourceNode => {
      const resourceEntity = resourceNode.entity;
      rows.push({
        id: resourceEntity.metadata.uid!,
        name: resourceEntity.metadata.title || resourceEntity.metadata.name,
        entityKind: resourceEntity.kind,
        kubernetesKind: getKubernetesKind(resourceEntity, annotationPrefix),
        category: getResourceCategory(resourceEntity, annotationPrefix),
        namespace: getEntityNamespace(resourceEntity, annotationPrefix),
        owner: getEntityOwner(resourceEntity),
        status: getEntityStatus(resourceEntity),
        level: 1,
        parentId: nsId,
        entity: resourceEntity,
        hasChildren: false,
      });
    });
  });

  return rows;
};

/**
 * Apply filters to entity list
 */
export const applyFilters = (
  entities: Entity[],
  filters: FilterState,
  annotationPrefix: string,
): Entity[] => {
  return entities.filter(entity => {
    // Namespace filter
    if (filters.namespaces.length > 0) {
      const entityNs = getEntityNamespace(entity, annotationPrefix);
      if (!filters.namespaces.includes(entityNs)) {
        return false;
      }
    }

    // Kubernetes Kind filter
    if (filters.kubernetesKinds.length > 0) {
      const k8sKind = getKubernetesKind(entity, annotationPrefix);
      if (!filters.kubernetesKinds.includes(k8sKind)) {
        return false;
      }
    }

    // Category filter
    if (filters.categories.length > 0) {
      const category = getResourceCategory(entity, annotationPrefix);
      if (!filters.categories.includes(category)) {
        return false;
      }
    }

    // Entity Kind filter
    if (filters.entityKinds.length > 0) {
      if (!filters.entityKinds.includes(entity.kind)) {
        return false;
      }
    }

    // Owner filter
    if (filters.owner) {
      const owner = getEntityOwner(entity);
      if (!owner.toLowerCase().includes(filters.owner.toLowerCase())) {
        return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const name = (entity.metadata.title || entity.metadata.name).toLowerCase();
      const description = (entity.metadata.description || '').toLowerCase();
      if (!name.includes(searchLower) && !description.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
};
