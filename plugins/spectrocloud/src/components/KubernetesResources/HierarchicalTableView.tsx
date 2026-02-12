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
import { StatusOK, StatusError, StatusWarning, StatusPending } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { 
  buildHierarchy, 
  hierarchyToTableRows,
} from './utils';
import { useKubernetesResourcesStyles } from './styles';

interface HierarchicalTableViewProps {
  entities: Entity[];
  annotationPrefix: string;
}

export const HierarchicalTableView: React.FC<HierarchicalTableViewProps> = ({
  entities,
  annotationPrefix,
}) => {
  const classes = useKubernetesResourcesStyles();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Build hierarchy and convert to table rows
  const tableRows = useMemo(() => {
    const hierarchy = buildHierarchy(entities, annotationPrefix);
    return hierarchyToTableRows(hierarchy, annotationPrefix);
  }, [entities, annotationPrefix]);

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Workload':
        return classes.workloadBadge;
      case 'Crossplane Claim':
        return classes.crossplaneClaimBadge;
      case 'Crossplane XR':
        return classes.crossplaneXRBadge;
      case 'KRO Instance':
        return classes.kroBadge;
      case 'Namespace':
        return classes.namespaceBadge;
      default:
        return classes.crdBadge;
    }
  };

  const getStatusComponent = (status?: string) => {
    if (!status) return null;
    
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('running') || lowerStatus.includes('ready') || lowerStatus.includes('synced')) {
      return <StatusOK />;
    }
    if (lowerStatus.includes('error') || lowerStatus.includes('failed')) {
      return <StatusError />;
    }
    if (lowerStatus.includes('warning') || lowerStatus.includes('degraded')) {
      return <StatusWarning />;
    }
    return <StatusPending />;
  };

  if (tableRows.length === 0) {
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

  return (
    <TableContainer component={Paper} className={classes.tableContainer}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell className={classes.tableHeaderCell} style={{ width: 48 }} />
            <TableCell className={classes.tableHeaderCell}>Name</TableCell>
            <TableCell className={classes.tableHeaderCell} align="center">Kubernetes Kind</TableCell>
            <TableCell className={classes.tableHeaderCell} align="center">Category</TableCell>
            <TableCell className={classes.tableHeaderCell} align="center">Entity Kind</TableCell>
            <TableCell className={classes.tableHeaderCell} align="center">Owner</TableCell>
            <TableCell className={classes.tableHeaderCell} align="center">Status</TableCell>
            <TableCell className={classes.tableHeaderCell} align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tableRows.map(row => {
            const isExpanded = expandedRows.has(row.id);
            const isVisible = row.level === 0 || expandedRows.has(row.parentId || '');

            if (!isVisible) {
              return null;
            }

            return (
              <TableRow key={row.id} className={classes.tableRow}>
                {/* Expand/Collapse */}
                <TableCell className={`${classes.tableCell} ${classes.expandCell}`}>
                  {row.hasChildren && (
                    <IconButton size="small" onClick={() => toggleRowExpansion(row.id)}>
                      {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                    </IconButton>
                  )}
                </TableCell>

                {/* Name */}
                <TableCell 
                  className={classes.tableCell}
                  style={{ paddingLeft: row.level * 32 + 16 }}
                >
                  <Link
                    to={`/catalog/${row.entity.metadata.namespace || 'default'}/${row.entityKind.toLowerCase()}/${row.entity.metadata.name}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <Typography variant="body2" style={{ fontWeight: row.level === 0 ? 600 : 400 }}>
                      {row.name}
                    </Typography>
                  </Link>
                </TableCell>

                {/* Kubernetes Kind */}
                <TableCell className={classes.tableCell} align="center">
                  <Typography variant="body2">{row.kubernetesKind}</Typography>
                </TableCell>

                {/* Category */}
                <TableCell className={classes.tableCell} align="center">
                  <Chip
                    label={row.category}
                    size="small"
                    className={getCategoryBadgeClass(row.category)}
                  />
                </TableCell>

                {/* Entity Kind */}
                <TableCell className={classes.tableCell} align="center">
                  <Chip label={row.entityKind} size="small" />
                </TableCell>

                {/* Owner */}
                <TableCell className={classes.tableCell} align="center">
                  <Typography variant="body2">{row.owner}</Typography>
                </TableCell>

                {/* Status */}
                <TableCell className={classes.tableCell} align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" style={{ gap: 8 }}>
                    {getStatusComponent(row.status)}
                    {row.status && (
                      <Typography variant="body2">{row.status}</Typography>
                    )}
                  </Box>
                </TableCell>

                {/* Actions */}
                <TableCell className={classes.tableCell} align="center">
                  <Link
                    to={`/catalog/${row.entity.metadata.namespace || 'default'}/${row.entityKind.toLowerCase()}/${row.entity.metadata.name}`}
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
        </TableBody>
      </Table>
    </TableContainer>
  );
};
