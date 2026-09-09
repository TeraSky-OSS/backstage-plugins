import { useState, useEffect } from 'react';
import { Badge, Box, Card, CardBody, Flex, Grid, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { kroApiRef } from '../api/KroApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview } from '@terasky/backstage-plugin-kro-common';
import { getAnnotationPrefix, getKroAnnotation } from './annotationUtils';
import { RiCheckboxCircleLine, RiCloseCircleLine, RiPauseCircleLine } from '@remixicon/react';
import styles from './KroOverviewCard.module.css';

const KroOverviewCard = () => {
  const { entity } = useEntity();
  const kroApi = useApi(kroApiRef);
  const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const annotationPrefix = getAnnotationPrefix(config);
  const { allowed: canShowOverviewTemp } = usePermission({ permission: showOverview });
  const canShowOverview = enablePermissions ? canShowOverviewTemp : true;
  const [rgd, setRgd] = useState<any | null>(null);
  const [instance, setInstance] = useState<any | null>(null);
  const [instanceRow, setInstanceRow] = useState<any | null>(null);

  useEffect(() => {
    if (!canShowOverview) {
      return;
    }
    const fetchResources = async () => {
      const annotations = entity.metadata.annotations || {};
      const rgdName = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-name');
      const rgdId = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-id');
      const clusterName = annotations['backstage.io/managed-by-location'].split(": ")[1];
      const namespace = getKroAnnotation(annotations, annotationPrefix, 'kro-instance-namespace') || 'default';

      if (!rgdName || !rgdId || !clusterName) {
        return;
      }

      try {
        const crdName = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-crd-name');
        if (!crdName) {
          throw new Error('CRD name not found in entity annotations');
        }

        const { resources, supportingResources } = await kroApi.getResources({
          clusterName,
          namespace,
          rgdName,
          rgdId,
          instanceId: getKroAnnotation(annotations, annotationPrefix, 'kro-instance-uid') || '',
          instanceName: getKroAnnotation(annotations, annotationPrefix, 'kro-instance-name') || entity.metadata.name,
          crdName,
        });

        // Find RGD and instance in the response
        const rgdResource = supportingResources.find(r => r.kind === 'ResourceGraphDefinition');
        const instanceRowData = resources.find(r => r.type === 'Instance');
        const instanceResource = instanceRowData?.resource;

        setRgd(rgdResource);
        setInstance(instanceResource);
        setInstanceRow(instanceRowData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch RGD:', error);
      }
    };
    fetchResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kroApi, entity, canShowOverview, annotationPrefix]);

  if (!canShowOverview) {
    return (
      <Card style={{ width: '450px' }}>
        <CardBody>
          <Text variant="title-small" weight="bold" style={{ display: 'block', textAlign: 'center' }}>
            KRO Overview
          </Text>
          <Box m="2">
            <Text>
              You don't have permissions to view KRO resources
            </Text>
          </Box>
        </CardBody>
      </Card>
    );
  }

  const renderStatusIcon = (status: string) => {
    return status === 'True'
      ? <RiCheckboxCircleLine style={{ color: 'var(--bui-fg-positive)' }} />
      : <RiCloseCircleLine style={{ color: 'var(--bui-fg-negative)' }} />;
  };

  const isClusterScoped = instanceRow?.scope === 'Cluster';
  const reconcilePaused = instanceRow?.reconcilePaused === true;

  const renderConditionTooltip = (condition: any) => (
    <Box style={{ width: '380px' }}>
      <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Condition: {condition.type}</Text>
      <Text variant="body-small" style={{ display: 'block' }}>Status: {condition.status}</Text>
      <Text variant="body-small" style={{ display: 'block' }}>Reason: {condition.reason}</Text>
      <Text variant="body-small" style={{ display: 'block' }}>Last Transition Time: {condition.lastTransitionTime}</Text>
      <Text variant="body-small" style={{ wordWrap: 'break-word', display: 'block' }}>Message: {condition.message}</Text>
    </Box>
  );

  return (
    <Card>
      <CardBody>
        <Box mb="4">
          <Text variant="title-small" weight="bold">KRO Overview</Text>
        </Box>
        {rgd ? (
          <Box>
            <Grid.Root columns="12" gap="4">
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>RGD Name</Text>
                <Text variant="body-small">{rgd.metadata?.name}</Text>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>RGD State</Text>
                <TooltipTrigger>
                  <Text variant="body-small" style={{ display: 'inline-block' }}>
                    {renderStatusIcon(rgd.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status || 'Unknown')}
                  </Text>
                  <Tooltip className={styles.wideTooltip}>
                    {renderConditionTooltip(rgd.status?.conditions?.find((condition: any) => condition.type === 'Ready') || {})}
                  </Tooltip>
                </TooltipTrigger>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Instance Name</Text>
                <Text variant="body-small">{getKroAnnotation(entity.metadata?.annotations, annotationPrefix, 'kro-instance-name')}</Text>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Instance State</Text>
                <TooltipTrigger>
                  <Text variant="body-small" style={{ display: 'inline-block' }}>
                    {renderStatusIcon(
                      (instance?.status?.conditions?.find((condition: any) => condition.type === 'Ready') ||
                       instance?.status?.conditions?.find((condition: any) => condition.type === 'InstanceSynced'))?.status ||
                      'Unknown'
                    )}
                  </Text>
                  <Tooltip className={styles.wideTooltip}>
                    {renderConditionTooltip(
                      instance?.status?.conditions?.find((condition: any) => condition.type === 'Ready') ||
                      instance?.status?.conditions?.find((condition: any) => condition.type === 'InstanceSynced') ||
                      {}
                    )}
                  </Tooltip>
                </TooltipTrigger>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Namespace</Text>
                {isClusterScoped ? (
                  <Badge style={{ color: 'var(--bui-fg-announcement)' }}>Cluster-Scoped</Badge>
                ) : (
                  <Text variant="body-small">{getKroAnnotation(entity.metadata?.annotations, annotationPrefix, 'kro-instance-namespace') || 'default'}</Text>
                )}
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Cluster</Text>
                <Text variant="body-small">{entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(": ")[1] || "Unknown"}</Text>
              </Grid.Item>
              <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>RGD API Version</Text>
                <Text variant="body-small">{rgd.apiVersion}</Text>
              </Grid.Item>
              {reconcilePaused && (
                <Grid.Item colSpan="12">
                  <Flex align="center" gap="2" mt="1">
                    <RiPauseCircleLine style={{ color: 'var(--bui-fg-warning)' }} />
                    <Text variant="body-small" weight="bold" style={{ color: 'var(--bui-fg-warning)' }}>
                      Reconciliation is paused for this instance
                    </Text>
                  </Flex>
                </Grid.Item>
              )}
            </Grid.Root>
          </Box>
        ) : (
          <Text>Loading...</Text>
        )}
      </CardBody>
    </Card>
  );
};

export default KroOverviewCard;
