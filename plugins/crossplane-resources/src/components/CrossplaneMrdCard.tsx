import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Grid,
  Text,
} from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { listManagedResourceDefinitionsPermission } from '@terasky/backstage-plugin-crossplane-common';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { getAnnotationPrefix } from './annotationUtils';
import { getProviderClusterName, getProviderName } from './isCrossplaneProviderEntity';
import styles from './CrossplaneMrdCard.module.css';

const CrossplaneMrdCard = () => {
  const { entity } = useEntity();
  const crossplaneApi = useApi(crossplaneApiRef);
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const annotationPrefix = getAnnotationPrefix(config);
  const { allowed: canListTemp } = usePermission({
    permission: listManagedResourceDefinitionsPermission,
  });
  const canList = enablePermissions ? canListTemp : true;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    namespacedCount: number;
    clusterScopedCount: number;
    activeCount: number;
    inactiveCount: number;
  } | null>(null);

  useEffect(() => {
    if (!canList) return;

    const clusterName = getProviderClusterName(entity);
    const providerName = getProviderName(entity, annotationPrefix);

    if (!clusterName) return;

    setLoading(true);
    setError(null);

    crossplaneApi
      .getManagedResourceDefinitions(clusterName, providerName)
      .then(response => {
        setSummary({
          total: response.items.length,
          namespacedCount: response.namespacedCount,
          clusterScopedCount: response.clusterScopedCount,
          activeCount: response.activeCount,
          inactiveCount: response.inactiveCount,
        });
      })
      .catch(err => {
        setError(err?.message || 'Failed to load MRDs');
      })
      .finally(() => setLoading(false));
  }, [canList, crossplaneApi, entity, annotationPrefix]);

  if (!canList) {
    return (
      <Card style={{ minWidth: '300px' }}>
        <CardBody>
          <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)' }}>
            You do not have permission to view Managed Resource Definitions.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card style={{ minWidth: '300px' }}>
      <CardHeader title="Managed Resource Definitions" />
      <hr className={styles.divider} />
      <CardBody>
        {loading && (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: 'var(--bui-space-4) 0' }}>
            <Progress />
          </Box>
        )}
        {error && (
          <Text variant="body-small" style={{ color: 'var(--bui-fg-negative)' }}>
            {error}
          </Text>
        )}
        {!loading && !error && summary !== null && (
          <>
            <Box mb="4" style={{ textAlign: 'center' }}>
              <Text className={styles.statValue}>{summary.total}</Text>
              <Text className={styles.statLabel}>Total MRDs</Text>
            </Box>
            <hr className={styles.divider} />
            <Box mt="4" mb="2">
              <Text className={styles.sectionTitle}>By Scope</Text>
              <Grid.Root columns="12" gap="2">
                <Grid.Item colSpan="6">
                  <Box className={styles.statBox}>
                    <Text className={styles.statValue} style={{ color: 'var(--bui-fg-announcement)' }}>
                      {summary.namespacedCount}
                    </Text>
                    <Text className={styles.statLabel}>Namespaced</Text>
                  </Box>
                </Grid.Item>
                <Grid.Item colSpan="6">
                  <Box className={styles.statBox}>
                    <Text className={styles.statValue} style={{ color: 'var(--bui-fg-warning)' }}>
                      {summary.clusterScopedCount}
                    </Text>
                    <Text className={styles.statLabel}>Cluster Scoped</Text>
                  </Box>
                </Grid.Item>
              </Grid.Root>
            </Box>
            <hr className={styles.divider} />
            <Box mt="4">
              <Text className={styles.sectionTitle}>By State</Text>
              <Grid.Root columns="12" gap="2">
                <Grid.Item colSpan="6">
                  <Box className={styles.statBox}>
                    <Text className={styles.statValue} style={{ color: 'var(--bui-fg-positive)' }}>
                      {summary.activeCount}
                    </Text>
                    <Text className={styles.statLabel}>Active</Text>
                  </Box>
                </Grid.Item>
                <Grid.Item colSpan="6">
                  <Box className={styles.statBox}>
                    <Text className={styles.statValue} style={{ color: 'var(--bui-fg-negative)' }}>
                      {summary.inactiveCount}
                    </Text>
                    <Text className={styles.statLabel}>Inactive</Text>
                  </Box>
                </Grid.Item>
              </Grid.Root>
            </Box>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default CrossplaneMrdCard;
