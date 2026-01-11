import { useState, useEffect } from 'react';
import { useTheme, Drawer, IconButton, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, CircularProgress } from '@material-ui/core';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import YAML from 'js-yaml';
import CloseIcon from '@material-ui/icons/Close';
import { CopyToClipboard } from 'react-copy-to-clipboard';
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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: any[], edges: any[]) => {
    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = 'left';
        node.sourcePosition = 'right';

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
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
            console.error(`Failed to fetch resource ${deps.kind}/${deps.name}:`, error);
        }

        return results;
    };

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
    
            let promiseToAdd: Promise<void>;
            const promise = new Promise<void>(async (resolve) => {
                try {
                    const result = await processItem(item);
                    results.push(result);
                } finally {
                    inProgress.delete(promiseToAdd);
                    resolve();
                }
            });
            promiseToAdd = promise;
            inProgress.add(promiseToAdd);
        }
    
        await Promise.all(inProgress);
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
                    type: 'smoothstep',
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
                console.error('Failed to fetch resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
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
        return <CircularProgress />;
    }
    if (!canShowResourceGraph) {
        return <Typography>You don't have permissions to view the resource graph</Typography>;
    }

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
                <div style={{ width: '50vw', padding: '16px', backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
                    <IconButton onClick={handleCloseDrawer}>
                        <CloseIcon />
                    </IconButton>
                    {selectedResource && (
                        <>
                            <Typography variant="h4" gutterBottom>Kubernetes Manifest</Typography>
                            <Box style={{ maxHeight: '40em', overflow: 'auto', border: '1px solid #ccc', padding: '8px' }}>
                                <Box mb={2}>
                                    <Typography variant="h4">Actions</Typography>
                                    <Box display="flex" justifyContent="flex-start" mt={1}>
                                        <CopyToClipboard text={YAML.dump(removeManagedFields(selectedResource))}>
                                            <Button variant="contained" color="primary" style={{ marginRight: '8px' }}>Copy to Clipboard</Button>
                                        </CopyToClipboard>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleDownloadYaml(selectedResource)}
                                        >
                                            Download YAML
                                        </Button>
                                    </Box>
                                </Box>
                                <SyntaxHighlighter language="yaml" style={theme.palette.type === 'dark' ? dark : docco}>
                                    {YAML.dump(removeManagedFields(selectedResource))}
                                </SyntaxHighlighter>
                            </Box>
                            <Typography variant="h4" gutterBottom>Kubernetes Events</Typography>
                            <Box style={{ maxHeight: '40em', overflow: 'auto', border: '1px solid #ccc', padding: '8px' }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Reason</TableCell>
                                            <TableCell>Message</TableCell>
                                            <TableCell>First Seen</TableCell>
                                            <TableCell>Last Seen</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {events.map(event => (
                                            <TableRow key={event.metadata?.uid}>
                                                <TableCell>{event.type}</TableCell>
                                                <TableCell>{event.reason}</TableCell>
                                                <TableCell>{event.message}</TableCell>
                                                <TableCell>{event.firstTimestamp}</TableCell>
                                                <TableCell>{event.lastTimestamp}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </>
                    )}
                </div>
            </Drawer>
        </ReactFlowProvider>
    );
};

export default KubernetesResourceGraph;