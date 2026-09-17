import { useState, useEffect } from 'react';
import { Box, Card, CardBody, Grid, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { useApi } from '@backstage/core-plugin-api';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview } from '@terasky/backstage-plugin-crossplane-common';
import { configApiRef } from '@backstage/core-plugin-api';
import { getAnnotation, getAnnotationPrefix } from './annotationUtils';
import { RiCheckboxCircleLine, RiCloseCircleLine } from '@remixicon/react';
import styles from './CrossplaneV2OverviewCard.module.css';

const CrossplaneV2OverviewCard = () => {
    const { entity } = useEntity();
    const crossplaneApi = useApi(crossplaneApiRef);
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const annotationPrefix = getAnnotationPrefix(config);
    const { allowed: canShowOverviewTemp } = usePermission({ permission: showOverview });
    const canShowOverview = enablePermissions ? canShowOverviewTemp : true;
    const [composite, setComposite] = useState<any | null>(null);
    const [managedResourcesCount, setManagedResourcesCount] = useState<number>(0);

    useEffect(() => {
        if (!canShowOverview) {
            return;
        }
        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
            const plural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
            const group = getAnnotation(annotations, annotationPrefix, 'composite-group');
            const version = getAnnotation(annotations, annotationPrefix, 'composite-version');
            const name = getAnnotation(annotations, annotationPrefix, 'composite-name');
            const clusterOfComposite = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const scope = getAnnotation(annotations, annotationPrefix, 'crossplane-scope') as 'Namespaced' | 'Cluster';
            const namespace = getAnnotation(annotations, annotationPrefix, 'composite-namespace') || 'default';
            if (!plural || !group || !version || !name || !clusterOfComposite) {
                return;
            }
            try {
                const response = await crossplaneApi.getV2ResourceGraph({
                    clusterName: clusterOfComposite,
                    namespace,
                    name,
                    group,
                    version,
                    plural,
                    scope,
                });

                const compositeResource = response.resources[0]; // First resource is always the composite
                if (compositeResource) {
                    setComposite(compositeResource);
                    setManagedResourcesCount(compositeResource.spec?.crossplane?.resourceRefs?.length || 0);
                }
            } catch (error) {
                // ignore
            }
        };
        fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crossplaneApi, entity, canShowOverview]);

    if (!canShowOverview) {
        return (
          <Card style={{ width: '450px' }}>
          <CardBody>
            <Text variant="title-small" weight="bold" style={{ display: 'block', textAlign: 'center' }}>
              Crossplane Overview
            </Text>
          <Box m="2">
            <Text>
              You don't have permissions to view composite resources
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
                    <Text variant="title-small" weight="bold">Crossplane v2 Overview</Text>
                </Box>
                {composite ? (
                    <Box>
                        <Grid.Root columns="12" gap="4">
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Kind</Text>
                                <Text variant="body-small">{composite.kind}</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Synced</Text>
                                <TooltipTrigger>
                                    <Text variant="body-small" style={{ display: 'inline-block' }}>
                                        {renderStatusIcon(composite.status?.conditions?.find((condition: any) => condition.type === 'Synced')?.status || 'Unknown')}
                                    </Text>
                                    <Tooltip className={styles.wideTooltip}>
                                        {renderConditionTooltip(composite.status?.conditions?.find((condition: any) => condition.type === 'Synced') || {})}
                                    </Tooltip>
                                </TooltipTrigger>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Name</Text>
                                <Text variant="body-small">{composite.metadata?.name}</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Ready</Text>
                                <TooltipTrigger>
                                    <Text variant="body-small" style={{ display: 'inline-block' }}>
                                        {renderStatusIcon(composite.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status || 'Unknown')}
                                    </Text>
                                    <Tooltip className={styles.wideTooltip}>
                                        {renderConditionTooltip(composite.status?.conditions?.find((condition: any) => condition.type === 'Ready') || {})}
                                    </Tooltip>
                                </TooltipTrigger>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Namespace</Text>
                                <Text variant="body-small">{composite.metadata?.namespace}</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Managed Resources</Text>
                                <Text variant="body-small">{managedResourcesCount}</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Cluster</Text>
                                <Text variant="body-small">{entity.metadata?.annotations?.['backstage.io/managed-by-location'].split(": ")[1] || "Unknown" }</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Composition</Text>
                                <Text variant="body-small">{getAnnotation(entity.metadata?.annotations || {}, annotationPrefix, 'composition-name') || "Unknown" }</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>XR Scope</Text>
                                <Text variant="body-small">{getAnnotation(entity.metadata?.annotations || {}, annotationPrefix, 'crossplane-scope') || 'Unknown'}</Text>
                            </Grid.Item>
                        </Grid.Root>
                    </Box>
                ) : (
                    <Text>Loading...</Text>
                )}
            </CardBody>
        </Card>
    );
};

export default CrossplaneV2OverviewCard;
