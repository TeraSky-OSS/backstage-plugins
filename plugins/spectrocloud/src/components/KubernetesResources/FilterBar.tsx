import { Box, Button, Select, TextField } from '@backstage/ui';
import { RiSearchLine } from '@remixicon/react';
import { Entity } from '@backstage/catalog-model';
import { FilterState, CATEGORIES } from './types';
import {
  extractUniqueKinds,
  extractUniqueNamespaces,
  extractUniqueOwners,
  groupKindsByCategory,
} from './utils';
import styles from './KubernetesResources.module.css';

interface FilterBarProps {
  entities: Entity[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  annotationPrefix: string;
}

const ALL_OWNERS = '__all__';

export const FilterBar: React.FC<FilterBarProps> = ({
  entities,
  filters,
  onFiltersChange,
  annotationPrefix,
}) => {
  const uniqueNamespaces = extractUniqueNamespaces(entities, annotationPrefix);
  const uniqueKinds = extractUniqueKinds(entities, annotationPrefix);
  const uniqueOwners = extractUniqueOwners(entities);
  const kindsByCategory = groupKindsByCategory(uniqueKinds, entities, annotationPrefix);

  const categorizedKinds = new Set(Array.from(kindsByCategory.values()).flat());
  const uncategorizedKinds = uniqueKinds.filter(kind => !categorizedKinds.has(kind));
  const kindOptions = [
    ...Array.from(kindsByCategory.entries()).map(([category, kinds]) => ({
      title: category,
      options: kinds.map(kind => ({ id: kind, label: kind })),
    })),
    ...(uncategorizedKinds.length > 0
      ? [{ title: 'Other', options: uncategorizedKinds.map(kind => ({ id: kind, label: kind })) }]
      : []),
  ];

  const handleClearFilters = () => {
    onFiltersChange({
      namespaces: [],
      kubernetesKinds: [],
      categories: [],
      entityKinds: [],
      owner: undefined,
      search: '',
    });
  };

  const hasActiveFilters =
    filters.namespaces.length > 0 ||
    filters.kubernetesKinds.length > 0 ||
    filters.categories.length > 0 ||
    filters.entityKinds.length > 0 ||
    filters.owner ||
    filters.search;

  return (
    <Box className={styles.filterBar}>
      <Box className={styles.filterRow}>
        {/* Namespace Filter */}
        <Select<'multiple'>
          className={styles.filterField}
          size="small"
          label="Namespace"
          selectionMode="multiple"
          options={uniqueNamespaces.map(ns => ({ id: ns, label: ns }))}
          value={filters.namespaces}
          onChange={value => onFiltersChange({ ...filters, namespaces: value as string[] })}
        />

        {/* Kubernetes Kind Filter */}
        <Select<'multiple'>
          className={styles.filterField}
          size="small"
          label="Kubernetes Kind"
          selectionMode="multiple"
          options={kindOptions}
          value={filters.kubernetesKinds}
          onChange={value => onFiltersChange({ ...filters, kubernetesKinds: value as string[] })}
        />

        {/* Category Filter */}
        <Select<'multiple'>
          className={styles.filterField}
          size="small"
          label="Category"
          selectionMode="multiple"
          options={Array.from(CATEGORIES).map(category => ({ id: category, label: category }))}
          value={filters.categories}
          onChange={value => onFiltersChange({ ...filters, categories: value as string[] })}
        />

        {/* Entity Kind Filter */}
        <Select<'multiple'>
          className={styles.filterField}
          size="small"
          label="Entity Kind"
          selectionMode="multiple"
          options={['Component', 'Resource', 'System'].map(kind => ({ id: kind, label: kind }))}
          value={filters.entityKinds}
          onChange={value => onFiltersChange({ ...filters, entityKinds: value as string[] })}
        />

        {/* Owner Filter */}
        <Select
          className={styles.filterField}
          size="small"
          label="Owner"
          selectedKey={filters.owner ?? ALL_OWNERS}
          onSelectionChange={key => {
            const value = String(key);
            onFiltersChange({ ...filters, owner: value === ALL_OWNERS ? undefined : value });
          }}
          options={[
            { id: ALL_OWNERS, label: 'All Owners' },
            ...uniqueOwners.map(owner => ({ id: owner, label: owner })),
          ]}
        />

        {/* Search Filter */}
        <TextField
          className={styles.filterField}
          size="small"
          label="Search"
          icon={<RiSearchLine size={16} />}
          value={filters.search}
          onChange={value => onFiltersChange({ ...filters, search: value })}
        />

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button size="small" variant="secondary" onPress={handleClearFilters}>
            Clear Filters
          </Button>
        )}
      </Box>
    </Box>
  );
};
