import { useState, useEffect } from 'react';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
// `useTheme` is kept narrowly to feed `react-syntax-highlighter`, a third-party library that
// needs a real JS style object, not a CSS custom property.
import { useTheme, Drawer } from '@material-ui/core';
import {
    Accordion,
    AccordionPanel,
    AccordionTrigger,
    Box,
    Button,
    ButtonIcon,
    Flex,
    Text,
} from '@backstage/ui';
import { Progress, Table, TableColumn, CopyTextButton } from '@backstage/core-components';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import YAML from 'js-yaml';
import { RiCloseLine, RiEyeLine } from '@remixicon/react';
import { saveAs } from 'file-saver';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco, dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { usePermission } from '@backstage/plugin-permission-react';
import { listResourcesPermission, listSecretsPermission, showEventsResourcesPermission, viewSecretsPermission, viewYamlResourcesPermission } from '@terasky/backstage-plugin-kubernetes-resources-common';

interface ExtendedKubernetesObject extends KubernetesObject {
    apiVersion?: string;
    status?: {
        conditions?: Array<{
            type: string;
            status: string;
            reason?: string;
            message?: string;
            lastTransitionTime?: string;
        }>;
    };
}

interface DependencyResource {
  kind: string;
  plural: string;
  name: string;
  namespace?: string;
  apiVersion: string;
  dependants?: DependencyResource[];
}

const removeManagedFields = (resource: KubernetesObject) => {
    const resourceCopy = JSON.parse(JSON.stringify(resource)); // Deep copy the resource
    if (resourceCopy.metadata) {
        if (resourceCopy.metadata.managedFields) {
            delete resourceCopy.metadata.managedFields;
        }
        if (resourceCopy.metadata.annotations && resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) {
            delete resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"];
        }
    }
    return resourceCopy;
};

// Add this helper function after the removeManagedFields function
const deduplicateResources = (resources: ExtendedKubernetesObject[]): KubernetesObject[] => {
    const seen = new Set<string>();
    return resources.filter(resource => {
        const key = `${resource.apiVersion}/${resource.kind}/${resource.metadata?.namespace || 'cluster'}/${resource.metadata?.name}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

// Add this helper function after the deduplicateResources function
const parallelProcess = async <T, R>(
    items: T[],
    processItem: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> => {
    const results: R[] = [];
    const inProgress = new Set<Promise<void>>();

    for (const item of items) {
        if (inProgress.size >= concurrency) {
            await Promise.race(inProgress);
        }

        const promise: Promise<void> = new Promise<void>(async (resolve) => {
            try {
                const result = await processItem(item);
                results.push(result);
            } finally {
                inProgress.delete(promise);
                resolve();
            }
        });
        inProgress.add(promise);
    }

    await Promise.all(inProgress);
    return results;
};

const KubernetesResourcesPage = () => {
    const { entity } = useEntity();
    const theme = useTheme();
    const kubernetesApi = useApi(kubernetesApiRef);
    const identityApi = useApi(identityApiRef);
    const configApi = useApi(configApiRef); // Move this to the top level
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('kubernetesResources.enablePermissions') ?? false;
    const annotationPrefix = config.getOptionalString('kubernetesResources.annotationPrefix') ?? 'terasky.backstage.io';
    const [resources, setResources] = useState<Array<ExtendedKubernetesObject>>([]);
    const [selectedResource, setSelectedResource] = useState<ExtendedKubernetesObject | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [events, setEvents] = useState<Array<any>>([]);
    const [drawerContent, setDrawerContent] = useState<'yaml' | 'events'>('yaml');
    const [loading, setLoading] = useState(true);

    const canListResourcesTemp = usePermission({ permission: listResourcesPermission }).allowed;
    const canListResources = enablePermissions ? canListResourcesTemp : true;

    const canListSecretsTemp = usePermission({ permission: listSecretsPermission }).allowed;
    const canListSecrets = enablePermissions ? canListSecretsTemp : true;

    const canShowEventsTemp = usePermission({ permission: showEventsResourcesPermission }).allowed;
    const canShowEvents = enablePermissions ? canShowEventsTemp : true;

    const canViewSecretsTemp = usePermission({ permission: viewSecretsPermission }).allowed;
    const canViewSecrets = enablePermissions ? canViewSecretsTemp : true;

    const canViewYamlTemp = usePermission({ permission: viewYamlResourcesPermission }).allowed;
    const canViewYaml = enablePermissions ? canViewYamlTemp : true;

    const processResourceDependencies = async (deps: DependencyResource, clusterName: string): Promise<KubernetesObject[]> => {
        const results: KubernetesObject[] = [];
        const concurrency = config.getOptionalNumber('kubernetesResources.concurrency') ?? 10;
        
        // Process current resource
        const baseApiPath = deps.apiVersion.startsWith('/') ? '/api' : '/apis';
        const apiVersion = deps.apiVersion.startsWith('/') ? deps.apiVersion.slice(1) : deps.apiVersion;
        
        const resourcePath = deps.namespace 
            ? `${baseApiPath}/${apiVersion}/namespaces/${deps.namespace}/${deps.plural}/${deps.name}`
            : `${baseApiPath}/${apiVersion}/${deps.plural}/${deps.name}`;

        try {
            const response = await kubernetesApi.proxy({
                clusterName,
                path: resourcePath,
                init: { method: 'GET' },
            });
            const resource = await response.json();
            results.push(resource);

            // Process dependants in parallel
            if (deps.dependants && deps.dependants.length > 0) {
                const processDependant = async (dep: DependencyResource): Promise<KubernetesObject[]> => {
                    return processResourceDependencies(dep, clusterName);
                };

                const dependantResults = await parallelProcess(deps.dependants, processDependant, concurrency);
                results.push(...dependantResults.flat());
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Failed to fetch resource ${deps.kind}/${deps.name}:`, error);
        }

        return results;
    };

    const filterSecretsFromDependencies = (deps: DependencyResource): DependencyResource | null => {
        if (deps.kind.toLowerCase() === 'secret') {
            return null;
        }
        
        return {
            ...deps,
            dependants: deps.dependants 
                ? deps.dependants
                    .map(dep => filterSecretsFromDependencies(dep))
                    .filter((dep): dep is DependencyResource => dep !== null)
                : undefined
        };
    };

    useEffect(() => {
        if (!canListResources) {
            setLoading(false);
            return;
        }

        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
            const resourceName = annotations[`${annotationPrefix}/kubernetes-resource-name`];
            const resourceKind = annotations[`${annotationPrefix}/kubernetes-resource-kind`];
            const resourceApiVersion = annotations[`${annotationPrefix}/kubernetes-resource-api-version`];
            const resourceNamespace = annotations[`${annotationPrefix}/kubernetes-resource-namespace`];
            const clusterName = annotations['backstage.io/managed-by-origin-location']?.split(': ')[1];

            if (!resourceName || !resourceKind || !resourceApiVersion || !clusterName) {
                // eslint-disable-next-line no-console
                console.warn('Missing required annotations:', {
                    resourceName,
                    resourceKind,
                    resourceApiVersion,
                    clusterName
                });
                setLoading(false);
                return;
            }

            try {
                // Use kubernetesApi.proxy directly instead of fetch
                const dependencyUrl = `kubernetes-resources/${clusterName}/dependency?kind=${resourceKind}&apiVersion=${resourceApiVersion}&name=${resourceName}${resourceNamespace ? `&namespace=${resourceNamespace}` : ''}`;
                const token = await identityApi.getCredentials(); 
                const backendUrl = configApi.getOptionalString('backend.baseUrl');
                const url = `${backendUrl}/api/proxy/${dependencyUrl}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token.token}`,
                    }
                });
                
                // kubernetesApi.proxy({
                //     clusterName,
                //     path: dependencyUrl,
                //     init: { method: 'GET' },
                // });
                
                const dependencyData: DependencyResource = await response.json();
                const filteredDependencyData = canListSecrets 
                ? dependencyData 
                : filterSecretsFromDependencies(dependencyData);

                if (filteredDependencyData) {
                    const allResources = await processResourceDependencies(filteredDependencyData, clusterName);
                    const uniqueResources = deduplicateResources(allResources);
                    setResources(uniqueResources);
                } else {
                    setResources([]);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entity, kubernetesApi, configApi, canListResources, canListSecrets]);

    const handleGetEvents = async (resource: KubernetesObject) => {
        const namespace = resource.metadata?.namespace || 'default';
        const name = resource.metadata?.name;
        const clusterOfClaim = entity.metadata.annotations?.['backstage.io/managed-by-location'].split(": ")[1];

        if (!namespace || !name || !clusterOfClaim) {
            return;
        }

        const url = `/api/v1/namespaces/${namespace}/events?fieldSelector=involvedObject.name=${name}`;

        try {
            const response = await kubernetesApi.proxy({
                clusterName: clusterOfClaim,
                path: url,
                init: { method: 'GET' },
            });
            const eventsResponse = await response.json();
            setEvents(eventsResponse.items);
        } catch (error) {
            throw error;
        }
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedResource(null);
        setEvents([]);
    };

    const handleDownloadYaml = (resource: KubernetesObject) => {
        const yamlContent = YAML.dump(removeManagedFields(resource));
        const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
        const fileName = `${resource.kind}-${resource.metadata?.name}.yaml`;
        saveAs(blob, fileName);
    };

    const handleViewYaml = (resource: KubernetesObject) => {
        setSelectedResource(resource);
        setDrawerContent('yaml');
        setDrawerOpen(true);
    };

    const handleViewEvents = async (resource: KubernetesObject) => {
        setSelectedResource(resource);
        setDrawerContent('events');
        setDrawerOpen(true);
        await handleGetEvents(resource);
    };

    // Group resources by kind
    const groupedResources = resources.reduce((acc, resource) => {
        const kind = resource.kind || 'Unknown';
        if (!acc[kind]) {
            acc[kind] = [];
        }
        acc[kind].push(resource);
        return acc;
    }, {} as Record<string, ExtendedKubernetesObject[]>);

    const renderResourceTable = (kindResources: ExtendedKubernetesObject[], kind: string) => {
        const hasNamespace = kindResources.some(r => r.metadata?.namespace);
        const columns: TableColumn<ExtendedKubernetesObject>[] = [
            { title: 'Name', field: 'metadata.name' },
            ...(hasNamespace ? [{ title: 'Namespace', field: 'metadata.namespace' }] : []),
            {
                title: 'Conditions',
                render: (resource: ExtendedKubernetesObject) => (
                    <>
                        {(resource.status?.conditions || []).map((condition: any, index: number) => (
                            <div key={index}>
                                {condition.type}: {condition.status}
                            </div>
                        ))}
                    </>
                ),
            },
            {
                title: 'Actions',
                render: (resource: ExtendedKubernetesObject) => (
                    <Flex gap="2">
                        <Button
                            size="small"
                            variant="secondary"
                            iconStart={<RiEyeLine />}
                            onPress={() => handleViewYaml(resource)}
                            isDisabled={!canViewYaml || (resource.kind === 'Secret' && !canViewSecrets)}
                        >
                            YAML
                        </Button>
                        <Button
                            size="small"
                            variant="secondary"
                            iconStart={<RiEyeLine />}
                            onPress={() => handleViewEvents(resource)}
                            isDisabled={!canShowEvents}
                        >
                            Events
                        </Button>
                    </Flex>
                ),
            },
        ];

        return (
            <Accordion key={kind}>
                <AccordionTrigger>
                    <Text variant="title-small" weight="bold">{kind}</Text>
                </AccordionTrigger>
                <AccordionPanel>
                    <Table options={{ search: false, paging: false }} columns={columns} data={kindResources} />
                </AccordionPanel>
            </Accordion>
        );
    };

    if (!canListResources) {
        return (
            <Text variant="title-small" weight="bold" style={{ color: 'var(--bui-fg-negative)' }}>
                You do not have permission to view Kubernetes resources.
            </Text>
        );
    }

    if (loading) {
        return <Progress />;
    }

    const eventColumns: TableColumn<any>[] = [
        { title: 'Type', field: 'type' },
        { title: 'Reason', field: 'reason' },
        { title: 'Message', field: 'message' },
        { title: 'First Seen', field: 'firstTimestamp' },
        { title: 'Last Seen', field: 'lastTimestamp' },
    ];

    return (
        <Box>
            <Text variant="title-small" weight="bold" style={{ marginBottom: 'var(--bui-space-4)', display: 'block' }}>
                Kubernetes Resources
            </Text>
            {Object.entries(groupedResources).map(([kind, kindResources]) =>
                renderResourceTable(kindResources, kind)
            )}
            <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
                <Box style={{ width: '50vw', padding: 'var(--bui-space-4)', backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
                    <Flex align="center" justify="between" style={{ marginBottom: 'var(--bui-space-4)' }}>
                        <Text variant="title-small" weight="bold">
                            {drawerContent === 'yaml' ? 'Kubernetes Manifest' : 'Kubernetes Events'}
                        </Text>
                        <ButtonIcon aria-label="Close" icon={<RiCloseLine />} onPress={handleCloseDrawer} />
                    </Flex>
                    {selectedResource && drawerContent === 'yaml' && (
                        <>
                            <Box style={{ maxHeight: '80vh', overflow: 'auto', border: '1px solid var(--bui-border-1)', padding: 'var(--bui-space-2)' }}>
                                <Flex gap="2" mb="4">
                                    <CopyTextButton text={YAML.dump(removeManagedFields(selectedResource))} aria-label="Copy manifest to clipboard" />
                                    <Button variant="primary" onPress={() => handleDownloadYaml(selectedResource)}>
                                        Download YAML
                                    </Button>
                                </Flex>
                                <SyntaxHighlighter language="yaml" style={theme.palette.type === 'dark' ? dark : docco}>
                                    {YAML.dump(removeManagedFields(selectedResource))}
                                </SyntaxHighlighter>
                            </Box>
                        </>
                    )}
                    {selectedResource && drawerContent === 'events' && (
                        <>
                            <Box style={{ maxHeight: '80vh', overflow: 'auto', border: '1px solid var(--bui-border-1)', padding: 'var(--bui-space-2)' }}>
                                <Table options={{ search: false, paging: false }} columns={eventColumns} data={events} />
                            </Box>
                        </>
                    )}
                </Box>
            </Drawer>
        </Box>
    );
};

export default KubernetesResourcesPage;