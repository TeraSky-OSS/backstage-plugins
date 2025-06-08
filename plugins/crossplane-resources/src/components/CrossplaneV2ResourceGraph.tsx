import { useState, useEffect } from 'react';
import { useTheme, Drawer, IconButton, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, CircularProgress } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import YAML from 'js-yaml';
import CloseIcon from '@material-ui/icons/Close';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { saveAs } from 'file-saver';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco, dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import ReactFlow, { ReactFlowProvider, MiniMap, Controls, Background } from 'react-flow-renderer';
import { usePermission } from '@backstage/plugin-permission-react';
import { showResourceGraph } from '@terasky/backstage-plugin-crossplane-common';
import pluralize from 'pluralize';
import dagre from 'dagre';

const removeManagedFields = (resource: any) => {
    const resourceCopy = JSON.parse(JSON.stringify(resource));
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
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = 'left';
        node.sourcePosition = 'right';
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });
    return { nodes, edges };
};

const CrossplaneV2ResourceGraph = () => {
    const { entity } = useEntity();
    const theme = useTheme();
    const kubernetesApi = useApi(kubernetesApiRef);
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const [resources, setResources] = useState<Array<any>>([]);
    const [selectedResource, setSelectedResource] = useState<any | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [elements, setElements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Array<any>>([]);

    const canShowResourceGraphTemp = usePermission({ permission: showResourceGraph }).allowed;
    const canShowResourceGraph = enablePermissions ? canShowResourceGraphTemp : true;

    useEffect(() => {
        if (!canShowResourceGraph) {
            setLoading(false);
            return;
        }

        const fetchResources = async () => {
            setLoading(true);
            const annotations = entity.metadata.annotations || {};
            const plural = annotations['terasky.backstage.io/composite-plural'];
            const group = annotations['terasky.backstage.io/composite-group'];
            const version = annotations['terasky.backstage.io/composite-version'];
            const name = annotations['terasky.backstage.io/composite-name'];
            const clusterOfComposite = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const scope = annotations['terasky.backstage.io/crossplane-scope'];
            const namespace = entity.metadata.namespace || annotations['namespace'] || 'default';
            if (!plural || !group || !version || !name || !clusterOfComposite) {
                setLoading(false);
                return;
            }
            let url = '';
            if (scope === 'Namespaced') {
                url = `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${name}`;
            } else {
                url = `/apis/${group}/${version}/${plural}/${name}`;
            }
            try {
                const response = await kubernetesApi.proxy({
                    clusterName: clusterOfComposite,
                    path: url,
                    init: { method: 'GET' },
                });
                const xrResource = await response.json();
                const resourceRefs = xrResource.spec?.crossplane?.resourceRefs || [];
                const managedResources = await Promise.all(resourceRefs.map(async (ref: any) => {
                    let apiGroup = '';
                    let apiVersion = '';
                    if (ref.apiVersion.includes('/')) {
                        [apiGroup, apiVersion] = ref.apiVersion.split('/');
                    } else {
                        apiGroup = '';
                        apiVersion = ref.apiVersion;
                    }
                    const kindPlural = pluralize(ref.kind.toLowerCase());
                    let mrNamespace = ref.namespace;
                    if (!mrNamespace && scope === 'Namespaced') {
                        mrNamespace = xrResource.metadata?.namespace || namespace;
                    }
                    let resourceUrl = '';
                    if (mrNamespace) {
                        if (!apiGroup || apiGroup === 'v1') {
                            resourceUrl = `/api/v1/namespaces/${mrNamespace}/${kindPlural}/${ref.name}`;
                        } else {
                            resourceUrl = `/apis/${apiGroup}/${apiVersion}/namespaces/${mrNamespace}/${kindPlural}/${ref.name}`;
                        }
                    } else {
                        if (!apiGroup || apiGroup === 'v1') {
                            resourceUrl = `/api/v1/${kindPlural}/${ref.name}`;
                        } else {
                            resourceUrl = `/apis/${apiGroup}/${apiVersion}/${kindPlural}/${ref.name}`;
                        }
                    }
                    const resourceResponse = await kubernetesApi.proxy({
                        clusterName: clusterOfComposite,
                        path: resourceUrl,
                        init: { method: 'GET' },
                    });
                    return await resourceResponse.json();
                }));
                setResources([xrResource, ...managedResources]);
                // --- Generate hierarchical graph ---
                const nodes = [];
                const edges: any[] = [];
                // XR as root
                const xrNodeId = xrResource.metadata?.uid || `XR-${xrResource.metadata?.name}`;
                nodes.push({
                    id: xrNodeId,
                    data: { label: `${xrResource.kind}: ${xrResource.metadata?.name}` },
                    position: { x: 0, y: 0 },
                    style: { border: '2px solid #1976d2', backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary },
                });
                // MRs as children
                managedResources.forEach((mr, idx) => {
                    const mrNodeId = mr.metadata?.uid || `${mr.kind}-${mr.metadata?.name}`;
                    nodes.push({
                        id: mrNodeId,
                        data: { label: `${mr.kind}: ${mr.metadata?.name}` },
                        position: { x: 100 * (idx + 1), y: 100 },
                        style: { border: '2px solid #43a047', backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary },
                    });
                    edges.push({
                        id: `${xrNodeId}->${mrNodeId}`,
                        source: xrNodeId,
                        target: mrNodeId,
                        type: 'smoothstep',
                    });
                });
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
                setElements([...layoutedNodes, ...layoutedEdges]);
                // --- End hierarchical graph ---
            } catch (error) {
                setResources([]);
                setElements([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, [kubernetesApi, entity, canShowResourceGraph, theme.palette.background.paper, theme.palette.text.primary]);

    // Fetch events for a resource
    const handleGetEvents = async (resource: any) => {
        if (!resource) return;
        const name = resource.metadata?.name;
        const kind = resource.kind;
        const namespace = resource.metadata?.namespace || 'default';
        const clusterOfComposite = entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1];
        if (!name || !kind || !clusterOfComposite) {
            setEvents([]);
            return;
        }
        // Use kind in fieldSelector for more accurate filtering
        const url = `/api/v1/namespaces/${namespace}/events?fieldSelector=involvedObject.name=${name},involvedObject.kind=${kind}`;
        try {
            const response = await kubernetesApi.proxy({
                clusterName: clusterOfComposite,
                path: url,
                init: { method: 'GET' },
            });
            const eventsResponse = await response.json();
            setEvents(eventsResponse.items || []);
        } catch (error) {
            setEvents([]);
        }
    };

    // Open drawer and fetch events
    // const handleViewYaml = async (resource: any) => {
    //     setSelectedResource(resource);
    //     setDrawerOpen(true);
    //     await handleGetEvents(resource);
    // };
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedResource(null);
        setEvents([]);
    };
    const handleDownloadYaml = (resource: any) => {
        const yamlContent = YAML.dump(removeManagedFields(resource));
        const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
        const fileName = `${resource.kind}-${resource.metadata?.name}.yaml`;
        saveAs(blob, fileName);
    };

    // Node click handler for ReactFlow
    const handleElementClick = async (_event: any, element: any) => {
        const resource = resources.find(res => (res.metadata?.uid || `${res.kind}-${res.metadata?.name}`) === element.id);
        if (resource) {
            setSelectedResource(resource);
            setDrawerOpen(true);
            await handleGetEvents(resource);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Crossplane v2 Resource Graph</Typography>
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                    <CircularProgress />
                </Box>
            ) : (
                <ReactFlowProvider>
                    <Box height={400}>
                        <ReactFlow
                            nodes={elements.filter(el => !el.source)}
                            edges={elements.filter(el => el.source)}
                            onNodeClick={handleElementClick}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <MiniMap />
                            <Controls />
                            <Background />
                        </ReactFlow>
                    </Box>
                </ReactFlowProvider>
            )}
            <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
                <div style={{ width: '50vw', padding: '16px' }}>
                    <IconButton onClick={handleCloseDrawer}>
                        <CloseIcon />
                    </IconButton>
                    {selectedResource && (
                        <>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">{selectedResource.kind} / {selectedResource.metadata?.name}</Typography>
                                <Box>
                                    <CopyToClipboard text={YAML.dump(removeManagedFields(selectedResource))}>
                                        <Button variant="contained" color="primary">Copy to Clipboard</Button>
                                    </CopyToClipboard>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => handleDownloadYaml(selectedResource)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Download YAML
                                    </Button>
                                </Box>
                            </Box>
                            <SyntaxHighlighter language="yaml" style={theme.palette.type === 'dark' ? dark : docco}>
                                {YAML.dump(removeManagedFields(selectedResource))}
                            </SyntaxHighlighter>
                            <Typography variant="h6" gutterBottom style={{ marginTop: 24 }}>Kubernetes Events</Typography>
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
                                        {events.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">No events found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            events.map(event => (
                                                <TableRow key={event.metadata?.uid || `${event.reason}-${event.firstTimestamp}` }>
                                                    <TableCell>{event.type}</TableCell>
                                                    <TableCell>{event.reason}</TableCell>
                                                    <TableCell>{event.message}</TableCell>
                                                    <TableCell>{event.firstTimestamp}</TableCell>
                                                    <TableCell>{event.lastTimestamp}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </>
                    )}
                </div>
            </Drawer>
        </Box>
    );
};

export default CrossplaneV2ResourceGraph; 