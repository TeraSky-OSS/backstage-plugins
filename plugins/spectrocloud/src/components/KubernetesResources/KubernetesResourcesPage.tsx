import { useState, useEffect, useMemo } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { Alert, Box, Flex, Text } from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { FilterState } from './types';
import { FilterBar } from './FilterBar';
import { FlatGroupedView } from './FlatGroupedView';
import { getClusterName, applyFilters } from './utils';
import styles from './KubernetesResources.module.css';

export const KubernetesResourcesPage: React.FC = () => {
  const { entity: clusterEntity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const configApi = useApi(configApiRef);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [filters, setFilters] = useState<FilterState>({
    namespaces: [],
    kubernetesKinds: [],
    categories: [],
    entityKinds: [],
    owner: undefined,
    search: '',
  });

  // Get annotation prefix from config
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ??
                           configApi.getOptionalConfig('kubernetesIngestor')?.getOptionalString('annotationPrefix') ??
                           'terasky.backstage.io';

  // Extract cluster name from cluster entity
  const clusterName = useMemo(() => {
    return getClusterName(clusterEntity, annotationPrefix);
  }, [clusterEntity, annotationPrefix]);

  // Fetch related entities
  useEffect(() => {
    const fetchEntities = async () => {
      if (!clusterName) {
        setError('Could not determine cluster name from entity');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(undefined);

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

        // Merge and deduplicate
        const entityMap = new Map<string, Entity>();
        [...annotatedItems, ...taggedItems].forEach(e => {
          if (e.metadata.uid) {
            entityMap.set(e.metadata.uid, e);
          }
        });

        // Filter to only include Component, Resource, and System kinds (exclude Template, etc.)
        const allEntities = Array.from(entityMap.values()).filter(e =>
          e.kind === 'Component' || e.kind === 'Resource' || e.kind === 'System'
        );
        setEntities(allEntities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch entities');
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [clusterName, catalogApi]);

  // Apply filters
  const filteredEntities = useMemo(() => {
    return applyFilters(entities, filters, annotationPrefix);
  }, [entities, filters, annotationPrefix]);

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 400 }}>
        <Progress />
      </Flex>
    );
  }

  if (error) {
    return <Alert status="danger" description={error} />;
  }

  if (!clusterName) {
    return (
      <Alert
        status="warning"
        description="Could not determine cluster name from entity annotations or tags."
      />
    );
  }

  const resourcesContent = filteredEntities.length === 0 ? (
    <Box className={styles.emptyState}>
      <Text variant="title-small" weight="bold">
        No matches found
      </Text>
      <Text color="secondary">
        No resources match the selected filters. Try adjusting your filter criteria.
      </Text>
    </Box>
  ) : (
    <FlatGroupedView
      entities={filteredEntities}
      annotationPrefix={annotationPrefix}
    />
  );

  return (
    <Box p="6">
      {/* Header */}
      <Box mb="6">
        <Text variant="title-medium" weight="bold">
          Kubernetes Resources
        </Text>
        <Text color="secondary">
          Cluster: <strong>{clusterName}</strong> • Total: {entities.length} • Filtered: {filteredEntities.length}
        </Text>
      </Box>

      {/* Filter Bar */}
      <FilterBar
        entities={entities}
        filters={filters}
        onFiltersChange={setFilters}
        annotationPrefix={annotationPrefix}
      />

      {/* Content */}
      {entities.length === 0 ? (
        <Box className={styles.emptyState}>
          <Text variant="title-small" weight="bold">
            No resources found
          </Text>
          <Text color="secondary">
            No Kubernetes resources are ingested for cluster <strong>{clusterName}</strong>.
          </Text>
          <Text color="secondary" style={{ marginTop: 'var(--bui-space-2)', display: 'block' }}>
            Make sure the kubernetes-ingestor is configured for this cluster.
          </Text>
        </Box>
      ) : resourcesContent}
    </Box>
  );
};
