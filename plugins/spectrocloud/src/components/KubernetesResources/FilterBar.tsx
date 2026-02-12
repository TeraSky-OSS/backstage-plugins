import React from 'react';
import {
  Box,
  TextField,
  Button,
  InputAdornment,
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import { Entity } from '@backstage/catalog-model';
import { FilterState, CATEGORIES } from './types';
import { 
  extractUniqueKinds, 
  extractUniqueNamespaces, 
  extractUniqueOwners,
  groupKindsByCategory,
} from './utils';
import { useKubernetesResourcesStyles } from './styles';

interface FilterBarProps {
  entities: Entity[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  annotationPrefix: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  entities,
  filters,
  onFiltersChange,
  annotationPrefix,
}) => {
  const classes = useKubernetesResourcesStyles();

  const uniqueNamespaces = extractUniqueNamespaces(entities, annotationPrefix);
  const uniqueKinds = extractUniqueKinds(entities, annotationPrefix);
  const uniqueOwners = extractUniqueOwners(entities);
  const kindsByCategory = groupKindsByCategory(uniqueKinds, entities, annotationPrefix);

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
    <Box className={classes.filterBar}>
      <Box className={classes.filterRow}>
        {/* Namespace Filter */}
        <Autocomplete
          multiple
          className={classes.filterField}
          options={uniqueNamespaces}
          value={filters.namespaces}
          onChange={(_, newValue) => onFiltersChange({ ...filters, namespaces: newValue })}
          renderInput={(params) => (
            <TextField {...params} label="Namespace" variant="outlined" size="small" />
          )}
          ChipProps={{ size: 'small' }}
        />

        {/* Kubernetes Kind Filter */}
        <Autocomplete
          multiple
          className={classes.filterField}
          options={uniqueKinds}
          groupBy={(option) => {
            // Find which category this kind belongs to
            for (const [category, kinds] of kindsByCategory.entries()) {
              if (kinds.includes(option)) {
                return category;
              }
            }
            return 'Other';
          }}
          value={filters.kubernetesKinds}
          onChange={(_, newValue) => onFiltersChange({ ...filters, kubernetesKinds: newValue })}
          renderInput={(params) => (
            <TextField {...params} label="Kubernetes Kind" variant="outlined" size="small" />
          )}
          ChipProps={{ size: 'small' }}
        />

        {/* Category Filter */}
        <Autocomplete
          multiple
          className={classes.filterField}
          options={Array.from(CATEGORIES)}
          value={filters.categories}
          onChange={(_, newValue) => onFiltersChange({ ...filters, categories: newValue })}
          renderInput={(params) => (
            <TextField {...params} label="Category" variant="outlined" size="small" />
          )}
          ChipProps={{ size: 'small' }}
        />

        {/* Entity Kind Filter */}
        <Autocomplete
          multiple
          className={classes.filterField}
          options={['Component', 'Resource', 'System']}
          value={filters.entityKinds}
          onChange={(_, newValue) => onFiltersChange({ ...filters, entityKinds: newValue })}
          renderInput={(params) => (
            <TextField {...params} label="Entity Kind" variant="outlined" size="small" />
          )}
          ChipProps={{ size: 'small' }}
        />

        {/* Owner Filter */}
        <Autocomplete
          className={classes.filterField}
          options={uniqueOwners}
          value={filters.owner || null}
          onChange={(_, newValue) => onFiltersChange({ ...filters, owner: newValue || undefined })}
          renderInput={(params) => (
            <TextField {...params} label="Owner" variant="outlined" size="small" />
          )}
        />

        {/* Search Filter */}
        <TextField
          className={classes.filterField}
          label="Search"
          variant="outlined"
          size="small"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
        )}
      </Box>
    </Box>
  );
};
