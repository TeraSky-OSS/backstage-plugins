import { useState, useEffect } from 'react';
import { useTheme, Table, TableBody, TableCell, TableHead, TableRow, Paper, Button, Drawer, IconButton, TableSortLabel, CircularProgress, Typography, Box, Dialog, DialogTitle, DialogContent } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import YAML from 'js-yaml';
import CloseIcon from '@material-ui/icons/Close';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { usePermission } from '@backstage/plugin-permission-react';
import { listManagedResourcesPermission, viewYamlManagedResourcesPermission, showEventsManagedResourcesPermission } from '@terasky/backstage-plugin-crossplane-common';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import pluralize from 'pluralize';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { saveAs } from 'file-saver';

interface ExtendedKubernetesObject extends KubernetesObject {
    spec?: {
        providerConfigRef?: {
            name?: string;
        };
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

const CrossplaneV2ManagedResources = () => {
    const { entity } = useEntity();
    const kubernetesApi = useApi(kubernetesApiRef);
    const config = useApi(configApiRef);
    const theme = useTheme();
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
    const [resources, setResources] = useState<Array<ExtendedKubernetesObject>>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResource, setSelectedResource] = useState<ExtendedKubernetesObject | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
    const [events, setEvents] = useState<Array<any>>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = useState<string>('name');

    const canListManagedResourcesTemp = usePermission({ permission: listManagedResourcesPermission }).allowed;
    const canViewYamlTemp = usePermission({ permission: viewYamlManagedResourcesPermission }).allowed;
    const canShowEventsTemp = usePermission({ permission: showEventsManagedResourcesPermission }).allowed;

    const canListManagedResources = enablePermissions ? canListManagedResourcesTemp : true;
    const canViewYaml = enablePermissions ? canViewYamlTemp : true;
    const canShowEvents = enablePermissions ? canShowEventsTemp : true;

    useEffect(() => {
        if (!canListManagedResources) {
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
                const compositeResource = await response.json();
                const resourceRefs = compositeResource.spec?.crossplane?.resourceRefs || [];
                const xrNamespace = (scope === 'Namespaced') ? (compositeResource.metadata?.namespace || namespace) : undefined;
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
                    let resourceUrl = '';
                    let mrNamespace = ref.namespace;
                    if (!mrNamespace && scope === 'Namespaced') {
                        mrNamespace = xrNamespace;
                    }
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
                setResources(managedResources);
            } catch (error) {
                throw error;
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, [kubernetesApi, entity, canListManagedResources]);

    const handleViewYaml = (resource: ExtendedKubernetesObject) => {
        if (!canViewYaml) return;
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
        if (!canShowEvents) return;
        const name = resource.metadata?.name;
        const kind = resource.kind;
        const clusterOfComposite = entity.metadata.annotations?.['backstage.io/managed-by-location'].split(": ")[1];
        if (!name || !clusterOfComposite) return;
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
            throw error;
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
        } else if (orderBy === 'providerConfig') {
            return (a.spec?.providerConfigRef?.name || '').localeCompare(b.spec?.providerConfigRef?.name || '') * (order === 'asc' ? 1 : -1);
        }
        return 0;
    });
    if (!canListManagedResources) {
        return <Typography>You don't have permissions to view managed resources</Typography>;
    }
    return (
        <>
            <Paper>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress />
                    </Box>
                ) : (
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
                                <TableCell sortDirection={orderBy === 'providerConfig' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'providerConfig'}
                                        direction={orderBy === 'providerConfig' ? order : 'asc'}
                                        onClick={() => handleRequestSort('providerConfig')}
                                    >
                                        Provider Config
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
                                    <TableCell>{resource.spec?.providerConfigRef?.name || 'N/A'}</TableCell>
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
                )}
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

export default CrossplaneV2ManagedResources; 