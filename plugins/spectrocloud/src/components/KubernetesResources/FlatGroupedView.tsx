import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Button,
} from '@material-ui/core';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { Link } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { CATEGORIES } from './types';
import { 
  getKubernetesKind, 
  getResourceCategory, 
  getEntityNamespace, 
  getEntityOwner,
} from './utils';
import { useKubernetesResourcesStyles } from './styles';

interface FlatGroupedViewProps {
  entities: Entity[];
  annotationPrefix: string;
}

interface GroupedData {
  category: string;
  kinds: Map<string, Entity[]>;
}

export const FlatGroupedView: React.FC<FlatGroupedViewProps> = ({
  entities,
  annotationPrefix,
}) => {
  const classes = useKubernetesResourcesStyles();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Array.from(CATEGORIES)));
  const [expandedKinds, setExpandedKinds] = useState<Set<string>>(new Set());

  // Group entities by category and kind
  const groupedData = useMemo(() => {
    const categoryMap = new Map<string, Map<string, Entity[]>>();

    entities.forEach(entity => {
      const category = getResourceCategory(entity, annotationPrefix);
      const kind = getKubernetesKind(entity, annotationPrefix);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }

      const kindMap = categoryMap.get(category)!;
      if (!kindMap.has(kind)) {
        kindMap.set(kind, []);
      }

      kindMap.get(kind)!.push(entity);
    });

    // Convert to array and sort categories
    const sortedCategories: GroupedData[] = Array.from(CATEGORIES)
      .filter(cat => categoryMap.has(cat))
      .map(cat => ({
        category: cat,
        kinds: categoryMap.get(cat)!,
      }));

    return sortedCategories;
  }, [entities, annotationPrefix]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleKind = (kindKey: string) => {
    setExpandedKinds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kindKey)) {
        newSet.delete(kindKey);
      } else {
        newSet.add(kindKey);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Workload':
        return '📦';
      case 'Crossplane Claim':
        return '🔷';
      case 'Crossplane XR':
        return '🔶';
      case 'KRO Instance':
        return '🟠';
      case 'CRD':
        return '📋';
      case 'Namespace':
        return '🏷️';
      default:
        return '📁';
    }
  };

  if (groupedData.length === 0) {
    return (
      <Box className={classes.emptyState}>
        <Typography variant="h6" gutterBottom>
          No resources found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          No Kubernetes resources are associated with this cluster.
        </Typography>
      </Box>
    );
  }

  const totalCount = entities.length;

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="body2" color="textSecondary">
          Total Resources: {totalCount}
        </Typography>
      </Box>
      
      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className={classes.tableHeaderCell} style={{ width: 48 }} />
              <TableCell className={classes.tableHeaderCell}>Name</TableCell>
              <TableCell className={classes.tableHeaderCell} align="center">Namespace</TableCell>
              <TableCell className={classes.tableHeaderCell} align="center">Entity Kind</TableCell>
              <TableCell className={classes.tableHeaderCell} align="center">Owner</TableCell>
              <TableCell className={classes.tableHeaderCell} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedData.map(({ category, kinds }) => {
              const isCategoryExpanded = expandedCategories.has(category);
              const categoryCount = Array.from(kinds.values()).reduce((sum, arr) => sum + arr.length, 0);

              return (
                <React.Fragment key={category}>
                  {/* Category Header Row */}
                  <TableRow className={classes.groupHeader}>
                    <TableCell className={classes.tableCell} style={{ width: 48 }}>
                      <IconButton size="small" onClick={() => toggleCategory(category)}>
                        {isCategoryExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell className={classes.tableCell} colSpan={5}>
                      <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                        <span>{getCategoryIcon(category)}</span>
                        <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                          {category}
                        </Typography>
                        <Chip 
                          label={categoryCount} 
                          size="small" 
                          className={classes.countBadge}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Kind Subgroups */}
                  {isCategoryExpanded && Array.from(kinds.entries()).map(([kind, kindEntities]) => {
                    const kindKey = `${category}-${kind}`;
                    const isKindExpanded = expandedKinds.has(kindKey);

                    return (
                      <React.Fragment key={kindKey}>
                        {/* Kind Header Row */}
                        <TableRow className={classes.kindGroupHeader}>
                          <TableCell className={classes.tableCell} style={{ width: 48 }} />
                          <TableCell className={classes.tableCell} style={{ paddingLeft: 32 }}>
                            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                              <IconButton size="small" onClick={() => toggleKind(kindKey)}>
                                {isKindExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                              </IconButton>
                              <Typography variant="body2" style={{ fontWeight: 600 }}>
                                {kind}
                              </Typography>
                              <Chip 
                                label={kindEntities.length} 
                                size="small" 
                                className={classes.countBadge}
                              />
                            </Box>
                          </TableCell>
                          <TableCell className={classes.tableCell} colSpan={4} />
                        </TableRow>

                        {/* Resource Rows */}
                        {isKindExpanded && kindEntities.map(entity => {
                          const namespace = getEntityNamespace(entity, annotationPrefix);
                          const owner = getEntityOwner(entity);

                          return (
                            <TableRow key={entity.metadata.uid} className={classes.tableRow}>
                              <TableCell className={classes.tableCell} style={{ width: 48 }} />
                              <TableCell className={classes.tableCell} style={{ paddingLeft: 64 }}>
                                <Link
                                  to={`/catalog/${entity.metadata.namespace || 'default'}/${entity.kind.toLowerCase()}/${entity.metadata.name}`}
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  <Typography variant="body2">
                                    {entity.metadata.title || entity.metadata.name}
                                  </Typography>
                                </Link>
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Typography variant="body2">{namespace}</Typography>
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Chip label={entity.kind} size="small" />
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Typography variant="body2">{owner}</Typography>
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Link
                                  to={`/catalog/${entity.metadata.namespace || 'default'}/${entity.kind.toLowerCase()}/${entity.metadata.name}`}
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="primary"
                                    endIcon={<OpenInNewIcon />}
                                  >
                                    View
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
