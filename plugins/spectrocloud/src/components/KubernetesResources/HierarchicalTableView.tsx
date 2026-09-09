import { useState, useMemo } from 'react';
import { Badge, Box, Button, ButtonIcon, Flex, Text } from '@backstage/ui';
import {
  Link,
  StatusOK,
  StatusError,
  StatusWarning,
  StatusPending,
} from '@backstage/core-components';
import { RiArrowDownSLine, RiArrowRightSLine, RiExternalLinkLine } from '@remixicon/react';
import { Entity } from '@backstage/catalog-model';
import {
  buildHierarchy,
  hierarchyToTableRows,
} from './utils';
import styles from './KubernetesResources.module.css';

interface HierarchicalTableViewProps {
  entities: Entity[];
  annotationPrefix: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Workload: 'var(--bui-fg-positive)',
  'Crossplane Claim': 'var(--bui-fg-announcement)',
  'Crossplane XR': 'var(--bui-fg-announcement)',
  'KRO Instance': 'var(--bui-fg-warning)',
  Namespace: 'var(--bui-accent-fg)',
};

const getCategoryColor = (category: string) => CATEGORY_COLORS[category] ?? 'var(--bui-fg-secondary)';

export const HierarchicalTableView: React.FC<HierarchicalTableViewProps> = ({
  entities,
  annotationPrefix,
}) => {
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
      <Box className={styles.emptyState}>
        <Text variant="title-small" weight="bold">
          No resources found
        </Text>
        <Text color="secondary">
          No Kubernetes resources are associated with this cluster.
        </Text>
      </Box>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.tableHeaderCell} ${styles.expandCell}`} />
            <th className={styles.tableHeaderCell}>Name</th>
            <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Kubernetes Kind</th>
            <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Category</th>
            <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Entity Kind</th>
            <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Owner</th>
            <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Status</th>
            <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map(row => {
            const isExpanded = expandedRows.has(row.id);
            const isVisible = row.level === 0 || expandedRows.has(row.parentId || '');

            if (!isVisible) {
              return null;
            }

            return (
              <tr key={row.id} className={styles.tableRow}>
                {/* Expand/Collapse */}
                <td className={`${styles.tableCell} ${styles.expandCell}`}>
                  {row.hasChildren && (
                    <ButtonIcon
                      size="small"
                      variant="tertiary"
                      aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                      icon={isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                      onPress={() => toggleRowExpansion(row.id)}
                    />
                  )}
                </td>

                {/* Name */}
                <td
                  className={styles.tableCell}
                  style={{ paddingLeft: row.level * 32 + 16 }}
                >
                  <Link
                    to={`/catalog/${row.entity.metadata.namespace || 'default'}/${row.entityKind.toLowerCase()}/${row.entity.metadata.name}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <Text weight={row.level === 0 ? 'bold' : 'regular'}>
                      {row.name}
                    </Text>
                  </Link>
                </td>

                {/* Kubernetes Kind */}
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  <Text>{row.kubernetesKind}</Text>
                </td>

                {/* Category */}
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  <Badge size="small" style={{ color: getCategoryColor(row.category) }}>
                    {row.category}
                  </Badge>
                </td>

                {/* Entity Kind */}
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  <Badge size="small">{row.entityKind}</Badge>
                </td>

                {/* Owner */}
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  <Text>{row.owner}</Text>
                </td>

                {/* Status */}
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  <Flex align="center" justify="center" gap="2">
                    {getStatusComponent(row.status)}
                    {row.status && <Text>{row.status}</Text>}
                  </Flex>
                </td>

                {/* Actions */}
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  <Link
                    to={`/catalog/${row.entity.metadata.namespace || 'default'}/${row.entityKind.toLowerCase()}/${row.entity.metadata.name}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <Button size="small" variant="tertiary" iconEnd={<RiExternalLinkLine />}>
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
