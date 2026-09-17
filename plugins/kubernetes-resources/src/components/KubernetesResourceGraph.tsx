import { useState, useEffect } from 'react';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
// `useTheme` is kept narrowly to feed `react-syntax-highlighter` and `react-flow-renderer`,
// third-party libraries that need real JS color strings, not CSS custom properties.
import { useTheme, Drawer } from '@material-ui/core';
import { Box, Button, ButtonIcon, Flex, Text } from '@backstage/ui';
import { Progress, Table, TableColumn, CopyTextButton } from '@backstage/core-components';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import YAML from 'js-yaml';
import { RiCloseLine } from '@remixicon/react';
import { saveAs } from 'file-saver';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco, dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import ReactFlow, { ReactFlowProvider, MiniMap, Controls, Background } from 'react-flow-renderer';
import dagre from 'dagre';
import { usePermission } from '@backstage/plugin-permission-react';
import { showResourceGraphPermission } from '@terasky/backstage-plugin-kubernetes-resources-common';

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

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: any[], edges: any[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const pos = dagreGraph.node(node.id);
        node.targetPosition = 'left';
        node.sourcePosition = 'right';
        node.position = {
            x: pos.x - nodeWidth / 2,
            y: pos.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};

const KubernetesResourceGraph = () => {
    const { entity } = useEntity();
    const theme = useTheme();
    const kubernetesApi = useApi(kubernetesApiRef);
    const identityApi = useApi(identityApiRef);
    const configApi = useApi(configApiRef); // Move this to the top level
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('kubernetesResources.enablePermissions') ?? false;
    const annotationPrefix = config.getOptionalString('kubernetesResources.annotationPrefix') ?? 'terasky.backstage.io';
    const [resources, setResources] = useState<Array<KubernetesObject>>([]);
    const [selectedResource, setSelectedResource] = useState<KubernetesObject | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [events, setEvents] = useState<Array<any>>([]);
    const [elements, setElements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const canShowResourceGraphTemp = usePermission({ permission: showResourceGraphPermission }).allowed;
    const canShowResourceGraph = enablePermissions ? canShowResourceGraphTemp : true;

    // Add the parallel processing helper function
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

    const processResourceDependencies = async (deps: DependencyResource, clusterName: string): Promise<KubernetesObject[]> => {
        const results: KubernetesObject[] = [];
        const concurrency = config.getOptionalNumber('kubernetesResources.concurrency') ?? 5;
        
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

    const generateGraphElements = (resourceList: KubernetesObject[], dependencies: DependencyResource) => {
        const nodes = resourceList.map(resource => ({
            id: resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`,
            data: { label: `${resource.metadata?.name} (${resource.kind})` },
            position: { x: 0, y: 0 },
            style: { 
                border: '2px solid blue',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
            },
        }));

        const createEdges = (dep: DependencyResource): any[] => {
            if (!dep.dependants) return [];
            
            return dep.dependants.flatMap(dependant => {
                const sourceResource = resourceList.find(r => 
                    r.kind.toLowerCase() === dep.kind.toLowerCase() && 
                    r.metadata?.name === dep.name &&
                    r.metadata?.namespace === dep.namespace
                );
                const targetResource = resourceList.find(r => 
                    r.kind.toLowerCase() === dependant.kind.toLowerCase() && 
                    r.metadata?.name === dependant.name &&
                    r.metadata?.namespace === dependant.namespace
                );

                const edge = sourceResource && targetResource ? [{
                    id: `${sourceResource.metadata?.uid}-${targetResource.metadata?.uid}`,
                    source: sourceResource.metadata?.uid || `${sourceResource.kind}-${sourceResource.metadata?.name}`,
                    target: targetResource.metadata?.uid || `${targetResource.kind}-${targetResource.metadata?.name}`,
                    type: 'default',
                    animated: true,
                    style: { stroke: theme.palette.primary.main }
                }] : [];

                // Recursively create edges for the dependant's dependants
                return [...edge, ...createEdges(dependant)];
            });
        };

        const edges = createEdges(dependencies);
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setElements([...layoutedNodes, ...layoutedEdges]);
    };

    useEffect(() => {
        if (!canShowResourceGraph) {
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
                const allResources = await processResourceDependencies(dependencyData, clusterName);
                
                setResources(allResources);
                generateGraphElements(allResources, dependencyData);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entity, kubernetesApi, configApi]); // Add configApi to dependencies array

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

    const handleElementClick = async (_event: any, element: any) => {
        const resource = resources.find(res => res.metadata?.uid === element.id);
        if (resource) {
            setSelectedResource(resource);
            setDrawerOpen(true);
            await handleGetEvents(resource); // Fetch events when a resource is selected
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

    if (loading) {
        return <Progress />;
    }
    if (!canShowResourceGraph) {
        return <Text>You don't have permissions to view the resource graph</Text>;
    }

    const eventColumns: TableColumn<any>[] = [
        { title: 'Type', field: 'type' },
        { title: 'Reason', field: 'reason' },
        { title: 'Message', field: 'message' },
        { title: 'First Seen', field: 'firstTimestamp' },
        { title: 'Last Seen', field: 'lastTimestamp' },
    ];

    return (
        <ReactFlowProvider>
            <div style={{ height: '80vh' }}>
                <ReactFlow
                    nodes={elements.filter(el => !el.source)}
                    edges={elements.filter(el => el.source)}
                    onNodeClick={handleElementClick}
                    style={{ width: '100%', height: '100%' }}
                >
                    <MiniMap
                        nodeColor={theme.palette.type === 'dark' ? '#fff' : '#000'}
                        nodeStrokeColor={theme.palette.type === 'dark' ? '#fff' : '#000'}
                        nodeBorderRadius={2}
                        style={{ backgroundColor: theme.palette.background.default }}
                    />
                    <Controls style={{ backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }} />
                    <Background color={theme.palette.type === 'dark' ? '#fff' : '#000'} />
                </ReactFlow>
            </div>
            <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
                <Box style={{ width: '50vw', padding: 'var(--bui-space-4)', backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
                    {selectedResource && (
                        <>
                            <Flex align="center" justify="between" style={{ marginBottom: 'var(--bui-space-4)' }}>
                                <Text variant="title-small" weight="bold">Kubernetes Manifest</Text>
                                <ButtonIcon aria-label="Close" icon={<RiCloseLine />} onPress={handleCloseDrawer} />
                            </Flex>
                            <Box style={{ maxHeight: '40em', overflow: 'auto', border: '1px solid var(--bui-border-1)', padding: 'var(--bui-space-2)' }}>
                                <Box mb="4">
                                    <Text variant="title-x-small" weight="bold">Actions</Text>
                                    <Flex gap="2" mt="2">
                                        <CopyTextButton text={YAML.dump(removeManagedFields(selectedResource))} aria-label="Copy manifest to clipboard" />
                                        <Button variant="primary" onPress={() => handleDownloadYaml(selectedResource)}>
                                            Download YAML
                                        </Button>
                                    </Flex>
                                </Box>
                                <SyntaxHighlighter language="yaml" style={theme.palette.type === 'dark' ? dark : docco}>
                                    {YAML.dump(removeManagedFields(selectedResource))}
                                </SyntaxHighlighter>
                            </Box>
                            <Text variant="title-small" weight="bold" style={{ marginBottom: 'var(--bui-space-4)', display: 'block', marginTop: 'var(--bui-space-4)' }}>Kubernetes Events</Text>
                            <Box style={{ maxHeight: '40em', overflow: 'auto', border: '1px solid var(--bui-border-1)', padding: 'var(--bui-space-2)' }}>
                                <Table options={{ search: false, paging: false }} columns={eventColumns} data={events} />
                            </Box>
                        </>
                    )}
                </Box>
            </Drawer>
        </ReactFlowProvider>
    );
};

export default KubernetesResourceGraph;