import { useState, useMemo, Fragment, type MouseEvent } from 'react';
import { Badge, Box, Button, ButtonIcon, Flex, Text } from '@backstage/ui';
import { Link } from '@backstage/core-components';
import { RiArrowDownSLine, RiArrowRightSLine, RiExternalLinkLine } from '@remixicon/react';
import { Entity } from '@backstage/catalog-model';
import { CATEGORIES } from './types';
import {
  getKubernetesKind,
  getResourceCategory,
  getEntityNamespace,
  getEntityOwner,
} from './utils';
import styles from './KubernetesResources.module.css';

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

  const totalCount = entities.length;

  return (
    <Box>
      <Box mb="2">
        <Text color="secondary">Total Resources: {totalCount}</Text>
      </Box>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.tableHeaderCell} ${styles.expandCell}`} />
              <th className={styles.tableHeaderCell}>Name</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Namespace</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Entity Kind</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Owner</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableCellCenter}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map(({ category, kinds }) => {
              const isCategoryExpanded = expandedCategories.has(category);
              const categoryCount = Array.from(kinds.values()).reduce((sum, arr) => sum + arr.length, 0);

              return (
                <Fragment key={category}>
                  {/* Category Header Row */}
                  <tr className={styles.groupHeader}>
                    <td className={`${styles.tableCell} ${styles.expandCell}`}>
                      <ButtonIcon
                        size="small"
                        variant="tertiary"
                        aria-label={isCategoryExpanded ? 'Collapse category' : 'Expand category'}
                        icon={isCategoryExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                        onPress={() => toggleCategory(category)}
                      />
                    </td>
                    <td className={styles.tableCell} colSpan={5}>
                      <Flex align="center" gap="2">
                        <span>{getCategoryIcon(category)}</span>
                        <Text weight="bold">{category}</Text>
                        <Badge size="small">{categoryCount}</Badge>
                      </Flex>
                    </td>
                  </tr>

                  {/* Kind Subgroups */}
                  {isCategoryExpanded && Array.from(kinds.entries()).map(([kind, kindEntities]) => {
                    const kindKey = `${category}-${kind}`;
                    const isKindExpanded = expandedKinds.has(kindKey);

                    return (
                      <Fragment key={kindKey}>
                        {/* Kind Header Row */}
                        <tr className={styles.kindGroupHeader}>
                          <td className={`${styles.tableCell} ${styles.expandCell}`} />
                          <td className={styles.tableCell} style={{ paddingLeft: 32 }}>
                            <Flex align="center" gap="2">
                              <ButtonIcon
                                size="small"
                                variant="tertiary"
                                aria-label={isKindExpanded ? 'Collapse kind' : 'Expand kind'}
                                icon={isKindExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                                onPress={() => toggleKind(kindKey)}
                              />
                              <Text weight="bold">{kind}</Text>
                              <Badge size="small">{kindEntities.length}</Badge>
                            </Flex>
                          </td>
                          <td className={styles.tableCell} colSpan={4} />
                        </tr>

                        {/* Resource Rows */}
                        {isKindExpanded && kindEntities.map(entity => {
                          const namespace = getEntityNamespace(entity, annotationPrefix);
                          const owner = getEntityOwner(entity);

                          return (
                            <tr key={entity.metadata.uid} className={styles.tableRow}>
                              <td className={`${styles.tableCell} ${styles.expandCell}`} />
                              <td className={styles.tableCell} style={{ paddingLeft: 64 }}>
                                <Link
                                  to={`/catalog/${entity.metadata.namespace || 'default'}/${entity.kind.toLowerCase()}/${entity.metadata.name}`}
                                  onClick={(e: MouseEvent) => e.stopPropagation()}
                                >
                                  <Text>
                                    {entity.metadata.title || entity.metadata.name}
                                  </Text>
                                </Link>
                              </td>
                              <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                                <Text>{namespace}</Text>
                              </td>
                              <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                                <Badge size="small">{entity.kind}</Badge>
                              </td>
                              <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                                <Text>{owner}</Text>
                              </td>
                              <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                                <Link
                                  to={`/catalog/${entity.metadata.namespace || 'default'}/${entity.kind.toLowerCase()}/${entity.metadata.name}`}
                                  onClick={(e: MouseEvent) => e.stopPropagation()}
                                >
                                  <Button size="small" variant="tertiary" iconEnd={<RiExternalLinkLine />}>
                                    View
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Box>
  );
};
