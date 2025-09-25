import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  makeStyles,
  CircularProgress,
  IconButton,
  Drawer,
  Tabs,
  Tab,
  Chip,
  Link,
  useTheme,
  Popover,
  TextField,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  listClaimsPermission,
  listCompositeResourcesPermission,
  listManagedResourcesPermission,
  listAdditionalResourcesPermission
} from '@terasky/backstage-plugin-crossplane-common';
import { configApiRef } from '@backstage/core-plugin-api';
import { useNavigate } from 'react-router-dom';
import pluralize from 'pluralize';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import DescriptionIcon from '@material-ui/icons/Description';
import CloseIcon from '@material-ui/icons/Close';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import FilterListIcon from '@material-ui/icons/FilterList';
import SvgIcon from '@material-ui/core/SvgIcon';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import yaml from 'js-yaml';
import SearchIcon from '@material-ui/icons/Search';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import { default as React } from 'react';
// Function to remove managed fields and other sensitive data from resources
const removeManagedFields = (resource: KubernetesObject) => {
    const resourceCopy = JSON.parse(JSON.stringify(resource)); // Deep copy the resource
    
    // Create a new object with the desired field order
    const orderedResource: any = {
        apiVersion: resourceCopy.apiVersion,
        kind: resourceCopy.kind,
        metadata: {}
    };

    // Order metadata fields
    if (resourceCopy.metadata) {
        // Remove managed fields
        if (resourceCopy.metadata.managedFields) {
            delete resourceCopy.metadata.managedFields;
        }
        if (resourceCopy.metadata.annotations && resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) {
            delete resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"];
        }

        // Add metadata fields in order
        if (resourceCopy.metadata.name) {
            orderedResource.metadata.name = resourceCopy.metadata.name;
        }
        if (resourceCopy.metadata.namespace) {
            orderedResource.metadata.namespace = resourceCopy.metadata.namespace;
        }
        if (resourceCopy.metadata.annotations && Object.keys(resourceCopy.metadata.annotations).length > 0) {
            orderedResource.metadata.annotations = resourceCopy.metadata.annotations;
        }
        if (resourceCopy.metadata.labels && Object.keys(resourceCopy.metadata.labels).length > 0) {
            orderedResource.metadata.labels = resourceCopy.metadata.labels;
        }

        // Add any remaining metadata fields
        Object.entries(resourceCopy.metadata).forEach(([key, value]) => {
            if (!['name', 'namespace', 'annotations', 'labels', 'managedFields'].includes(key)) {
                orderedResource.metadata[key] = value;
            }
        });
    }

    // Add spec and status
    if (resourceCopy.spec) {
        orderedResource.spec = resourceCopy.spec;
    }
    if (resourceCopy.status) {
        orderedResource.status = resourceCopy.status;
    }

    return orderedResource;
};

// Custom Sitemap Icon Component
const SitemapIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 576 512">
        <path d="M208 80c0-26.5 21.5-48 48-48l64 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-8 0 0 40 152 0c30.9 0 56 25.1 56 56l0 32 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-4.4-3.6-8-8-8l-152 0 0 40 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-30.9 25.1-56 56-56l152 0 0-40-8 0c-26.5 0-48-21.5-48-48l0-64z" />
    </SvgIcon>
);

interface ExtendedKubernetesObject extends KubernetesObject {
    apiVersion?: string;
    status?: {
        conditions?: Array<{
            type: string,
            status: string,
            reason?: string,
            lastTransitionTime?: string,
            message?: string
        }>;
    };
    spec?: {
        resourceRef?: {
            apiVersion?: string;
            kind?: string;
            name?: string;
        };
        resourceRefs?: Array<any>;
        providerConfigRef?: {
            name?: string;
        };
        package?: string;
    };
}

interface ResourceTableRow {
    type: 'Claim' | 'XR' | 'MR';
    name: string;
    namespace?: string;
    group: string;
    kind: string;
    status: {
        synced: boolean;
        ready: boolean;
        conditions: any[];
    };
    createdAt: string;
    resource: ExtendedKubernetesObject;
    level: number;
    parentId?: string;
    isLastChild?: boolean;
}

interface K8sEvent {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    involvedObject?: {
        kind?: string;
        name?: string;
        namespace?: string;
    };
    reason?: string;
    message?: string;
    type?: string;
    firstTimestamp?: string;
    lastTimestamp?: string;
    count?: number;
}

const useStyles = makeStyles((theme) => ({
    table: {
        minWidth: 650,
    },
    tableContainer: {
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : '#ffffff',
        border: `1px solid ${theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[400]}`,
        borderRadius: '4px',
        boxShadow: theme.palette.type === 'dark' ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
    },
    tableCell: {
        padding: theme.spacing(1, 2),
        borderBottom: `1px solid ${theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]}`,
        color: theme.palette.text.primary,
    },
    headerCell: {
        fontWeight: 'bold',
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : '#ffffff',
        borderBottom: `1px solid ${theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[400]}`,
        color: theme.palette.text.primary,
    },
    clickableRow: {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    nestedRow: {
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.default : theme.palette.grey[50],
    },
    statusBadge: {
        padding: '2px 8px',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 'bold',
        display: 'inline-block',
        marginRight: '8px',
    },
    syncedSuccess: {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
        color: theme.palette.type === 'dark' ? '#81c784' : '#2e7d32',
    },
    syncedError: {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
        color: theme.palette.type === 'dark' ? '#e57373' : '#c62828',
    },
    readySuccess: {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
        color: theme.palette.type === 'dark' ? '#81c784' : '#2e7d32',
    },
    readyError: {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
        color: theme.palette.type === 'dark' ? '#e57373' : '#c62828',
    },
    tooltip: {
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[900] : '#000000',
        color: theme.palette.type === 'dark' ? theme.palette.common.white : '#ffffff',
        fontSize: '12px',
        padding: theme.spacing(1.5),
        maxWidth: 400,
        '& .MuiTooltip-arrow': {
            color: theme.palette.type === 'dark' ? theme.palette.grey[900] : '#000000',
        },
    },
    tooltipContent: {
        maxWidth: 400,
        '& strong': {
            color: theme.palette.type === 'dark' ? theme.palette.common.white : '#ffffff',
        },
    },
    typeBadge: {
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: '50px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
    },
    claimType: {
        backgroundColor: theme.palette.type === 'dark' ? '#1a237e' : '#e3f2fd',
        color: theme.palette.type === 'dark' ? '#90caf9' : '#1976d2',
    },
    xrType: {
        backgroundColor: theme.palette.type === 'dark' ? '#4a148c' : '#f3e5f5',
        color: theme.palette.type === 'dark' ? '#e1bee7' : '#7b1fa2',
    },
    mrType: {
        backgroundColor: theme.palette.type === 'dark' ? '#1b5e20' : '#e8f5e9',
        color: theme.palette.type === 'dark' ? '#a5d6a7' : '#388e3c',
    },
    expandIcon: {
        padding: 4,
        marginRight: theme.spacing(1),
        color: theme.palette.text.primary,
    },
    resourceName: {
        display: 'flex',
        alignItems: 'center',
        color: theme.palette.text.primary,
    },
    indent: {
        width: theme.spacing(4),
        flexShrink: 0,
    },
    resourceNameContent: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
    },
    treePrefix: {
        fontFamily: 'monospace',
        color: theme.palette.text.primary,
        fontSize: '12px',
        opacity: 0.7,
    },
    actionButtons: {
        display: 'flex',
        gap: theme.spacing(0.5),
    },
    iconButton: {
        padding: theme.spacing(0.5),
        color: theme.palette.text.primary,
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    drawer: {
        width: 800,
        flexShrink: 0,
    },
    drawerPaper: {
        width: 800,
        padding: theme.spacing(2),
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing(2),
        color: theme.palette.text.primary,
    },
    tabContent: {
        marginTop: theme.spacing(2),
        height: 'calc(100vh - 200px)',
        overflow: 'auto',
        position: 'relative',
    },
    yamlActions: {
        position: 'sticky',
        top: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: theme.spacing(1),
        padding: theme.spacing(1),
        backgroundColor: theme.palette.background.paper,
        zIndex: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    eventTable: {
        '& th': {
            fontWeight: 'bold',
            color: theme.palette.text.primary,
        },
    },
    eventRow: {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    normalEvent: {
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.info.dark : theme.palette.info.light,
        color: theme.palette.type === 'dark' ? theme.palette.info.contrastText : theme.palette.info.contrastText,
    },
    warningEvent: {
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.warning.dark : theme.palette.warning.light,
        color: theme.palette.type === 'dark' ? theme.palette.warning.contrastText : theme.palette.warning.contrastText,
    },
    errorEvent: {
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.error.dark : theme.palette.error.light,
        color: theme.palette.type === 'dark' ? theme.palette.error.contrastText : theme.palette.error.contrastText,
    },
    supportingType: {
        backgroundColor: theme.palette.type === 'dark' ? '#4a148c' : '#f3e5f5',
        color: theme.palette.type === 'dark' ? '#e1bee7' : '#7b1fa2',
    },
}));

const CrossplaneV1ResourcesTable = () => {
    const { entity } = useEntity();
    const crossplaneApi = useApi(crossplaneApiRef);
    const config = useApi(configApiRef);
    const navigate = useNavigate();
    const theme = useTheme();
    const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;

    const { allowed: canListClaimsTemp } = usePermission({ permission: listClaimsPermission });
    const { allowed: canListCompositeTemp } = usePermission({ permission: listCompositeResourcesPermission });
    const { allowed: canListManagedTemp } = usePermission({ permission: listManagedResourcesPermission });
    const { allowed: canListAdditionalTemp } = usePermission({ permission: listAdditionalResourcesPermission });

    const canListClaims = enablePermissions ? canListClaimsTemp : true;
    const canListComposite = enablePermissions ? canListCompositeTemp : true;
    const canListManaged = enablePermissions ? canListManagedTemp : true;
    const canListAdditional = enablePermissions ? canListAdditionalTemp : true;

    const [allResources, setAllResources] = useState<ResourceTableRow[]>([]);
    const [supportingResources, setSupportingResources] = useState<ExtendedKubernetesObject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingSupportingResources, setLoadingSupportingResources] = useState<boolean>(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [nestedResources, setNestedResources] = useState<Record<string, ResourceTableRow[]>>({});
    const [initialExpansionDone, setInitialExpansionDone] = useState<boolean>(false);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [selectedTab, setSelectedTab] = useState<number>(0);
    const [selectedResource, setSelectedResource] = useState<ExtendedKubernetesObject | null>(null);
    const [events, setEvents] = useState<K8sEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
    const [filters, setFilters] = useState({
        type: [] as string[],
        name: [] as string[],
        group: [] as string[],
        kind: [] as string[],
        status: [] as string[],
        created: [] as string[]
    });
    const [supportingFilters, setSupportingFilters] = useState({
        type: [] as string[],
        name: [] as string[],
        status: [] as string[],
        artifact: [] as string[]
    });
    const [filterAnchorEl, setFilterAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
    const [supportingFilterAnchorEl, setSupportingFilterAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
    const [filterSearch, setFilterSearch] = useState<{ [key: string]: string }>({});
    const [supportingFilterSearch, setSupportingFilterSearch] = useState<{ [key: string]: string }>({});
    const classes = useStyles();

    // Helper function to extract API group from apiVersion
    const getApiGroup = (apiVersion?: string): string => {
        if (!apiVersion) return 'Unknown';
        
        if (apiVersion.includes('/')) {
            const [group, _version] = apiVersion.split('/');
            return group;
        } else {
            // For core Kubernetes resources (v1), return 'core' instead of 'v1'
            return apiVersion === 'v1' ? 'core' : apiVersion;
        }
    };

    const fetchNestedResources = async (parentResource: ExtendedKubernetesObject, parentId: string, level: number) => {
        const resourceRefs = parentResource.spec?.resourceRefs || [];
        const clusterOfComposite = entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1];

        if (!clusterOfComposite || resourceRefs.length === 0) return [];

        const nestedResourcesPromises = resourceRefs.map(async (ref: any, index: number) => {
            const [apiGroup, apiVersion] = ref.apiVersion.split('/');
            const kindPlural = pluralize(ref.kind.toLowerCase());
            try {
                const resourceResponse = await crossplaneApi.getResources({
                    clusterName: clusterOfComposite,
                    namespace: ref.namespace,
                    group: apiGroup,
                    version: apiVersion,
                    plural: kindPlural,
                    name: ref.name,
                });
                const nestedResource = resourceResponse.resources[0].resource;

                // Determine if this is an XR (has resourceRefs) or MR (leaf resource)
                const resourceType = nestedResource.spec?.resourceRefs && nestedResource.spec.resourceRefs.length > 0 ? 'XR' : 'MR';

                return {
                    type: resourceType as 'XR' | 'MR',
                    name: nestedResource.metadata?.name || 'Unknown',
                    group: getApiGroup(nestedResource.apiVersion),
                    kind: nestedResource.kind || 'Unknown',
                    status: {
                        synced: nestedResource.status?.conditions?.find(c => c.type === 'Synced')?.status === 'True' || false,
                        ready: nestedResource.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' || false,
                        conditions: nestedResource.status?.conditions || []
                    },
                    createdAt: nestedResource.metadata?.creationTimestamp || '',
                    resource: nestedResource,
                    level: level,
                    parentId: parentId,
                    isLastChild: index === resourceRefs.length - 1
                };
            } catch (error) {
                console.error('Error fetching nested resource:', error);
                return null;
            }
        });

        const fetchedResources = (await Promise.all(nestedResourcesPromises)).filter(r => r !== null) as ResourceTableRow[];

        // Recursively fetch nested resources for XRs
        for (const resource of fetchedResources) {
            if (resource.type === 'XR' && resource.resource.spec?.resourceRefs) {
                const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
                const deeperNested = await fetchNestedResources(resource.resource, resourceId, level + 1);
                if (deeperNested.length > 0) {
                    setNestedResources(prev => ({
                        ...prev,
                        [resourceId]: deeperNested
                    }));
                }
            }
        }

        return fetchedResources;
    };

    // Function to expand all resources recursively
    const expandAllResources = async (resources: ResourceTableRow[]) => {
        const newExpandedRows = new Set<string>();

        const expandRecursively = async (resourceList: ResourceTableRow[]) => {
            for (const resource of resourceList) {
                const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
                if (resource.resource.spec?.resourceRefs && resource.resource.spec.resourceRefs.length > 0) {
                    newExpandedRows.add(resourceId);

                    // Fetch nested resources if not already loaded
                    if (!nestedResources[resourceId]) {
                        const nested = await fetchNestedResources(resource.resource, resourceId, resource.level + 1);
                        setNestedResources(prev => ({
                            ...prev,
                            [resourceId]: nested
                        }));

                        // Recursively expand nested resources
                        await expandRecursively(nested);
                    } else {
                        // If already loaded, just expand them recursively
                        await expandRecursively(nestedResources[resourceId]);
                    }
                }
            }
        };

        await expandRecursively(resources);
        setExpandedRows(newExpandedRows);
    };

    const fetchEvents = async (resource: ExtendedKubernetesObject) => {
        setLoadingEvents(true);
        const annotations = entity.metadata.annotations || {};
        const clusterOfComposite = annotations['backstage.io/managed-by-location']?.split(": ")[1];

        if (!clusterOfComposite) {
            setLoadingEvents(false);
            return;
        }

        try {
            if (!resource.metadata?.name) {
                // No metadata available
                setLoadingEvents(false);
                return;
            }

            const eventsResponse = await crossplaneApi.getEvents({
                clusterName: clusterOfComposite,
                namespace: resource.metadata?.namespace || 'default',
                resourceName: resource.metadata?.name || 'unknown',
                resourceKind: resource.kind || 'unknown',
            });
            setEvents(eventsResponse.events);
        } catch (error) {
            console.error('Error fetching events:', error);
            setEvents([]);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleOpenDrawer = (resource: ExtendedKubernetesObject, tab: number) => {
        setSelectedResource(resource);
        setSelectedTab(tab);
        setDrawerOpen(true);

        if (tab === 1) {
            fetchEvents(resource);
        }
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedResource(null);
        setEvents([]);
    };

    const handleTabChange = (_: React.ChangeEvent<{}>, newValue: number) => {
        setSelectedTab(newValue);
        if (newValue === 1 && selectedResource) {
            fetchEvents(selectedResource);
        }
    };

    const handleCopyYaml = () => {
        if (selectedResource) {
            try {
                const yamlStr = yaml.dump(removeManagedFields(selectedResource));
                navigator.clipboard.writeText(yamlStr);
                // You could add a snackbar notification here
            } catch (error) {
                console.error('Failed to copy YAML:', error);
            }
        }
    };

    const handleDownloadYaml = () => {
        if (selectedResource) {
            try {
                const yamlStr = yaml.dump(removeManagedFields(selectedResource));
                const blob = new Blob([yamlStr], { type: 'text/yaml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedResource.metadata?.name || 'resource'}.yaml`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to download YAML:', error);
            }
        }
    };

    const fetchSupportingResources = async () => {
        if (!canListAdditional) {
            setLoadingSupportingResources(false);
            return;
        }

        const annotations = entity.metadata.annotations || {};
        const clusterOfClaim = annotations['backstage.io/managed-by-location']?.split(": ")[1];

        if (!clusterOfClaim) {
            setLoadingSupportingResources(false);
            return;
        }

        try {
            const supportingResources: ExtendedKubernetesObject[] = [];

            // Fetch XRD
            const xrdPlural = annotations['terasky.backstage.io/composite-plural'];
            const xrdGroup = annotations['terasky.backstage.io/composite-group'];
            const xrdName = `${xrdPlural}.${xrdGroup}`;

            if (xrdName) {
                const xrdResponse = await crossplaneApi.getResources({
                    clusterName: clusterOfClaim,
                    group: 'apiextensions.crossplane.io',
                    version: 'v1',
                    plural: 'compositeresourcedefinitions',
                    name: xrdName,
                });
                const xrdResource = xrdResponse.resources[0].resource;
                supportingResources.push(xrdResource);
            }

            // Fetch Composition
            const compositionName = annotations['terasky.backstage.io/composition-name'];
            if (compositionName) {
                const compositionResponse = await crossplaneApi.getResources({
                    clusterName: clusterOfClaim,
                    group: 'apiextensions.crossplane.io',
                    version: 'v1',
                    plural: 'compositions',
                    name: compositionName,
                });
                const compositionResource = compositionResponse.resources[0].resource;
                supportingResources.push(compositionResource);
            }

            // Fetch Composition Functions
            const compositionFunctions = annotations['terasky.backstage.io/composition-functions']?.split(',') || [];
            for (const functionName of compositionFunctions) {
                if (functionName) {
                    try {
                        const functionResponse = await crossplaneApi.getResources({
                            clusterName: clusterOfClaim,
                            group: 'pkg.crossplane.io',
                            version: 'v1beta1',
                            plural: 'functions',
                            name: functionName,
                        });
                        const functionResource = functionResponse.resources[0].resource;
                        supportingResources.push(functionResource);
                    } catch (error) {
                        console.error(`Error fetching function ${functionName}:`, error);
                        supportingResources.push({
                            kind: 'Function',
                            metadata: {
                                name: functionName,
                            },
                            status: {
                                conditions: [{ type: 'Error', status: 'Error fetching function' }],
                            },
                        });
                    }
                }
            }

            // Fetch Provider resources (using V2 logic for V1 compatibility)
            const compositePlural = annotations['terasky.backstage.io/composite-plural'];
            const compositeGroup = annotations['terasky.backstage.io/composite-group'];
            const compositeVersion = annotations['terasky.backstage.io/composite-version'];
            const compositeName = annotations['terasky.backstage.io/composite-name'];
            if (compositePlural && compositeGroup && compositeVersion && compositeName) {
                const compositeResponse = await crossplaneApi.getResources({
                    clusterName: clusterOfClaim,
                    group: compositeGroup,
                    version: compositeVersion,
                    plural: compositePlural,
                    name: compositeName,
                    kind: 'Composite',
                });
                const compositeResource = compositeResponse.resources[0].resource;
                const resourceRefs = (compositeResource as ExtendedKubernetesObject).spec?.resourceRefs || [];

                // Check for provider config refs in the composite resource
                const providerConfigRefs = resourceRefs.filter(ref => ref.kind === 'ProviderConfig');

                // If we have provider config refs, fetch their providers
                if (providerConfigRefs.length > 0) {
                    for (const configRef of providerConfigRefs) {
                        try {
                            const configResponse = await crossplaneApi.getResources({
                                clusterName: clusterOfClaim,
                                group: configRef.apiVersion.split('/')[0],
                                version: configRef.apiVersion.split('/')[1],
                                plural: 'providerconfigs',
                                name: configRef.name,
                            });
                            const config = configResponse.resources[0].resource;

                            if (config.metadata?.ownerReferences) {
                                const providerRef = config.metadata.ownerReferences.find((ref: any) => ref.kind === 'Provider');
                                if (providerRef) {
                                    try {
                                        const providerResponse = await crossplaneApi.getResources({
                                            clusterName: clusterOfClaim,
                                            group: 'pkg.crossplane.io',
                                            version: 'v1',
                                            plural: 'providers',
                                            name: providerRef.name,
                                        });
                                        const provider = providerResponse.resources[0].resource;
                                        supportingResources.push(provider);
                                    } catch (error) {
                                        console.error(`Error fetching provider ${providerRef.name}:`, error);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching provider config ${configRef.name}:`, error);
                        }
                    }
                }

                const uniqueManagedResources = Array.from(new Set(resourceRefs.map((ref: { kind: any; apiVersion: any; }) => `${ref.kind}-${ref.apiVersion}`)))
                    .map(key => resourceRefs.find((ref: { kind: any; apiVersion: any; }) => `${ref.kind}-${ref.apiVersion}` === key));
                const providerResourcesSet = new Set();
                const providerResources = await Promise.all(uniqueManagedResources.map(async (ref: any) => {
                    let apiGroup = '';
                    if (ref.apiVersion.includes('/')) {
                        apiGroup = ref.apiVersion.split('/')[0];
                    } else {
                        apiGroup = '';
                    }
                    const kindPlural = pluralize(ref.kind.toLowerCase());
                    // Skip CRD lookup for core API group resources
                    if (!apiGroup || apiGroup === 'v1') {
                        return [];
                    }

                    let crd;
                    try {
                        const crdResponse = await crossplaneApi.getResources({
                            clusterName: clusterOfClaim,
                            group: 'apiextensions.k8s.io',
                            version: 'v1',
                            plural: 'customresourcedefinitions',
                            name: `${kindPlural}.${apiGroup}`,
                        });
                        crd = crdResponse.resources[0].resource;
                    } catch (error) {
                        console.error(`Error fetching CRD for ${kindPlural}.${apiGroup}:`, error);
                        return [];
                    }
                    
                    if (!crd) {
                        console.warn(`No CRD found for ${kindPlural}.${apiGroup}`);
                        return [];
                    }

                    const ownerReferences = crd.metadata?.ownerReferences || [];
                    const providerRefs = ownerReferences.filter((ownerRef: { kind: string; }) => ownerRef.kind === 'ProviderRevision');
                    const providerResources = await Promise.all(providerRefs.map(async (providerRef: { apiVersion: string; name: string; kind: string }) => {
                        const providerKey = `${providerRef.apiVersion}-${providerRef.name}`;
                        if (providerResourcesSet.has(providerKey)) {
                            return null;
                        }
                        providerResourcesSet.add(providerKey);
                        try {
                        // Get the provider name by removing the revision hash
                        const providerName = providerRef.name.split('-').slice(0, -1).join('-');
                        // Now get the actual provider
                        const providerResponse = await crossplaneApi.getResources({
                            clusterName: clusterOfClaim,
                            group: 'pkg.crossplane.io',
                            version: 'v1',
                            plural: 'providers',
                            name: providerName,
                        });
                        const providerResource = providerResponse.resources[0].resource;
                        return providerResource;
                        } catch (error) {
                            console.error(`Error fetching provider ${providerRef.name}:`, error);
                            return {
                                kind: 'Provider',
                                metadata: {
                                    name: providerRef.name,
                                },
                                status: {
                                    conditions: [{ type: 'Error', status: 'Error fetching provider' }],
                                },
                            };
                        }
                    }));
                    return providerResources.filter(r => r !== null);
                }));
                supportingResources.push(...providerResources.flat().filter(r => r !== null));
            }

            setSupportingResources(supportingResources);
        } catch (error) {
            console.error("Error fetching supporting resources:", error);
        } finally {
            setLoadingSupportingResources(false);
        }
    };

    useEffect(() => {
        const fetchAllResources = async () => {
            setLoading(true);
            const resources: ResourceTableRow[] = [];
            const annotations = entity.metadata.annotations || {};

            try {
                // Fetch Claim Resource
                if (canListClaims) {
                    const claimName = annotations['terasky.backstage.io/claim-name'];
                    const plural = annotations['terasky.backstage.io/claim-plural'];
                    const group = annotations['terasky.backstage.io/claim-group'];
                    const version = annotations['terasky.backstage.io/claim-version'];
                    const labelSelector = annotations['backstage.io/kubernetes-label-selector'];
                    const namespace = labelSelector?.split(',').find(s => s.startsWith('crossplane.io/claim-namespace'))?.split('=')[1];
                    const clusterOfClaim = annotations['backstage.io/managed-by-location']?.split(": ")[1];

                    if (plural && group && version && namespace && clusterOfClaim) {
                        try {
                            const response = await crossplaneApi.getResources({
                                clusterName: clusterOfClaim,
                                namespace: entity.metadata.namespace || 'default',
                                group: group,
                                version: version,
                                plural,
                                name: claimName,
                            });
                            const claimResource = response.resources[0].resource;
                            resources.push({
                                type: 'Claim',
                                name: claimResource.metadata?.name || 'Unknown',
                                namespace: claimResource.metadata?.namespace,
                                group: getApiGroup(claimResource.apiVersion),
                                kind: claimResource.kind || 'Unknown',
                                status: {
                                    synced: claimResource.status?.conditions?.find(c => c.type === 'Synced')?.status === 'True' || false,
                                    ready: claimResource.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' || false,
                                    conditions: claimResource.status?.conditions || []
                                },
                                createdAt: claimResource.metadata?.creationTimestamp || '',
                                resource: claimResource,
                                level: 0
                            });
                        } catch (error) {
                            console.error('Error fetching claim:', error);
                        }
                    }
                }

                // Fetch Composite Resource
                if (canListComposite) {
                    const compositePlural = annotations['terasky.backstage.io/composite-plural'];
                    const compositeGroup = annotations['terasky.backstage.io/composite-group'];
                    const compositeVersion = annotations['terasky.backstage.io/composite-version'];
                    const compositeName = annotations['terasky.backstage.io/composite-name'];
                    const clusterOfComposite = annotations['backstage.io/managed-by-location']?.split(": ")[1];

                    if (compositePlural && compositeGroup && compositeVersion && compositeName && clusterOfComposite) {
                        try {
                            const response = await crossplaneApi.getResources({
                                clusterName: clusterOfComposite,
                                group: compositeGroup,
                                version: compositeVersion,
                                plural: compositePlural,
                                name: compositeName,
                                kind: 'Composite',
                            });
                            const compositeResource = response.resources[0].resource;
                            resources.push({
                                type: 'XR',
                                name: compositeResource.metadata?.name || 'Unknown',
                                group: getApiGroup(compositeResource.apiVersion),
                                kind: compositeResource.kind || 'Unknown',
                                status: {
                                    synced: compositeResource.status?.conditions?.find(c => c.type === 'Synced')?.status === 'True' || false,
                                    ready: compositeResource.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' || false,
                                    conditions: compositeResource.status?.conditions || []
                                },
                                createdAt: compositeResource.metadata?.creationTimestamp || '',
                                resource: compositeResource,
                                level: 0
                            });

                            // Fetch top-level managed resources
                            if (canListManaged && compositeResource.spec?.resourceRefs) {
                                const compositeId = compositeResource.metadata?.uid || `${compositeResource.kind}-${compositeResource.metadata?.name}`;
                                const managedResources = await fetchNestedResources(compositeResource, compositeId, 1);
                                resources.push(...managedResources);
                            }
                        } catch (error) {
                            console.error('Error fetching composite resource:', error);
                        }
                    }
                }

                setAllResources(resources);

                // Expand all resources by default after initial load
                if (!initialExpansionDone) {
                    await expandAllResources(resources);
                    setInitialExpansionDone(true);
                }
            } catch (error) {
                console.error('Error fetching resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllResources();
    }, [crossplaneApi, entity, canListClaims, canListComposite, canListManaged, enablePermissions]);

    useEffect(() => {
        fetchSupportingResources();
    }, [crossplaneApi, entity, canListAdditional]);

      // --- Add state for auto-expanded rows ---
  const [autoExpandedRows, setAutoExpandedRows] = useState<Set<string>>(new Set());
  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

      // --- Update auto-expanded rows when filters change ---
  useEffect(() => {
    if (!hasActiveFilters) {
      setAutoExpandedRows(new Set());
      return;
    }
        // Recalculate auto-expanded ancestors for current filter
        const allResourcesFlattened = getAllResourcesFlattened();
        const filteredResources = allResourcesFlattened.filter(resource => resourceMatchesFilters(resource));
        const autoExpanded = new Set<string>();
        const resourceMap = new Map<string, ResourceTableRow>();
        allResourcesFlattened.forEach(resource => {
            const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
            resourceMap.set(resourceId, resource);
        });
        filteredResources.forEach(resource => {
            let current = resource;
            while (current) {
                if (current.parentId) {
                    autoExpanded.add(current.parentId);
                    current = resourceMap.get(current.parentId)!;
                } else {
                    break;
                }
            }
        });
        setAutoExpandedRows(autoExpanded);
    }, [filters]);

    // --- Update handleRowExpand to only update user-expanded rows ---
    const handleRowExpand = async (resource: ResourceTableRow) => {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        const newExpandedRows = new Set(expandedRows);
        if (expandedRows.has(resourceId)) {
            newExpandedRows.delete(resourceId);
            setExpandedRows(newExpandedRows);
            return;
        }
        newExpandedRows.add(resourceId);
        setExpandedRows(newExpandedRows);
        // Fetch nested resources if they haven't been loaded yet
        if (!nestedResources[resourceId] && resource.resource.spec?.resourceRefs) {
            const nested = await fetchNestedResources(resource.resource, resourceId, resource.level + 1);
            setNestedResources(prev => ({
                ...prev,
                [resourceId]: nested
            }));
        }
    };

    const getConditionStatus = (conditions: any[], conditionType: string): { status: string; condition: any } => {
        const condition = conditions?.find(c => c.type === conditionType);
        return {
            status: condition?.status || 'Unknown',
            condition: condition || {}
        };
    };

    const renderStatusBadge = (conditions: any[], conditionType: string) => {
        const { status, condition } = getConditionStatus(conditions, conditionType);
        const isSuccess = status === 'True';

        const badgeClass = conditionType === 'Synced'
            ? (isSuccess ? classes.syncedSuccess : classes.syncedError)
            : (isSuccess ? classes.readySuccess : classes.readyError);

        return (
            <Tooltip
                classes={{
                    tooltip: classes.tooltip,
                }}
                title={
                    <Box className={classes.tooltipContent}>
                        <Typography variant="subtitle2" gutterBottom>
                            <strong>Condition: {condition.type}</strong>
                        </Typography>
                        <Typography variant="body2">Status: {condition.status}</Typography>
                        {condition.reason && (
                            <Typography variant="body2">Reason: {condition.reason}</Typography>
                        )}
                        {condition.lastTransitionTime && (
                            <Typography variant="body2">
                                Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                            </Typography>
                        )}
                        {condition.message && (
                            <Typography variant="body2" style={{ wordWrap: 'break-word' }}>
                                Message: {condition.message}
                            </Typography>
                        )}
                    </Box>
                }
                arrow
            >
                <span className={`${classes.statusBadge} ${badgeClass}`}>
                    {conditionType}
                </span>
            </Tooltip>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getRelativeTime = (dateString?: string) => {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
    };

    const getTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'Claim':
                return classes.claimType;
            case 'XR':
                return classes.xrType;
            case 'MR':
                return classes.mrType;
            default:
                return '';
        }
    };

    const getEventTypeChip = (type?: string) => {
        switch (type) {
            case 'Warning':
                return <Chip size="small" label={type} className={classes.warningEvent} />;
            case 'Error':
                return <Chip size="small" label={type} className={classes.errorEvent} />;
            default:
                return <Chip size="small" label={type || 'Normal'} className={classes.normalEvent} />;
        }
    };

    // Function to count all resources including nested ones
    const getTotalResourceCount = (): number => {
        let count = allResources.filter(r => !r.parentId).length; // Count top-level resources

        // Recursively count expanded nested resources
        const countNested = (parentId: string): number => {
            const nested = nestedResources[parentId];
            if (!nested) return 0;

            let nestedCount = nested.length;
            nested.forEach(resource => {
                const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
                if (expandedRows.has(resourceId)) {
                    nestedCount += countNested(resourceId);
                }
            });
            return nestedCount;
        };

        // Count nested resources for each expanded top-level resource
        allResources.filter(r => !r.parentId).forEach(resource => {
            const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
            if (expandedRows.has(resourceId)) {
                count += countNested(resourceId);
            }
        });

        return count;
    };

    // Get all available values for filter options
    const getAllResourceValues = () => {
        const allValues = {
            type: new Set<string>(),
            name: new Set<string>(),
            group: new Set<string>(),
            kind: new Set<string>(),
            status: new Set<string>(),
            created: new Set<string>()
        };

        // Collect values from all resources (including nested)
        const collectValues = (resources: ResourceTableRow[]) => {
            resources.forEach(resource => {
                allValues.type.add(resource.type);
                allValues.name.add(resource.name);
                allValues.group.add(resource.group);
                allValues.kind.add(resource.kind);
                
                // Add status values
                if (resource.status.synced === true) allValues.status.add('Synced');
                if (resource.status.ready === true) allValues.status.add('Ready');
                if (resource.status.synced === false) allValues.status.add('Not Synced');
                if (resource.status.ready === false) allValues.status.add('Not Ready');
                
                allValues.created.add(getRelativeTime(resource.createdAt));
                
                // Recursively collect from nested resources
                const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
                if (nestedResources[resourceId]) {
                    collectValues(nestedResources[resourceId]);
                }
            });
        };

        collectValues(allResources.filter(r => !r.parentId));
        
        return {
            type: Array.from(allValues.type).sort(),
            name: Array.from(allValues.name).sort(),
            group: Array.from(allValues.group).sort(),
            kind: Array.from(allValues.kind).sort(),
            status: Array.from(allValues.status).sort(),
            created: Array.from(allValues.created).sort()
        };
    };

    // Get all available values for supporting resources
    const getSupportingResourceValues = () => {
        const allValues = {
            type: new Set<string>(),
            name: new Set<string>(),
            status: new Set<string>(),
            artifact: new Set<string>()
        };

        supportingResources.forEach(resource => {
            allValues.type.add(resource.kind || 'Unknown');
            allValues.name.add(resource.metadata?.name || 'Unknown');
            
            resource.status?.conditions?.forEach((condition: any) => {
                allValues.status.add(condition.type);
                allValues.status.add(condition.status);
            });
            
            const artifact = getArtifact(resource);
            if (typeof artifact === 'string') {
                allValues.artifact.add(artifact);
            } else if (artifact && typeof artifact === 'object' && artifact.props && artifact.props.href) {
                // Extract URL from Link element
                //allValues.artifact.add(artifact.props.href);
                // Also add the display text if it's different from the URL
                if (artifact.props.children && artifact.props.children !== artifact.props.href) {
                    allValues.artifact.add(artifact.props.children);
                }
            }
        });

        return {
            type: Array.from(allValues.type).sort(),
            name: Array.from(allValues.name).sort(),
            status: Array.from(allValues.status).sort(),
            artifact: Array.from(allValues.artifact).sort()
        };
    };

    // Check if a resource matches the filters
    const resourceMatchesFilters = (resource: ResourceTableRow): boolean => {
        const typeMatch = filters.type.length === 0 || filters.type.some(filter => resource.type.toLowerCase().includes(filter.toLowerCase()));
        const nameMatch = filters.name.length === 0 || filters.name.some(filter => resource.name.toLowerCase().includes(filter.toLowerCase()));
        const groupMatch = filters.group.length === 0 || filters.group.some(filter => resource.group.toLowerCase().includes(filter.toLowerCase()));
        const kindMatch = filters.kind.length === 0 || filters.kind.some(filter => resource.kind.toLowerCase().includes(filter.toLowerCase()));
        
        // Status matching logic
        let statusMatch = filters.status.length === 0;
        if (!statusMatch) {
            statusMatch = filters.status.some(filter => {
                const filterLower = filter.toLowerCase();
                return (resource.status.synced && filterLower.includes('synced')) ||
                       (resource.status.ready && filterLower.includes('ready')) ||
                       (!resource.status.synced && filterLower.includes('not synced')) ||
                       (!resource.status.ready && filterLower.includes('not ready'));
            });
        }
        
        const createdMatch = filters.created.length === 0 || 
            filters.created.some(filter => 
                getRelativeTime(resource.createdAt).toLowerCase().includes(filter.toLowerCase()) ||
                formatDate(resource.createdAt).toLowerCase().includes(filter.toLowerCase())
            );
        
        return typeMatch && nameMatch && groupMatch && kindMatch && statusMatch && createdMatch;
    };

    // Get all resources flattened (including nested ones) - with deduplication
    const getAllResourcesFlattened = (): ResourceTableRow[] => {
        const allFlattened: ResourceTableRow[] = [];
        const seenResourceIds = new Set<string>();
        
        const addResourcesRecursively = (resources: ResourceTableRow[]) => {
            resources.forEach(resource => {
                const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
                
                // Only add if we haven't seen this resource before
                if (!seenResourceIds.has(resourceId)) {
                    seenResourceIds.add(resourceId);
                    allFlattened.push(resource);
                }
                
                // Add nested resources recursively
                if (nestedResources[resourceId]) {
                    addResourcesRecursively(nestedResources[resourceId]);
                }
            });
        };
        
        addResourcesRecursively(allResources.filter(r => !r.parentId));
        return allFlattened;
    };

  // Filter resources based on current filters (strict hierarchical filtering)
  const getFilteredResources = (): ResourceTableRow[] => {
    const allResourcesFlattened = getAllResourcesFlattened();
    const filteredResources = allResourcesFlattened.filter(resource => resourceMatchesFilters(resource));

    // Build a set of all resources to show: matching + ancestors
    const resourcesToShow = new Set<string>();
    const resourceMap = new Map<string, ResourceTableRow>();
    allResourcesFlattened.forEach(resource => {
      const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
      resourceMap.set(resourceId, resource);
    });

    // For each matching resource, add it and all ancestors
    filteredResources.forEach(resource => {
      let current = resource;
      while (current) {
        const resourceId = current.resource.metadata?.uid || `${current.kind}-${current.name}`;
        resourcesToShow.add(resourceId);
        if (current.parentId) {
          current = resourceMap.get(current.parentId)!;
        } else {
          break;
        }
      }
    });

    // Auto-expand ancestor rows
    // (merge with user-expanded rows, so user can still collapse manually after filtering)
    const mergedExpandedRows = new Set([...expandedRows, ...autoExpandedRows]);

    // Render only resources in resourcesToShow, and only children if parent is expanded
    const visibleResources: ResourceTableRow[] = [];
    const processedIds = new Set<string>();
    function addVisible(resources: ResourceTableRow[], parentExpanded: boolean) {
      resources.forEach(resource => {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        if (processedIds.has(resourceId)) return;
        if (!resourcesToShow.has(resourceId)) return;
        if (!parentExpanded && resource.parentId) return;
        processedIds.add(resourceId);
        visibleResources.push(resource);
        if (mergedExpandedRows.has(resourceId) && nestedResources[resourceId]) {
          addVisible(nestedResources[resourceId], true);
        }
      });
    }
    addVisible(allResources.filter(r => !r.parentId), true);
    return visibleResources;
  };

    const handleFilterChange = (field: string, values: string[]) => {
        setFilters(prev => ({ ...prev, [field]: values }));
    };

    const handleSupportingFilterChange = (field: string, values: string[]) => {
        setSupportingFilters(prev => ({ ...prev, [field]: values }));
    };

    const handleFilterClick = (event: React.MouseEvent<HTMLElement>, field: string) => {
        setFilterAnchorEl(prev => ({ ...prev, [field]: event.currentTarget }));
    };

    const handleSupportingFilterClick = (event: React.MouseEvent<HTMLElement>, field: string) => {
        setSupportingFilterAnchorEl(prev => ({ ...prev, [field]: event.currentTarget }));
    };

    const handleFilterClose = (field: string) => {
        setFilterAnchorEl(prev => ({ ...prev, [field]: null }));
    };

    const handleSupportingFilterClose = (field: string) => {
        setSupportingFilterAnchorEl(prev => ({ ...prev, [field]: null }));
    };

      const isFieldFilterActive = (field: string) => {
    return filters[field as keyof typeof filters].length > 0;
  };

    const isSupportingFilterActive = (field: string) => {
        return supportingFilters[field as keyof typeof supportingFilters].length > 0;
    };

    const getFilteredSupportingResources = (): ExtendedKubernetesObject[] => {
        return supportingResources.filter(resource => {
            const typeMatch = supportingFilters.type.length === 0 || 
                supportingFilters.type.some(filter => resource.kind?.toLowerCase().includes(filter.toLowerCase()));
            const nameMatch = supportingFilters.name.length === 0 || 
                supportingFilters.name.some(filter => resource.metadata?.name?.toLowerCase().includes(filter.toLowerCase()));
            const statusMatch = supportingFilters.status.length === 0 || 
                resource.status?.conditions?.some((condition: any) => 
                    supportingFilters.status.some(filter => 
                        condition.type?.toLowerCase().includes(filter.toLowerCase()) ||
                        condition.status?.toLowerCase().includes(filter.toLowerCase())
                    )
                );
            const artifactMatch = supportingFilters.artifact.length === 0 || 
                supportingFilters.artifact.some(filter => {
                    const artifact = getArtifact(resource);
                    if (typeof artifact === 'string') {
                        return artifact.toLowerCase().includes(filter.toLowerCase());
                    } else if (artifact && typeof artifact === 'object' && artifact.props && artifact.props.href) {
                        // Check both URL and display text for Link elements
                        const url = artifact.props.href.toLowerCase();
                        const displayText = artifact.props.children?.toLowerCase() || '';
                        return url.includes(filter.toLowerCase()) || displayText.includes(filter.toLowerCase());
                    }
                    return false; // Skip filtering for other React elements
                });
            
            return typeMatch && nameMatch && statusMatch && artifactMatch;
        });
    };

    const renderResourceRows = (resources: ResourceTableRow[], _?: string): JSX.Element[] => {
        const rows: JSX.Element[] = [];

        resources.forEach((row, index) => {
            const resourceId = row.resource.metadata?.uid || `${row.kind}-${row.name}-${index}`;
            const hasNestedResources = row.resource.spec?.resourceRefs && row.resource.spec.resourceRefs.length > 0;
            const isExpanded = expandedRows.has(resourceId);

                  // Check if this resource has any nested resources (regardless of filters, since we handle filtering in getFilteredResources)
      const hasNestedResourcesToShow = hasNestedResources && nestedResources[resourceId] && nestedResources[resourceId].length > 0;

            rows.push(
                <TableRow
                    key={resourceId}
                    className={`${classes.clickableRow} ${row.level > 0 ? classes.nestedRow : ''}`}
                >
                    <TableCell className={classes.tableCell}>
                        <span className={`${classes.typeBadge} ${getTypeBadgeClass(row.type)}`}>
                            {row.type}
                        </span>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                        <Box className={classes.resourceName}>
                            {Array.from({ length: row.level }).map((_, index) => (
                                <div key={index} className={classes.indent} />
                            ))}
                            <Box className={classes.resourceNameContent}>
                                                {hasNestedResourcesToShow && (
                  <IconButton
                    className={classes.expandIcon}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowExpand(row);
                    }}
                  >
                    {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                  </IconButton>
                )}
                                {row.name}
                            </Box>
                        </Box>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                        {row.group}
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                        {row.kind}
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                        <Box display="flex">
                            {renderStatusBadge(row.status.conditions, 'Synced')}
                            {renderStatusBadge(row.status.conditions, 'Ready')}
                        </Box>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                        <Tooltip
                            classes={{
                                tooltip: classes.tooltip,
                            }}
                            title={formatDate(row.createdAt)}
                            arrow
                        >
                            <span style={{ cursor: 'help' }}>
                                {getRelativeTime(row.createdAt)}
                            </span>
                        </Tooltip>
                    </TableCell>
                    <TableCell className={classes.tableCell}>
                        <Box className={classes.actionButtons}>
                            <Tooltip title="View Graph">
                                <IconButton
                                    className={classes.iconButton}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/catalog/${entity.metadata.namespace}/component/${entity.metadata.name}/crossplane-graph`);
                                    }}
                                >
                                    <SitemapIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="View YAML & Events">
                                <IconButton
                                    className={classes.iconButton}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDrawer(row.resource, 0);
                                    }}
                                >
                                    <DescriptionIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </TableCell>
                </TableRow>
            );

            // Don't add nested resources here since they're already included in the flattened list
            // The expand button is just for visual indication now
        });

        return rows;
    };

    const getArtifact = (resource: ExtendedKubernetesObject) => {
        if (resource.kind === 'Composition' || resource.kind === 'CompositeResourceDefinition') {
            return 'N/A';
        }
        const packageName = resource.spec?.package || 'N/A';
        
        if ((resource.kind === 'Function' || resource.kind === 'Provider') && packageName.startsWith('xpkg.upbound.io/')) {
            const [_, path] = packageName.split('xpkg.upbound.io/');
            const [org, nameWithVersion] = path.split('/');
            const [name, version] = nameWithVersion.split(':');
            
            const resourceType = resource.kind === 'Function' ? 'functions' : 'providers';
            const versionPath = /^v\d$/.test(version) ? '' : `/${version}`;
            const marketplaceUrl = `https://marketplace.upbound.io/${resourceType}/${org}/${name}${versionPath}`;
            
            return (
                <Link
                    href={marketplaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.text.primary, textDecoration: 'underline' }}
                >
                    {packageName}
                </Link>
            );
        }
        if ((resource.kind === 'Function' || resource.kind === 'Provider') && packageName.startsWith('xpkg.crossplane.io/crossplane-contrib')) {
            const [_, path] = packageName.split('xpkg.crossplane.io/crossplane-contrib/');
            const [name, version] = path.split(':');
            const versionPath = /^v\d$/.test(version) ? '' : `/${version}`;
            const marketplaceUrl = `https://github.com/crossplane-contrib/${name}/tree/${versionPath}`;
            return (
              <Link href={marketplaceUrl} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.text.primary, textDecoration: 'underline' }}>
                {packageName}
              </Link>
            );
          }
        
        return packageName;
    };

    const renderSupportingResourceRows = () => {
        if (!canListAdditional) {
            return (
                <TableRow>
                    <TableCell colSpan={5}>
                        <Typography align="center">
                            You don't have permissions to view supporting resources
                        </Typography>
                    </TableCell>
                </TableRow>
            );
        }

        if (loadingSupportingResources) {
            return (
                <TableRow>
                    <TableCell colSpan={5}>
                        <Box display="flex" justifyContent="center" p={2}>
                            <CircularProgress />
                        </Box>
                    </TableCell>
                </TableRow>
            );
        }

        const filteredSupportingResources = getFilteredSupportingResources();
        if (filteredSupportingResources.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5}>
                        <Typography align="center">No supporting resources found</Typography>
                    </TableCell>
                </TableRow>
            );
        }

        return filteredSupportingResources.map((resource) => (
            <TableRow key={resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`}>
                <TableCell className={classes.tableCell}>
                    <span className={`${classes.typeBadge} ${classes.supportingType}`}>
                        {resource.kind}
                    </span>
                </TableCell>
                <TableCell className={classes.tableCell}>{resource.metadata?.name}</TableCell>
                <TableCell className={classes.tableCell}>
                    <Box display="flex">
                        {resource.status?.conditions?.map((condition: any) => 
                            renderStatusBadge([condition], condition.type)
                        )}
                    </Box>
                </TableCell>
                <TableCell className={classes.tableCell}>{getArtifact(resource)}</TableCell>
                <TableCell className={classes.tableCell}>
                    <Box className={classes.actionButtons}>
                        <Tooltip title="View YAML & Events">
                            <IconButton
                                className={classes.iconButton}
                                size="small"
                                onClick={() => handleOpenDrawer(resource, 0)}
                            >
                                <DescriptionIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </TableCell>
            </TableRow>
        ));
    };

    // Custom Filter Popover
    const renderFilterPopover = (anchorEl: HTMLElement | null, onClose: () => void, options: string[], selected: string[], onChange: (values: string[]) => void, searchValue: string, setSearchValue: (v: string) => void) => {
        const filteredOptions = options.filter(option => option.toLowerCase().includes(searchValue.toLowerCase()));
        const allSelected = selected.length === options.length || (selected.length > 0 && filteredOptions.every(opt => selected.includes(opt)));
        const handleToggle = (option: string) => {
            if (selected.includes(option)) {
                onChange(selected.filter(v => v !== option));
            } else {
                onChange([...selected, option]);
            }
        };
        const handleSelectAll = () => {
            if (allSelected) {
                onChange([]);
            } else {
                onChange(filteredOptions);
            }
        };
        return (
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={onClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Box p={2} minWidth={250} maxHeight={400} display="flex" flexDirection="column">
                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        InputProps={{ endAdornment: <SearchIcon fontSize="small" /> }}
                        style={{ marginBottom: 8 }}
                    />
                    <List style={{ maxHeight: 300, overflow: 'auto', background: 'rgba(0,0,0,0.02)' }}>
                        <ListItem button onClick={handleSelectAll} dense>
                            <Checkbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} tabIndex={-1} disableRipple />
                            <ListItemText primary="All" style={{ fontWeight: 600 }} />
                        </ListItem>
                        {filteredOptions.map(option => (
                            <ListItem button key={option} onClick={() => handleToggle(option)} dense>
                                <Checkbox checked={selected.includes(option)} tabIndex={-1} disableRipple />
                                <ListItemText primary={option} style={{ fontWeight: 600 }} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Popover>
        );
    };

    if (!canListClaims && !canListComposite && !canListManaged) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Resources ({getTotalResourceCount()})
                    </Typography>
                    <Box m={2}>
                        <Typography gutterBottom>
                            You don't have permissions to view Crossplane resources
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Resources ({getTotalResourceCount()})
                    </Typography>

                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                        </Box>
                    ) : allResources.length > 0 ? (
                        <TableContainer component={Paper} className={classes.tableContainer}>
                            <Table className={classes.table} size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Type
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(e, 'type')}
                                                    style={{ color: isFieldFilterActive('type') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Name
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(e, 'name')}
                                                    style={{ color: isFieldFilterActive('name') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Group
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(e, 'group')}
                                                    style={{ color: isFieldFilterActive('group') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Kind
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(e, 'kind')}
                                                    style={{ color: isFieldFilterActive('kind') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Status
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(e, 'status')}
                                                    style={{ color: isFieldFilterActive('status') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Created
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(e, 'created')}
                                                    style={{ color: isFieldFilterActive('created') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {renderResourceRows(getFilteredResources())}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography>No resources found</Typography>
                    )}
                </CardContent>
            </Card>

            {/* Used Resources Section */}
            <Card style={{ marginTop: theme.spacing(3) }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Supporting Resources
                    </Typography>
                    {loadingSupportingResources ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer component={Paper} className={classes.tableContainer}>
                            <Table className={classes.table} size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Type
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleSupportingFilterClick(e, 'type')}
                                                    style={{ color: isSupportingFilterActive('type') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Name
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleSupportingFilterClick(e, 'name')}
                                                    style={{ color: isSupportingFilterActive('name') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Status
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleSupportingFilterClick(e, 'status')}
                                                    style={{ color: isSupportingFilterActive('status') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                Artifact
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleSupportingFilterClick(e, 'artifact')}
                                                    style={{ color: isSupportingFilterActive('artifact') ? theme.palette.primary.main : theme.palette.text.secondary }}
                                                >
                                                    <FilterListIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell className={`${classes.tableCell} ${classes.headerCell}`}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {renderSupportingResourceRows()}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            <Drawer
                className={classes.drawer}
                variant="temporary"
                anchor="right"
                open={drawerOpen}
                onClose={handleCloseDrawer}
                classes={{
                    paper: classes.drawerPaper,
                }}
            >
                <Box className={classes.drawerHeader}>
                    <Typography variant="h6">
                        {selectedResource?.metadata?.name || 'Resource Details'}
                    </Typography>
                    <IconButton onClick={handleCloseDrawer}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Tabs value={selectedTab} onChange={handleTabChange}>
                    <Tab label="Kubernetes Manifest" />
                    <Tab label="Kubernetes Events" />
                </Tabs>

                <Box className={classes.tabContent}>
                    {selectedTab === 0 && selectedResource && (
                        <>
                            <Box className={classes.yamlActions}>
                                <Tooltip title="Copy YAML">
                                    <IconButton size="small" onClick={handleCopyYaml}>
                                        <FileCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Download YAML">
                                    <IconButton size="small" onClick={handleDownloadYaml}>
                                        <GetAppIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <SyntaxHighlighter
                                language="yaml"
                                style={tomorrow}
                                showLineNumbers
                            >
                                {yaml.dump(removeManagedFields(selectedResource))}
                            </SyntaxHighlighter>
                        </>
                    )}

                    {selectedTab === 1 && (
                        loadingEvents ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : events.length > 0 ? (
                            <TableContainer>
                                <Table size="small" className={classes.eventTable}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Reason</TableCell>
                                            <TableCell>Age</TableCell>
                                            <TableCell>Message</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {events.map((event, index) => (
                                            <TableRow key={index} className={classes.eventRow}>
                                                <TableCell>{getEventTypeChip(event.type)}</TableCell>
                                                <TableCell>{event.reason}</TableCell>
                                                <TableCell>{getRelativeTime(event.lastTimestamp || event.firstTimestamp)}</TableCell>
                                                <TableCell>{event.message}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography align="center" color="textSecondary">
                                No events found for this resource
                            </Typography>
                        )
                    )}
                </Box>
            </Drawer>

            {/* Filter Popovers */}
            {Object.keys(filters).map((field) => {
                const availableValues = getAllResourceValues()[field as keyof ReturnType<typeof getAllResourceValues>] || [];
                return (
                    <React.Fragment key={field}>
                        {renderFilterPopover(
                            filterAnchorEl[field],
                            () => handleFilterClose(field),
                            availableValues,
                            filters[field as keyof typeof filters],
                            (values) => handleFilterChange(field, values),
                            filterSearch[field] || '',
                            (v) => setFilterSearch(prev => ({ ...prev, [field]: v }))
                        )}
                    </React.Fragment>
                );
            })}

            {/* Supporting Resources Filter Popovers */}
            {Object.keys(supportingFilters).map((field) => {
                const availableValues = getSupportingResourceValues()[field as keyof ReturnType<typeof getSupportingResourceValues>] || [];
                return (
                    <React.Fragment key={`supporting-${field}`}>
                        {renderFilterPopover(
                            supportingFilterAnchorEl[field],
                            () => handleSupportingFilterClose(field),
                            availableValues,
                            supportingFilters[field as keyof typeof supportingFilters],
                            (values) => handleSupportingFilterChange(field, values),
                            supportingFilterSearch[field] || '',
                            (v) => setSupportingFilterSearch(prev => ({ ...prev, [field]: v }))
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default CrossplaneV1ResourcesTable;
