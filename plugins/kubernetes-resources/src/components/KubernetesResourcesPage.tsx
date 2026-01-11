import { useState, useEffect } from 'react';
import {
    useTheme,
    Drawer,
    IconButton,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@material-ui/core';
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
import { usePermission } from '@backstage/plugin-permission-react';
import { listResourcesPermission, listSecretsPermission, showEventsResourcesPermission, viewSecretsPermission, viewYamlResourcesPermission } from '@terasky/backstage-plugin-kubernetes-resources-common';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import VisibilityIcon from '@material-ui/icons/Visibility';

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
                console.error('Failed to fetch resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
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

    const renderResourceTable = (resources: ExtendedKubernetesObject[], kind: string) => (
        <Accordion key={kind}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{kind}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            {resources.some(r => r.metadata?.namespace) && (
                                <TableCell>Namespace</TableCell>
                            )}
                            <TableCell>Conditions</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {resources.map((resource) => (
                            <TableRow key={resource.metadata?.uid}>
                                <TableCell>{resource.metadata?.name}</TableCell>
                                {resources.some(r => r.metadata?.namespace) && (
                                    <TableCell>{resource.metadata?.namespace}</TableCell>
                                )}
                                <TableCell>
                                    {(resource.status?.conditions || []).map((condition: any, index: number) => (
                                        <div key={index}>
                                            {condition.type}: {condition.status}
                                        </div>
                                    ))}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => handleViewYaml(resource)}
                                        style={{ marginRight: '8px' }}
                                        disabled={!canViewYaml || (resource.kind === 'Secret' && !canViewSecrets)}
                                    >
                                        YAML
                                    </Button>
                                    <Button
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => handleViewEvents(resource)}
                                        disabled={!canShowEvents}
                                    >
                                        Events
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </AccordionDetails>
        </Accordion>
    );

    if (!canListResources) {
        return (
            <Typography variant="h6" color="error">
                You do not have permission to view Kubernetes resources.
            </Typography>
        );
    }

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Kubernetes Resources
            </Typography>
            {Object.entries(groupedResources).map(([kind, resources]) => 
                renderResourceTable(resources, kind)
            )}
            <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
                <div style={{ width: '50vw', padding: '16px', backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
                    <IconButton onClick={handleCloseDrawer}>
                        <CloseIcon />
                    </IconButton>
                    {selectedResource && drawerContent === 'yaml' && (
                        <>
                            <Typography variant="h4" gutterBottom>Kubernetes Manifest</Typography>
                            <Box style={{ maxHeight: '80vh', overflow: 'auto', border: '1px solid #ccc', padding: '8px' }}>
                                <Box mb={2}>
                                    <Box display="flex" justifyContent="flex-start" mt={1}>
                                        <CopyToClipboard text={YAML.dump(removeManagedFields(selectedResource))}>
                                            <Button variant="contained" color="primary" style={{ marginRight: '8px' }}>
                                                Copy to Clipboard
                                            </Button>
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
                        </>
                    )}
                    {selectedResource && drawerContent === 'events' && (
                        <>
                            <Typography variant="h4" gutterBottom>Kubernetes Events</Typography>
                            <Box style={{ maxHeight: '80vh', overflow: 'auto', border: '1px solid #ccc', padding: '8px' }}>
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
        </div>
    );
};

export default KubernetesResourcesPage;