import { useEntity, useRelatedEntities, EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { InfoCard } from '@backstage/core-components';
import { Badge, Box, Flex, Grid, Text } from '@backstage/ui';
import { RiGroupLine, RiComputerLine, RiStackLine } from '@remixicon/react';
import styles from './SpectroCloudClusterGroupCard.module.css';

export const SpectroCloudClusterGroupCard = () => {
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);

  const annotationPrefix = configApi.getOptionalConfig('spectrocloud')?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';

  const annotations = entity.metadata.annotations || {};
  const clusterGroupId = annotations[`${annotationPrefix}/cluster-group-id`];
  const scope = annotations[`${annotationPrefix}/scope`] || 'tenant';
  const projectName = annotations[`${annotationPrefix}/project-name`];
  const endpointType = annotations[`${annotationPrefix}/endpoint-type`] || 'N/A';

  // Get all dependent resources (clusters and profiles)
  const { entities: dependentEntities } = useRelatedEntities(entity, {
    type: 'dependsOn',
    kind: 'resource',
  });

  // Filter to get actual clusters (not profiles)
  const clusters = dependentEntities?.filter((e: Entity) =>
    e.spec?.type === 'spectrocloud-cluster' ||
    e.spec?.type === 'spectrocloud-virtual-cluster'
  ) || [];

  // Filter to get profile entities
  const profileEntities = dependentEntities?.filter((e: Entity) =>
    e.spec?.type === 'spectrocloud-cluster-profile'
  ) || [];

  // Get attached profiles from annotations (for display names and UIDs)
  const profileRefs = annotations[`${annotationPrefix}/cluster-profile-refs`];
  let profiles: Array<{name: string; uid: string}> = [];
  if (profileRefs) {
    try {
      profiles = JSON.parse(profileRefs);
    } catch (e) {
      // Ignore parse errors
    }
  }

  return (
    <InfoCard title="Cluster Group Overview">
      <Grid.Root columns="12" gap="4">
        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Cluster Group ID:
            </Text>
            <Text variant="body-small">{clusterGroupId || 'N/A'}</Text>
          </Box>

          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Scope:
            </Text>
            <Badge
              style={
                scope === 'tenant'
                  ? { backgroundColor: 'var(--bui-accent-bg)', color: 'var(--bui-accent-fg)' }
                  : undefined
              }
            >
              {scope}
            </Badge>
          </Box>

          {scope === 'project' && projectName && (
            <Box mb="2">
              <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
                Project:
              </Text>
              <Text variant="body-small">{projectName}</Text>
            </Box>
          )}

          <Box mb="2">
            <Text variant="body-small" weight="bold" color="secondary" style={{ display: 'block' }}>
              Endpoint Type:
            </Text>
            <Text variant="body-small">{endpointType}</Text>
          </Box>
        </Grid.Item>

        <Grid.Item colSpan={{ xs: '12', md: '6' }}>
          <Box mb="2">
            <Flex align="center" gap="2" mb="1">
              <RiComputerLine size={16} />
              <Text variant="body-small" weight="bold" color="secondary">
                Member Clusters ({clusters.length}):
              </Text>
            </Flex>
            {clusters.length > 0 ? (
              <Flex direction="column" gap="1">
                {clusters.map((cluster: Entity) => (
                  <Flex key={cluster.metadata.uid} align="center" gap="2">
                    <RiComputerLine size={16} style={{ color: 'var(--bui-accent-fg)' }} />
                    <EntityRefLink
                      entityRef={cluster}
                      title={cluster.metadata.title || cluster.metadata.name}
                      className={styles.entityLink}
                    />
                    <Badge>
                      {cluster.spec?.type === 'spectrocloud-virtual-cluster' ? 'Virtual' : 'Physical'}
                    </Badge>
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Text variant="body-small" className={styles.noResourceText}>
                No member clusters
              </Text>
            )}
          </Box>

          {profiles.length > 0 && (
            <Box mt="2">
              <Flex align="center" gap="2" mb="1">
                <RiStackLine size={16} />
                <Text variant="body-small" weight="bold" color="secondary">
                  Add-on Profiles ({profiles.length}):
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                {profiles.map((profile) => {
                  // Find the matching profile entity by UID in annotations
                  const profileEntity = profileEntities.find((e: Entity) =>
                    e.metadata.annotations?.[`${annotationPrefix}/profile-id`] === profile.uid
                  );

                  return (
                    <Flex key={profile.uid} align="center" gap="2">
                      <RiStackLine size={16} style={{ color: 'var(--bui-accent-fg)' }} />
                      {profileEntity ? (
                        <EntityRefLink
                          entityRef={profileEntity}
                          defaultKind="resource"
                          className={styles.entityLink}
                        />
                      ) : (
                        <Text variant="body-small">{profile.name}</Text>
                      )}
                    </Flex>
                  );
                })}
              </Flex>
            </Box>
          )}
        </Grid.Item>
      </Grid.Root>

      <hr className={styles.divider} />

      <Text variant="body-small" color="secondary">
        <strong>
          <RiGroupLine size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Cluster Group
        </strong>
        : A logical grouping of clusters that can share configuration and policies
      </Text>
    </InfoCard>
  );
};
