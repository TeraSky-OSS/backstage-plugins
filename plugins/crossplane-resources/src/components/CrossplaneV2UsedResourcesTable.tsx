import { useState, useEffect } from 'react';
import { useTheme, Table, TableBody, TableCell, TableHead, TableRow, Paper, Button, Drawer, IconButton, TableSortLabel, Box, Dialog, DialogTitle, DialogContent, Typography } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import YAML from 'js-yaml';
import CloseIcon from '@material-ui/icons/Close';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { usePermission } from '@backstage/plugin-permission-react';
import { listAdditionalResourcesPermission, viewYamlAdditionalResourcesPermission, showEventsAdditionalResourcesPermission } from '@terasky/backstage-plugin-crossplane-common';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import pluralize from 'pluralize';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { saveAs } from 'file-saver';

interface ExtendedKubernetesObject extends KubernetesObject {
    status?: {
        conditions?: Array<{ type: string; status: string }>;
    };
    spec?: {
        package?: string;
        crossplane?: {
            resourceRefs?: any[];
        };
    };
}
const removeManagedFields = (resource: KubernetesObject) => {
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

const CrossplaneV2UsedResourcesTable = () => {
    const { entity } = useEntity();
    const kubernetesApi = useApi(kubernetesApiRef);
    const config = useApi(configApiRef);
    const theme = useTheme();
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const [resources, setResources] = useState<Array<ExtendedKubernetesObject>>([]);
    const [selectedResource, setSelectedResource] = useState<ExtendedKubernetesObject | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
    const [events, setEvents] = useState<Array<any>>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = useState<string>('name');

    const canListResourcesTemp = usePermission({ permission: listAdditionalResourcesPermission }).allowed;
    const canViewYamlTemp = usePermission({ permission: viewYamlAdditionalResourcesPermission }).allowed;
    const canShowEventsTemp = usePermission({ permission: showEventsAdditionalResourcesPermission }).allowed;

    const canListResources = enablePermissions ? canListResourcesTemp : true;
    const canViewYaml = enablePermissions ? canViewYamlTemp : true;
    const canShowEvents = enablePermissions ? canShowEventsTemp : true;

    useEffect(() => {
        if (!canListResources) {
            return;
        }
        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
            const plural = annotations['terasky.backstage.io/composite-plural'];
            const group = annotations['terasky.backstage.io/composite-group'];
            const version = annotations['terasky.backstage.io/composite-version'];
            const name = annotations['terasky.backstage.io/composite-name'];
            const clusterOfComposite = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const scope = annotations['terasky.backstage.io/crossplane-scope'];
            const namespace = entity.metadata.namespace || annotations['namespace'] || 'default';
            if (!plural || !group || !version || !name || !clusterOfComposite) {
                return;
            }
            try {
                // Fetch related resources (CRD, Composition, Functions)
                const xrdPlural = annotations['terasky.backstage.io/composite-plural'];
                const xrdGroup = annotations['terasky.backstage.io/composite-group'];
                const xrdName = `${xrdPlural}.${xrdGroup}`;
                const compositionName = annotations['terasky.backstage.io/composition-name'];
                const compositionFunctions = annotations['terasky.backstage.io/composition-functions']?.split(',') || [];

                // CRD
                if (xrdName) {
                    const xrdUrl = `/apis/apiextensions.crossplane.io/v1/compositeresourcedefinitions/${xrdName}`;
                    const xrdResponse = await kubernetesApi.proxy({
                        clusterName: clusterOfComposite,
                        path: xrdUrl,
                        init: { method: 'GET' },
                    });
                    const xrdResource = await xrdResponse.json();
                    setResources(prevResources => [...prevResources, xrdResource]);
                }
                // Composition
                if (compositionName) {
                    const compositionUrl = `/apis/apiextensions.crossplane.io/v1/compositions/${compositionName}`;
                    const compositionResponse = await kubernetesApi.proxy({
                        clusterName: clusterOfComposite,
                        path: compositionUrl,
                        init: { method: 'GET' },
                    });
                    const compositionResource = await compositionResponse.json();
                    setResources(prevResources => [...prevResources, compositionResource]);
                }
                // Functions
                for (const functionName of compositionFunctions) {
                    if (functionName !== "") {
                        const functionUrl = `/apis/pkg.crossplane.io/v1beta1/functions/${functionName}`;
                        const functionResponse = await kubernetesApi.proxy({
                            clusterName: clusterOfComposite,
                            path: functionUrl,
                            init: { method: 'GET' },
                        });
                        const functionResource = await functionResponse.json();
                        if (functionResource.kind === 'Status' && functionResource.status === 'Failure') {
                            setResources(prevResources => [...prevResources, {
                                kind: 'Function',
                                metadata: {
                                    name: functionResource.details.name,
                                },
                                status: {
                                    conditions: [{ type: 'Error', status: functionResource.message }],
                                },
                            }]);
                        } else {
                            setResources(prevResources => [...prevResources, functionResource]);
                        }
                    }
                }
                // Provider resources for MRs (existing logic)
                const compositeUrl = scope === 'Namespaced'
                    ? `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${name}`
                    : `/apis/${group}/${version}/${plural}/${name}`;
                const compositeResponse = await kubernetesApi.proxy({
                    clusterName: clusterOfComposite,
                    path: compositeUrl,
                    init: { method: 'GET' },
                });
                const compositeResource = await compositeResponse.json();
                const resourceRefs = compositeResource.spec?.crossplane?.resourceRefs || [];
                const xrNamespace = (scope === 'Namespaced') ? (compositeResource.metadata?.namespace || namespace) : undefined;
                const uniqueManagedResources = Array.from(new Set(resourceRefs.map((ref: { kind: any; apiVersion: any; }) => `${ref.kind}-${ref.apiVersion}`)))
                    .map(key => {
                        const ref = resourceRefs.find((ref: { kind: any; apiVersion: any; }) => `${ref.kind}-${ref.apiVersion}` === key);
                        if (ref && !ref.namespace && scope === 'Namespaced') {
                            return { ...ref, namespace: xrNamespace };
                        }
                        return ref;
                    });
                const providerResourcesSet = new Set();
                const providerResources = await Promise.all(uniqueManagedResources.map(async (ref: any) => {
                    let apiGroup = '';

                    if (ref.apiVersion.includes('/')) {
                        apiGroup = ref.apiVersion.split('/')[0];
                    } else {
                        apiGroup = '';
                    }
                    const kindPlural = pluralize(ref.kind.toLowerCase());
                    let crdUrl = '';
                    if (!apiGroup || apiGroup === 'v1') {
                        crdUrl = `/api/v1/${kindPlural}`;
                    } else {
                        crdUrl = `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${kindPlural}.${apiGroup}`;
                    }
                    const crdResponse = await kubernetesApi.proxy({
                        clusterName: clusterOfComposite,
                        path: crdUrl,
                        init: { method: 'GET' },
                    });
                    const crd = await crdResponse.json();
                    const ownerReferences = crd.metadata?.ownerReferences || [];
                    const providerRefs = ownerReferences.filter((ownerRef: { kind: string; }) => ownerRef.kind === 'Provider');
                    const providerResources = await Promise.all(providerRefs.map(async (providerRef: any) => {
                        const providerKey = `${providerRef.apiVersion}-${providerRef.name}`;
                        if (providerResourcesSet.has(providerKey)) {
                            return null;
                        }
                        providerResourcesSet.add(providerKey);
                        const providerUrl = `/apis/${providerRef.apiVersion}/providers/${providerRef.name}`;
                        const providerResponse = await kubernetesApi.proxy({
                            clusterName: clusterOfComposite,
                            path: providerUrl,
                            init: { method: 'GET' },
                        });
                        const providerResource = await providerResponse.json();
                        return providerResource;
                    }));
                    return providerResources.filter(Boolean);
                }));
                setResources(prevResources => [...prevResources, ...providerResources.flat()]);
            } catch (error) {
                console.error("Error fetching resources:", error);
            }
        };
        setResources([]); // clear before fetching
        fetchResources();
    }, [kubernetesApi, entity, canListResources]);

    const handleViewYaml = (resource: ExtendedKubernetesObject) => {
        if (!canViewYaml) {
            return;
        }
        setSelectedResource(resource);
        setDrawerOpen(true);
    };
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedResource(null);
    };
    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };
    const handleGetEvents = async (resource: ExtendedKubernetesObject) => {
        if (!canShowEvents) {
            return;
        }
        const name = resource.metadata?.name;
        const kind = resource.kind;
        const clusterOfComposite = entity.metadata.annotations?.['backstage.io/managed-by-location'].split(": ")[1];
        if (!name || !clusterOfComposite) {
            return;
        }
        const url = `/api/v1/namespaces/default/events?fieldSelector=involvedObject.name=${name},involvedObject.kind=${kind}`;
        try {
            const response = await kubernetesApi.proxy({
                clusterName: clusterOfComposite,
                path: url,
                init: { method: 'GET' },
            });
            const eventsResponse = await response.json();
            setEvents(eventsResponse.items);
            setEventsDialogOpen(true);
        } catch (error) {
            console.error("Error fetching events:", error);
        }
    };
    const handleCloseEventsDialog = () => {
        setEventsDialogOpen(false);
        setEvents([]);
    };
    const handleDownloadYaml = (resource: any) => {
        const yamlContent = YAML.dump(removeManagedFields(resource));
        const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
        const fileName = `${resource.kind}-${resource.metadata?.name}.yaml`;
        saveAs(blob, fileName);
    };
    const sortedResources = resources.sort((a, b) => {
        if (orderBy === 'name') {
            return (a.metadata?.name || '').localeCompare(b.metadata?.name || '') * (order === 'asc' ? 1 : -1);
        } else if (orderBy === 'creationTimestamp') {
            return (new Date(a.metadata?.creationTimestamp || '')).getTime() - (new Date(b.metadata?.creationTimestamp || '')).getTime() * (order === 'asc' ? 1 : -1);
        } else if (orderBy === 'kind') {
            return (a.kind || '').localeCompare(b.kind || '') * (order === 'asc' ? 1 : -1);
        } else if (orderBy === 'synced') {
            const aSynced = (a as any).status?.conditions?.some((condition: any) => condition.type === 'Synced') ? 'Yes' : 'No';
            const bSynced = (b as any).status?.conditions?.some((condition: any) => condition.type === 'Synced') ? 'Yes' : 'No';
            return aSynced.localeCompare(bSynced) * (order === 'asc' ? 1 : -1);
        } else if (orderBy === 'ready') {
            const aReady = (a as any).status?.conditions?.some((condition: any) => condition.type === 'Ready') ? 'Yes' : 'No';
            const bReady = (b as any).status?.conditions?.some((condition: any) => condition.type === 'Ready') ? 'Yes' : 'No';
            return aReady.localeCompare(bReady) * (order === 'asc' ? 1 : -1);
        }
        return 0;
    });
    if (!canListResources) {
        return <Typography>You don't have permissions to view additional resources</Typography>;
    }
    return (
        <>
            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sortDirection={orderBy === 'kind' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'kind'}
                                    direction={orderBy === 'kind' ? order : 'asc'}
                                    onClick={() => handleRequestSort('kind')}
                                >
                                    Type
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={orderBy === 'name' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderBy === 'name' ? order : 'asc'}
                                    onClick={() => handleRequestSort('name')}
                                >
                                    Name
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Namespace</TableCell>
                            <TableCell sortDirection={orderBy === 'synced' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'synced'}
                                    direction={orderBy === 'synced' ? order : 'asc'}
                                    onClick={() => handleRequestSort('synced')}
                                >
                                    Synced
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={orderBy === 'ready' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'ready'}
                                    direction={orderBy === 'ready' ? order : 'asc'}
                                    onClick={() => handleRequestSort('ready')}
                                >
                                    Ready
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Kubernetes YAML</TableCell>
                            <TableCell>Kubernetes Events</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedResources.map(resource => (
                            <TableRow key={resource.metadata?.uid || `${resource.kind}-${Math.random()}`}>
                                <TableCell>{resource.kind}</TableCell>
                                <TableCell>{resource.metadata?.name}</TableCell>
                                <TableCell>{resource.metadata?.namespace || '-'}</TableCell>
                                <TableCell>{(resource as any).status?.conditions?.some((condition: any) => condition.type === 'Synced') ? 'Yes' : 'No'}</TableCell>
                                <TableCell>{(resource as any).status?.conditions?.some((condition: any) => condition.type === 'Ready') ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                    <Button onClick={() => handleViewYaml(resource)} disabled={!canViewYaml}>View YAML</Button>
                                </TableCell>
                                <TableCell>
                                    <Button onClick={() => handleGetEvents(resource)} disabled={!canShowEvents}>Show Events</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
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
                        </>
                    )}
                </div>
            </Drawer>
            <Dialog open={eventsDialogOpen} onClose={handleCloseEventsDialog} maxWidth="md" fullWidth>
                <DialogTitle>Events</DialogTitle>
                <DialogContent>
                    {events.length === 0 ? (
                        <Typography>No events found.</Typography>
                    ) : (
                        events.map((event, idx) => (
                            <Box key={idx} mb={2}>
                                <Typography variant="body2">{event.message}</Typography>
                            </Box>
                        ))
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CrossplaneV2UsedResourcesTable; 