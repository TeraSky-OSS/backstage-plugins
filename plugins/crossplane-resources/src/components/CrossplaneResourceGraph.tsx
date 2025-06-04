import { useState, useEffect } from 'react';
import { useTheme, Drawer, IconButton, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, CircularProgress } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
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
import { showResourceGraph } from '@terasky/backstage-plugin-crossplane-common';

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

const CrossplaneResourceGraph = () => {
    const { entity } = useEntity();
    const theme = useTheme();
    const kubernetesApi = useApi(kubernetesApiRef);
    const config = useApi(configApiRef);
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const [resources, setResources] = useState<Array<KubernetesObject>>([]);
    const [selectedResource, setSelectedResource] = useState<KubernetesObject | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [events, setEvents] = useState<Array<any>>([]);
    const [elements, setElements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const canShowResourceGraphTemp = usePermission({ permission: showResourceGraph }).allowed;
    const canShowResourceGraph = enablePermissions ? canShowResourceGraphTemp : true;

    const generateGraphElements = (resourceList: KubernetesObject[]) => {
        const nodes = resourceList.map(resource => {
            const status = (resource as any).status;
            const isSynced = status?.conditions?.some((condition: any) => condition.type === 'Synced');
            const isReady = status?.conditions?.some((condition: any) => condition.type === 'Ready');
            let color = 'red';
            if (isSynced && isReady) {
                color = 'green';
            } else if (isSynced) {
                color = 'yellow';
            }

            return {
                id: resource.metadata?.uid || `${resource.kind}-${Math.random()}`,
                data: { label: `${resource.metadata?.name} (${resource.kind})` },
                position: { x: 0, y: 0 }, // Initial position, will be updated by dagre layout
                style: { border: `2px solid ${color}`, backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary },
            };
        });

        const edges = resourceList.flatMap(resource => {
            const ownerReferences = resource.metadata?.ownerReferences || [];
            const resourceRef = (resource as any).spec?.resourceRef;
            const resourceRefUid = resourceList.find(res => res.metadata?.name === resourceRef?.name && res.kind === resourceRef?.kind)?.metadata?.uid;

            const ownerEdges = ownerReferences.map(owner => ({
                id: `${owner.uid}-${resource.metadata?.uid}`,
                source: owner.uid,
                target: resource.metadata?.uid || `${resource.kind}-${Math.random()}`,
                type: 'smoothstep',
            }));

            const resourceRefEdges = resourceRefUid ? [{
                id: `${resource.metadata?.uid}-${resourceRefUid}`,
                source: resource.metadata?.uid || `${resource.kind}-${Math.random()}`,
                target: resourceRefUid,
                type: 'smoothstep',
            }] : [];

            return [...ownerEdges, ...resourceRefEdges];
        });

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
            const claimName = annotations['terasky.backstage.io/claim-name'];
            const clusterOfClaim = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const plural = annotations['terasky.backstage.io/claim-plural'];
            const group = annotations['terasky.backstage.io/claim-group'];
            const version = annotations['terasky.backstage.io/claim-version'];
            const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
            const namespace = labelSelector.split(',').find(s => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];
            const crdMap: { [name: string]: any } = {};

            try {
                const response = await kubernetesApi.proxy({
                    clusterName: clusterOfClaim,
                    path: '/apis',
                    init: {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json;as=APIGroupDiscoveryList;v=v2;g=apidiscovery.k8s.io,application/json;as=APIGroupDiscoveryList;v=v2beta1;g=apidiscovery.k8s.io,application/json',
                        },
                    },
                });

                const apiGroupDiscoveryList = await response.json();

                apiGroupDiscoveryList.items.forEach((group: any) => {
                    group.versions.forEach((version: any) => {
                        version.resources.forEach((resource: any) => {
                            if (resource.categories?.some((category: string) => ['crossplane', 'managed', 'composite', 'claim'].includes(category))) {
                                crdMap[resource.resource] = {
                                    group: group.metadata.name,
                                    apiVersion: version.version,
                                    plural: resource.resource,
                                };
                            }
                        });
                    });
                });

                const customResources = Object.values(crdMap);

                const resourcesResponse = await kubernetesApi.getCustomObjectsByEntity({
                    entity,
                    auth: { type: 'serviceAccount' },
                    customResources,
                });

                const allResources = resourcesResponse.items.flatMap(item =>
                    item.resources.flatMap(resourceGroup => resourceGroup.resources)
                ).filter(resource => resource);
                // Fetch the claim resource
                const resourceName = claimName;
                const url = `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${resourceName}`;

                try {
                    const response = await kubernetesApi.proxy({
                        clusterName: clusterOfClaim,
                        path: url,
                        init: { method: 'GET' },
                    });
                    const claimResource = await response.json();
                    allResources.push(claimResource);
                } catch (error) {
                    throw error
                }

                setResources(allResources);
                generateGraphElements(allResources);
            } catch (error) {
                throw error
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, [kubernetesApi, entity, canShowResourceGraph]);


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

export default CrossplaneResourceGraph;