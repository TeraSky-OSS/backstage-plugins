import { useEntity, useRelatedEntities, EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { InfoCard, Progress, Table, TableColumn } from '@backstage/core-components';
import { Badge, Box, Flex, Grid, Text } from '@backstage/ui';
import { RiCloudLine, RiComputerLine, RiHardDriveLine, RiStackLine } from '@remixicon/react';
import styles from './SpectroCloudClusterProfileCard.module.css';

interface ProfileVersion {
  uid: string;
  version: string;
}

interface ClusterProfileRef {
  name: string;
  uid: string;  // This is the profile VERSION uid
}

interface ClusterInfo {
  entity: Entity;
  name: string;
  title: string;
}

const getProfileTypeIcon = (type: string) => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType === 'cluster' || lowerType === 'infra') {
    return <RiHardDriveLine size={16} />;
  }
  if (lowerType === 'add-on' || lowerType === 'addon') {
    return <RiStackLine size={16} />;
  }
  return <RiCloudLine size={16} />;
};

const getProfileTypeLabel = (type: string): string => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType === 'cluster') return 'Full Cluster Profile';
  if (lowerType === 'infra') return 'Infrastructure Profile';
  if (lowerType === 'add-on' || lowerType === 'addon') return 'Add-on Profile';
  return type || 'Unknown';
};

export const SpectroCloudClusterProfileCard = () => {
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);

  // Get related clusters (entities that depend on this profile)
  const { entities: relatedClusters, loading } = useRelatedEntities(entity, {
    type: 'dependencyOf',
  });

  // Get annotation prefix from config or use default
  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const annotations = entity.metadata.annotations || {};

  // Extract profile information from annotations
  const profileUid = annotations[`${annotationPrefix}/profile-id`] || '';
  const scope = annotations[`${annotationPrefix}/scope`] || 'Unknown';
  const profileType = annotations[`${annotationPrefix}/profile-type`] || 'Unknown';
  const cloudType = annotations[`${annotationPrefix}/cloud-type`] || 'all';
  const latestVersion = annotations[`${annotationPrefix}/latest-version`] || annotations[`${annotationPrefix}/version`] || 'N/A';
  const profileStatus = annotations[`${annotationPrefix}/profile-status`] || 'unknown';

  // Parse profile versions from annotation
  let profileVersions: ProfileVersion[] = [];
  const versionsAnnotation = annotations[`${annotationPrefix}/profile-versions`];
  if (versionsAnnotation) {
    try {
      profileVersions = JSON.parse(versionsAnnotation);
    } catch {
      // Invalid JSON, fall back to current version
      if (profileUid && latestVersion !== 'N/A') {
        profileVersions = [{ uid: profileUid, version: latestVersion }];
      }
    }
  } else if (profileUid && latestVersion !== 'N/A') {
    // Fall back to just the current version
    profileVersions = [{ uid: profileUid, version: latestVersion }];
  }

  // Get clusters for a specific version
  const getClustersForVersion = (versionUid: string): ClusterInfo[] => {
    if (!relatedClusters) return [];

    const profileName = entity.metadata.title || entity.metadata.name;

    return relatedClusters
      .filter(cluster => {
        const clusterAnnotations = cluster.metadata.annotations || {};
        const profileRefsAnnotation = clusterAnnotations[`${annotationPrefix}/cluster-profile-refs`];

        if (!profileRefsAnnotation) return false;

        try {
          const profileRefs: ClusterProfileRef[] = JSON.parse(profileRefsAnnotation);
          // Match by version UID - the uid in the annotation is the profile VERSION uid
          return profileRefs.some(p =>
            p.uid === versionUid ||
            (p.name === profileName && p.uid === versionUid)
          );
        } catch {
          return false;
        }
      })
      .map(cluster => ({
        entity: cluster,
        name: cluster.metadata.name,
        title: cluster.metadata.title || cluster.metadata.name,
      }));
  };

  // Count clusters per version
  const getClusterCountByVersion = (versionUid: string): number => {
    return getClustersForVersion(versionUid).length;
  };

  // Get total cluster count
  const totalClusterCount = relatedClusters?.length || 0;

  const versionColumns: TableColumn<ProfileVersion>[] = [
    {
      title: 'Version',
      render: version => (
        <Flex align="center" gap="2">
          <Text variant="body-small">{version.version}</Text>
          {version.version === latestVersion && (
            <Badge className={styles.accentBadge}>latest</Badge>
          )}
        </Flex>
      ),
    },
    {
      title: 'Version UID',
      render: version => (
        <Text variant="body-small" color="secondary">{version.uid}</Text>
      ),
    },
    {
      title: 'Clusters Using',
      align: 'right' as const,
      render: version => (
        <span className={styles.countBadge}>{getClusterCountByVersion(version.uid)}</span>
      ),
    },
  ];

  const renderVersionDetail = (version: ProfileVersion) => {
    const clusters = getClustersForVersion(version.uid);
    return (
      <Box className={styles.detailPanel}>
        {clusters.length > 0 ? (
          <Flex direction="column" gap="1">
            {clusters.map(cluster => (
              <Flex key={cluster.name} align="center" gap="2">
                <RiComputerLine size={16} style={{ color: 'var(--bui-accent-fg)' }} />
                <EntityRefLink entityRef={cluster.entity} className={styles.entityLink}>
                  {cluster.title}
                </EntityRefLink>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Text variant="body-small" className={styles.noClusterText}>
            No clusters using this version
          </Text>
        )}
      </Box>
    );
  };

  return (
    <InfoCard title="SpectroCloud Cluster Profile">
      <Grid.Root columns="12" gap="4">
        {/* Profile Type */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Profile Type
          </Text>
          <Flex align="center" gap="2">
            {getProfileTypeIcon(profileType)}
            <Badge className={styles.accentBadge}>{getProfileTypeLabel(profileType)}</Badge>
          </Flex>
        </Grid.Item>

        {/* Cloud Type */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Cloud Type
          </Text>
          <Text variant="body-medium">
            {cloudType === 'all' ? 'All Clouds' : cloudType.toUpperCase()}
          </Text>
        </Grid.Item>

        {/* Scope */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Scope
          </Text>
          <Badge className={scope === 'tenant' ? undefined : styles.accentBadge}>{scope}</Badge>
        </Grid.Item>

        {/* Status */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Status
          </Text>
          <Badge className={profileStatus === 'published' ? styles.accentBadge : undefined}>
            {profileStatus}
          </Badge>
        </Grid.Item>

        {/* Latest Version */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Latest Version
          </Text>
          <Text variant="body-medium">{latestVersion}</Text>
        </Grid.Item>

        {/* Total Clusters Using */}
        <Grid.Item colSpan="6">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Clusters Using This Profile
          </Text>
          {loading ? (
            <Progress />
          ) : (
            <Text variant="title-small">{totalClusterCount}</Text>
          )}
        </Grid.Item>

        <Grid.Item colSpan="12">
          <hr className={styles.divider} />
        </Grid.Item>

        {/* Version Table */}
        <Grid.Item colSpan="12">
          <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
            Available Versions
          </Text>
          {loading && <Progress />}
          {!loading && profileVersions.length > 0 && (
            <Box mt="2">
              <Table
                options={{ search: false, paging: false, padding: 'dense' }}
                columns={versionColumns}
                data={profileVersions}
                detailPanel={({ rowData }: { rowData: ProfileVersion }) => renderVersionDetail(rowData)}
              />
            </Box>
          )}
          {!loading && profileVersions.length === 0 && (
            <Text variant="body-small" color="secondary">
              No version information available
            </Text>
          )}
        </Grid.Item>
      </Grid.Root>
    </InfoCard>
  );
};

export default SpectroCloudClusterProfileCard;
