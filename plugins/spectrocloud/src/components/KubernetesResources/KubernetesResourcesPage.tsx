import React, { useState, useEffect, useMemo } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import {
  Box,
  Typography,
  CircularProgress,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { FilterState } from './types';
import { FilterBar } from './FilterBar';
import { FlatGroupedView } from './FlatGroupedView';
import { getClusterName, applyFilters } from './utils';
import { useKubernetesResourcesStyles } from './styles';

export const KubernetesResourcesPage: React.FC = () => {
  const { entity: clusterEntity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const configApi = useApi(configApiRef);
  const classes = useKubernetesResourcesStyles();

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!clusterName) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          Could not determine cluster name from entity annotations or tags.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Kubernetes Resources
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Cluster: <strong>{clusterName}</strong> • Total: {entities.length} • Filtered: {filteredEntities.length}
        </Typography>
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
        <Box className={classes.emptyState}>
          <Typography variant="h6" gutterBottom>
            No resources found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No Kubernetes resources are ingested for cluster <strong>{clusterName}</strong>.
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
            Make sure the kubernetes-ingestor is configured for this cluster.
          </Typography>
        </Box>
      ) : filteredEntities.length === 0 ? (
        <Box className={classes.emptyState}>
          <Typography variant="h6" gutterBottom>
            No matches found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No resources match the selected filters. Try adjusting your filter criteria.
          </Typography>
        </Box>
      ) : (
        <FlatGroupedView
          entities={filteredEntities}
          annotationPrefix={annotationPrefix}
        />
      )}
    </Box>
  );
};
