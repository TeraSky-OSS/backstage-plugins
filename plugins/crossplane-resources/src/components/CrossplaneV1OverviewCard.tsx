import { useState, useEffect } from 'react';
import { Box, Card, CardBody, Grid, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { useApi } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import { showOverview } from '@terasky/backstage-plugin-crossplane-common';
import { configApiRef } from '@backstage/core-plugin-api';
import { getAnnotation, getAnnotationPrefix } from './annotationUtils';
import { RiCheckboxCircleLine, RiCloseCircleLine } from '@remixicon/react';
import styles from './CrossplaneV1OverviewCard.module.css';

interface ExtendedKubernetesObject extends KubernetesObject {
    status?: {
        conditions?: Array<{ type: string, status: string, reason?: string, lastTransitionTime?: string, message?: string }>;
    };
    spec?: {
        resourceRef?: {
            apiVersion?: string;
            kind?: string;
            name?: string;
        };
        resourceRefs?: Array<any>;
    };
}

const CrossplaneOverviewCard = () => {
    const { entity } = useEntity();
    const crossplaneApi = useApi(crossplaneApiRef);
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const annotationPrefix = getAnnotationPrefix(config);
    const { allowed: canShowOverviewTemp } = usePermission({ permission: showOverview });
    const canShowOverview = enablePermissions ? canShowOverviewTemp : true;
    const [claim, setClaim] = useState<ExtendedKubernetesObject | null>(null);
    const [managedResourcesCount, setManagedResourcesCount] = useState<number>(0);

    useEffect(() => {
        if (!canShowOverview) {
            return;
        }

        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
            const claimName = getAnnotation(annotations, annotationPrefix, 'claim-name');
            const claimGroup = getAnnotation(annotations, annotationPrefix, 'claim-group');
            const claimVersion = getAnnotation(annotations, annotationPrefix, 'claim-version');
            const claimPlural = getAnnotation(annotations, annotationPrefix, 'claim-plural');
            const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
            const namespace = labelSelector.split(',').find(s => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];
            const clusterOfClaim = annotations['backstage.io/managed-by-location'].split(": ")[1];
            if (!claimName || !claimPlural || !claimGroup || !claimVersion || !namespace || !clusterOfClaim) {
                return;
            }

            try {
                const response = await crossplaneApi.getResourceGraph({
                    clusterName: clusterOfClaim,
                    namespace,
                    xrdName: claimName,
                    xrdId: claimName,
                    claimId: claimName,
                    claimName,
                    claimGroup,
                    claimVersion,
                    claimPlural,
                });

                const claimResource = response.resources.find(r =>
                  r.kind === getAnnotation(annotations, annotationPrefix, 'claim-kind'),
                );
                if (claimResource) {
                    setClaim(claimResource);
                }

                const compositeResource = response.resources.find(r =>
                  r.kind === getAnnotation(annotations, annotationPrefix, 'composite-kind'),
                );
                if (compositeResource) {
                    setManagedResourcesCount(compositeResource.spec?.resourceRefs?.length || 0);
                }
            } catch (error) {
                throw error;
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
              You don't have permissions to view claim resources
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
                    <Text variant="title-small" weight="bold">Crossplane Overview</Text>
                </Box>
                {claim ? (
                    <Box>
                        <Grid.Root columns="12" gap="4">
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Kind</Text>
                                <Text variant="body-small">{claim.kind}</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Synced</Text>
                                <TooltipTrigger>
                                    <Text variant="body-small" style={{ display: 'inline-block' }}>
                                        {renderStatusIcon(claim.status?.conditions?.find((condition: any) => condition.type === 'Synced')?.status || 'Unknown')}
                                    </Text>
                                    <Tooltip className={styles.wideTooltip}>
                                        {renderConditionTooltip(claim.status?.conditions?.find((condition: any) => condition.type === 'Synced') || {})}
                                    </Tooltip>
                                </TooltipTrigger>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Name</Text>
                                <Text variant="body-small">{claim.metadata?.name}</Text>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Ready</Text>
                                <TooltipTrigger>
                                    <Text variant="body-small" style={{ display: 'inline-block' }}>
                                        {renderStatusIcon(claim.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status || 'Unknown')}
                                    </Text>
                                    <Tooltip className={styles.wideTooltip}>
                                        {renderConditionTooltip(claim.status?.conditions?.find((condition: any) => condition.type === 'Ready') || {})}
                                    </Tooltip>
                                </TooltipTrigger>
                            </Grid.Item>
                            <Grid.Item colSpan={{ xs: '12', sm: '6' }}>
                                <Text variant="body-small" weight="bold" style={{ display: 'block', color: 'var(--bui-fg-secondary)' }}>Namespace</Text>
                                <Text variant="body-small">{claim.metadata?.namespace}</Text>
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
                        </Grid.Root>
                    </Box>
                ) : (
                    <Text>Loading...</Text>
                )}
            </CardBody>
        </Card>
    );
};

export default CrossplaneOverviewCard;
