// KroResourceTable.tsx
import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, makeStyles, CircularProgress, IconButton, Drawer, Tabs, Tab, Chip, Link, useTheme, Popover, TextField
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  listResourcesPermission,
  listInstancesPermission,
  listRGDsPermission,
  showEventsInstancesPermission,
  showEventsRGDsPermission,
  showEventsResourcesPermission,
  viewYamlInstancesPermission,
  viewYamlRGDsPermission,
  viewYamlResourcesPermission
} from '@terasky/backstage-plugin-kro-common';
import { configApiRef } from '@backstage/core-plugin-api';
import { useNavigate } from 'react-router-dom';
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

// Custom Sitemap Icon Component
const SitemapIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 576 512">
    <path d="M208 80c0-26.5 21.5-48 48-48l64 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-8 0 0 40 152 0c30.9 0 56 25.1 56 56l0 32 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-4.4-3.6-8-8-8l-152 0 0 40 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-30.9 25.1-56 56-56l152 0 0-40-8 0c-26.5 0-48-21.5-48-48l0-64z" />
  </SvgIcon>
);

const useStyles = makeStyles((theme) => ({
  table: { minWidth: 650 },
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
    '&:hover': { backgroundColor: theme.palette.action.hover },
  },
  nestedRow: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.default : theme.palette.grey[50],
  },
  statusBadge: {
    padding: '2px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block', marginRight: '8px',
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
    padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', minWidth: '50px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
  },
  rgdType: {
    backgroundColor: theme.palette.type === 'dark' ? '#4a148c' : '#f3e5f5',
    color: theme.palette.type === 'dark' ? '#e1bee7' : '#7b1fa2',
  },
  instanceType: {
    backgroundColor: theme.palette.type === 'dark' ? '#1b5e20' : '#e8f5e9',
    color: theme.palette.type === 'dark' ? '#a5d6a7' : '#388e3c',
  },
  resourceType: {
    backgroundColor: theme.palette.type === 'dark' ? '#1976d2' : '#e3f2fd',
    color: theme.palette.type === 'dark' ? '#90caf9' : '#1976d2',
  },
  expandIcon: {
    padding: 4, marginRight: theme.spacing(1), color: theme.palette.text.primary,
  },
  resourceName: {
    display: 'flex', alignItems: 'center', color: theme.palette.text.primary,
  },
  indent: {
    width: theme.spacing(4), flexShrink: 0,
  },
  resourceNameContent: {
    display: 'flex', alignItems: 'center', gap: theme.spacing(1),
  },
  actionButtons: {
    display: 'flex', gap: theme.spacing(0.5),
  },
  iconButton: {
    padding: theme.spacing(0.5), color: theme.palette.text.primary,
    '&:hover': { backgroundColor: theme.palette.action.hover },
  },
  drawer: { width: 800, flexShrink: 0 },
  drawerPaper: { width: 800, padding: theme.spacing(2), backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary },
  drawerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing(2), color: theme.palette.text.primary },
  tabContent: { marginTop: theme.spacing(2), height: 'calc(100vh - 200px)', overflow: 'auto', position: 'relative' },
  yamlActions: { position: 'sticky', top: 0, right: 0, display: 'flex', justifyContent: 'flex-end', gap: theme.spacing(1), padding: theme.spacing(1), backgroundColor: theme.palette.background.paper, zIndex: 1, borderBottom: `1px solid ${theme.palette.divider}` },
  supportingType: {
    backgroundColor: theme.palette.type === 'dark' ? '#4a148c' : '#f3e5f5',
    color: theme.palette.type === 'dark' ? '#e1bee7' : '#7b1fa2',
  },
  warningEvent: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.1)',
    color: theme.palette.type === 'dark' ? '#ffd700' : '#ffd700',
  },
  errorEvent: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
    color: theme.palette.type === 'dark' ? '#e57373' : '#c62828',
  },
  normalEvent: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)',
    color: theme.palette.type === 'dark' ? '#9c27b0' : '#9c27b0',
  },
  eventTable: {
    minWidth: 650,
    '& .MuiTableCell-root': {
      padding: theme.spacing(1, 2),
    },
  },
  eventRow: {
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  k8sType: {
    backgroundColor: theme.palette.type === 'dark' ? '#1976d2' : '#e3f2fd',
    color: theme.palette.type === 'dark' ? '#90caf9' : '#1976d2',
  },
}));

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
    crossplane?: {
      resourceRefs?: Array<any>;
    };
    forProvider?: any; // This indicates it's a Crossplane MR
    providerConfigRef?: { name?: string };
    package?: string;
  };
}

interface ResourceTableRow {
  type: 'RGD' | 'Instance' | 'Resource';
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

const KroResourceTable = () => {
  const { entity } = useEntity();
  const kubernetesApi = useApi(kubernetesApiRef);
  const config = useApi(configApiRef);
  const navigate = useNavigate();
  const theme = useTheme();
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;

  const { allowed: canListResourcesTemp } = usePermission({ permission: listResourcesPermission });
  const { allowed: canListInstancesTemp } = usePermission({ permission: listInstancesPermission });
  const { allowed: canListRGDsTemp } = usePermission({ permission: listRGDsPermission });
  const { allowed: canShowEventsInstancesTemp } = usePermission({ permission: showEventsInstancesPermission });
  const { allowed: canShowEventsRGDsTemp } = usePermission({ permission: showEventsRGDsPermission });
  const { allowed: canShowEventsResourcesTemp } = usePermission({ permission: showEventsResourcesPermission });
  const { allowed: canViewYamlInstancesTemp } = usePermission({ permission: viewYamlInstancesPermission });
  const { allowed: canViewYamlRGDsTemp } = usePermission({ permission: viewYamlRGDsPermission });
  const { allowed: canViewYamlResourcesTemp } = usePermission({ permission: viewYamlResourcesPermission });

  const canListResources = enablePermissions ? canListResourcesTemp : true;
  const canListInstances = enablePermissions ? canListInstancesTemp : true;
  const canListRGDs = enablePermissions ? canListRGDsTemp : true;
  const canShowEventsInstances = enablePermissions ? canShowEventsInstancesTemp : true;
  const canShowEventsRGDs = enablePermissions ? canShowEventsRGDsTemp : true;
  const canShowEventsResources = enablePermissions ? canShowEventsResourcesTemp : true;
  const canViewYamlInstances = enablePermissions ? canViewYamlInstancesTemp : true;
  const canViewYamlRGDs = enablePermissions ? canViewYamlRGDsTemp : true;
  const canViewYamlResources = enablePermissions ? canViewYamlResourcesTemp : true;

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
    namespace: [] as string[],
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

  // --- Use merged expanded rows for rendering if filter is active ---
  const getMergedExpandedRows = () => {
    if (hasActiveFilters) {
      return new Set([...expandedRows, ...autoExpandedRows]);
    }
    return expandedRows;
  };

  // Helper function to get plural form of a kind
  const getPluralKind = (kind: string): string => {
    const pluralMap: Record<string, string> = {
      'ingress': 'ingresses',
      'proxy': 'proxies',
      'index': 'indices',
      'matrix': 'matrices',
      'vertex': 'vertices',
      // Add more special cases as needed
    };
    return pluralMap[kind.toLowerCase()] || `${kind.toLowerCase()}s`;
  };

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

  // Fetch nested resources for a given instance
  const fetchNestedResources = async (parentId: string, level: number, clusterName: string, namespace?: string) => {
    const annotations = entity.metadata.annotations || {};
    const rgdId = annotations['terasky.backstage.io/kro-rgd-id'];
    const instanceId = annotations['terasky.backstage.io/kro-instance-uid'];
    const subResources = annotations['terasky.backstage.io/kro-sub-resources'].split(',').map(r => {
      const [apiVersion, kind] = r.split(':');
      return { apiVersion, kind };
    });

    const managedResourcesPromises = subResources.map(async (resource) => {
      const [group, version] = resource.apiVersion.split('/');
      const pluralKind = getPluralKind(resource.kind);
      const path = group === 'v1' 
        ? `/api/v1/namespaces/${namespace}/${pluralKind}`
        : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}`;

      try {
      const response = await kubernetesApi.proxy({
        clusterName,
        path: path + '?' + new URLSearchParams({
          labelSelector: [
            'kro.run/owned=true',
            `kro.run/instance-id=${instanceId}`,
            `kro.run/resource-graph-definition-id=${rgdId}`,
          ].join(','),
        }).toString(),
        init: { method: 'GET' },
      });
      const resourceList = await response.json();
      const fetchPromises = (resourceList.items || []).map(async (item: any) => {
        const kind = resourceList.kind.replace('List', '');
        const resourcePath = group === 'v1' || group === 'core'
          ? `/api/v1/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`
          : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`;
      try {
        const resourceResponse = await kubernetesApi.proxy({
            clusterName,
            path: resourcePath,
          init: { method: 'GET' },
        });
          const fullResource = await resourceResponse.json();
        return {
            type: 'Resource' as const,
            name: item.metadata?.name || 'Unknown',
            namespace: item.metadata?.namespace,
            group: getApiGroup(resourceList.apiVersion),
            kind: kind,
            status: {
              synced: true,
              ready: true,
              conditions: item.status?.conditions || []
            },
            createdAt: item.metadata?.creationTimestamp || '',
            resource: fullResource,
          level: level,
            parentId: parentId
        };
      } catch (error) {
          console.error('Failed to fetch individual resource:', resourcePath, error);
        return null;
      }
    });
      const results = await Promise.all(fetchPromises);
      return results.filter(Boolean);
      } catch (error) {
        console.error(`Failed to fetch ${resource.kind} resources:`, error);
        return [];
      }
    });

    const managedResources = await Promise.all(managedResourcesPromises);
    return managedResources.flat();
  };

  // Function to expand all resources recursively
  const expandAllResources = async (resources: ResourceTableRow[]) => {
    const newExpandedRows = new Set<string>();

    const expandRecursively = async (resourceList: ResourceTableRow[]) => {
      for (const resource of resourceList) {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        if (resource.type === 'Instance') {
          newExpandedRows.add(resourceId);

          // Fetch nested resources if not already loaded
          if (!nestedResources[resourceId]) {
            const clusterName = entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1];
            const nested = await fetchNestedResources(resourceId, resource.level + 1, clusterName || '', resource.namespace);
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

  // Fetch all resources (composite and managed)
  useEffect(() => {
    const fetchAllResources = async () => {
      setLoading(true);
      const resources: ResourceTableRow[] = [];
      const annotations = entity.metadata.annotations || {};
      try {
        if (canListRGDs || canListInstances || canListResources) {
          const rgdName = annotations['terasky.backstage.io/kro-rgd-name'];
          const rgdId = annotations['terasky.backstage.io/kro-rgd-id'];
          const instanceId = annotations['terasky.backstage.io/kro-instance-uid'];
          const clusterName = annotations['backstage.io/managed-by-location']?.split(": ")[1];
          const namespace = entity.metadata.namespace || annotations['namespace'] || 'default';

          if (!rgdName || !rgdId || !instanceId || !clusterName) {
            setLoading(false);
            return;
          }

          try {
            if (canListInstances) {
              // Fetch the instance itself
              const instanceResponse = await kubernetesApi.proxy({
                clusterName,
                path: `/apis/kro.run/v1alpha1/namespaces/${namespace}/applications/${entity.metadata.name}`,
                init: { method: 'GET' },
              });
              const instance = await instanceResponse.json();
              resources.push({
                type: 'Instance',
                name: instance.metadata?.name || 'Unknown',
                namespace: instance.metadata?.namespace,
                group: getApiGroup(instance.apiVersion),
                kind: instance.kind || 'Unknown',
                status: {
                  ready: instance.status?.conditions?.find((c: any) => c.type === 'InstanceSynced')?.status === 'True' || false,
                  synced: instance.status?.conditions?.find((c: any) => c.type === 'InstanceSynced')?.status === 'True' || false,
                  conditions: instance.status?.conditions || []
                },
                createdAt: instance.metadata?.creationTimestamp || '',
                resource: instance,
                level: 0,
                parentId: undefined
              });

              // Parse sub-resources from annotation and fetch them
              const subResources = annotations['terasky.backstage.io/kro-sub-resources'].split(',').map((r: string) => {
                const [apiVersion, kind] = r.split(':');
                return { apiVersion, kind };
              });

              // Fetch all managed resources
              if (canListResources) {
                const managedResourcesPromises = subResources.map(async (resource: { apiVersion: string; kind: string }) => {
                  const [group, version] = resource.apiVersion.split('/');
                  const pluralKind = getPluralKind(resource.kind);
                  const path = group === 'v1' 
                    ? `/api/v1/namespaces/${namespace}/${pluralKind}`
                    : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}`;

                  try {
                    const response = await kubernetesApi.proxy({
                      clusterName,
                      path: path + '?' + new URLSearchParams({
                        labelSelector: [
                          'kro.run/owned=true',
                          `kro.run/instance-id=${instanceId}`,
                          `kro.run/resource-graph-definition-id=${rgdId}`,
                        ].join(','),
                      }).toString(),
                      init: { method: 'GET' },
                    });
                    const resourceList = await response.json();
                  const fetchPromises = (resourceList.items || []).map(async (item: any) => {
                    const kind = resourceList.kind.replace('List', '');
                    const resourcePath = group === 'v1' || group === 'core'
                      ? `/api/v1/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`
                      : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}/${item.metadata.name}`;
                    try {
                      const resourceResponse = await kubernetesApi.proxy({
                        clusterName,
                        path: resourcePath,
                        init: { method: 'GET' },
                      });
                      const fullResource = await resourceResponse.json();
                      return {
                        type: 'Resource',
                        name: item.metadata?.name || 'Unknown',
                        namespace: item.metadata?.namespace,
                        group: getApiGroup(resourceList.apiVersion),
                        kind: kind,
                        status: {
                          synced: true,
                          ready: true,
                          conditions: item.status?.conditions || []
                        },
                        createdAt: item.metadata?.creationTimestamp || '',
                        resource: fullResource,
                        level: 1,
                        parentId: instance.metadata?.uid || `${instance.kind}-${instance.metadata?.name}`
                      };
                    } catch (error) {
                      console.error('Failed to fetch individual resource:', resourcePath, error);
                      return null;
                    }
                  });
                  const results = await Promise.all(fetchPromises);
                  return results.filter(Boolean);
            } catch (error) {
                    console.error(`Failed to fetch ${resource.kind} resources:`, error);
                    return [];
                  }
                });

                const managedResources = await Promise.all(managedResourcesPromises);
                resources.push(...managedResources.flat());
              }
            }
          } catch (error) {
            console.error('Error fetching KRO resources:', error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kubernetesApi, entity, canListResources, canListInstances, canListRGDs]);

  // Fetch supporting resources (RGD CRD)
  useEffect(() => {
    const fetchSupportingResources = async () => {
      if (!canListRGDs) {
        setLoadingSupportingResources(false);
        return;
      }
      const annotations = entity.metadata.annotations || {};
      const clusterName = annotations['backstage.io/managed-by-location']?.split(": ")[1];
      const rgdId = annotations['terasky.backstage.io/kro-rgd-id'];
      if (!clusterName || !rgdId) {
        setLoadingSupportingResources(false);
        return;
      }
      try {
        const supportingResources: ExtendedKubernetesObject[] = [];
        
        // Fetch RGD
        const rgdResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/kro.run/v1alpha1/resourcegraphdefinitions/${annotations['terasky.backstage.io/kro-rgd-name']}`,
            init: { method: 'GET' },
          });
        const rgd = await rgdResponse.json();
        supportingResources.push(rgd);

        // Fetch RGD CRD
            const crdResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions`,
              init: { method: 'GET' },
            });
        const crds = await crdResponse.json();
        const crdName = crds.items.find((crd: any) => crd.metadata?.labels?.['kro.run/resource-graph-definition-id'] === rgdId)?.metadata?.name;
        if (crdName) {
          const crdDetailResponse = await kubernetesApi.proxy({
            clusterName,
            path: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`,
                init: { method: 'GET' },
              });
          const crd = await crdDetailResponse.json();
          supportingResources.push(crd);
        }
        setSupportingResources(supportingResources);
      } catch (error) {
        console.error("Error fetching supporting resources:", error);
      } finally {
        setLoadingSupportingResources(false);
      }
    };
    fetchSupportingResources();
  }, [kubernetesApi, entity, canListRGDs]);

  // Utility functions
  const fetchEvents = async (resource: ExtendedKubernetesObject) => {
    setLoadingEvents(true);
    const annotations = entity.metadata.annotations || {};
    const clusterOfComposite = annotations['backstage.io/managed-by-location']?.split(": ")[1];
    if (!clusterOfComposite) {
      setLoadingEvents(false);
      return;
    }
    try {
      let eventsUrl = '';
      if (resource.metadata?.namespace) {
        eventsUrl = `/api/v1/namespaces/${resource.metadata.namespace}/events?fieldSelector=involvedObject.name=${resource.metadata?.name}`;
      } else if (resource.metadata?.name) {
        eventsUrl = `/api/v1/events?fieldSelector=involvedObject.name=${resource.metadata.name}`;
      } else {
        setLoadingEvents(false);
        return;
      }
      const eventsResponse = await kubernetesApi.proxy({
        clusterName: clusterOfComposite,
        path: eventsUrl,
        init: { method: 'GET' },
      });
      const eventsData = await eventsResponse.json();
      setEvents(eventsData.items || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleOpenDrawer = (resource: ExtendedKubernetesObject, tab: number) => {
    const resourceType = resource.kind === 'ResourceGraphDefinition' ? 'RGD' :
      resource.metadata?.labels?.['kro.run/resource-graph-definition-id'] ? 
        (resource.metadata?.uid === entity.metadata.annotations?.['terasky.backstage.io/kro-instance-uid'] ? 'Instance' : 'Resource') : 'Resource';

    // Check if we can show the requested tab
    if (tab === 1) { // Events tab
      const canShowEvents = resourceType === 'RGD' ? canShowEventsRGDs :
        resourceType === 'Instance' ? canShowEventsInstances :
        canShowEventsResources;
      if (!canShowEvents) {
        return;
      }
    } else { // YAML tab
      const canViewYaml = resourceType === 'RGD' ? canViewYamlRGDs :
        resourceType === 'Instance' ? canViewYamlInstances :
        canViewYamlResources;
      if (!canViewYaml) {
        return;
      }
    }

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
    if (!nestedResources[resourceId] && resource.type === 'Instance') {
      const clusterName = entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1];
      const nested = await fetchNestedResources(resourceId, resource.level + 1, clusterName || '', resource.namespace);
      setNestedResources(prev => ({ ...prev, [resourceId]: nested }));
    }
  };

  const getConditionStatus = (conditions: any[], conditionType: string): { status: string; condition: any } => {
    const condition = conditions?.find(c => c.type === conditionType);
    return { status: condition?.status || 'Unknown', condition: condition || {} };
  };

  const renderStatusBadge = (conditions: any[], conditionType: string) => {
    const { status, condition } = getConditionStatus(conditions, conditionType);
    const isSuccess = status === 'True';
    const badgeClass = conditionType === 'Synced'
      ? (isSuccess ? classes.syncedSuccess : classes.syncedError)
      : (isSuccess ? classes.readySuccess : classes.readyError);
    return (
      <Tooltip classes={{ tooltip: classes.tooltip }} title={
        <Box className={classes.tooltipContent}>
          <Typography variant="subtitle2" gutterBottom><strong>Condition: {condition.type}</strong></Typography>
          <Typography variant="body2">Status: {condition.status}</Typography>
          {condition.reason && <Typography variant="body2">Reason: {condition.reason}</Typography>}
          {condition.lastTransitionTime && <Typography variant="body2">Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}</Typography>}
          {condition.message && <Typography variant="body2" style={{ wordWrap: 'break-word' }}>Message: {condition.message}</Typography>}
        </Box>
      } arrow>
        <span className={`${classes.statusBadge} ${badgeClass}`}>{conditionType}</span>
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
    if (diffInSeconds < 60) return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'RGD': return classes.rgdType;
      case 'Instance': return classes.instanceType;
      case 'Resource': return classes.resourceType;
      default: return '';
    }
  };

  const getEventTypeChip = (type?: string) => {
    switch (type) {
      case 'Warning': return <Chip size="small" label={type} className={classes.warningEvent} />;
      case 'Error': return <Chip size="small" label={type} className={classes.errorEvent} />;
      default: return <Chip size="small" label={type || 'Normal'} className={classes.normalEvent} />;
    }
  };

  const getTotalResourceCount = (): number => {
    let count = allResources.filter(r => !r.parentId).length;
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
      namespace: new Set<string>(),
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
        if (resource.namespace) {
          allValues.namespace.add(resource.namespace);
        } else {
          allValues.namespace.add('Cluster-scoped');
        }
        allValues.group.add(resource.group);
        allValues.kind.add(resource.kind);
        
        // Add status values
        if (resource.type === 'Resource') {
          resource.status.conditions.forEach((condition: any) => {
            allValues.status.add(condition.type);
            allValues.status.add(condition.status);
          });
        } else {
          if (resource.status.synced === true) allValues.status.add('Synced');
          if (resource.status.ready === true) allValues.status.add('Ready');
          if (resource.status.synced === false) allValues.status.add('Not Synced');
          if (resource.status.ready === false) allValues.status.add('Not Ready');
        }
        
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
      namespace: Array.from(allValues.namespace).sort(),
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
        allValues.artifact.add(artifact.props.href);
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
    const namespaceMatch = filters.namespace.length === 0 || 
      (resource.namespace && filters.namespace.some(filter => resource.namespace?.toLowerCase().includes(filter.toLowerCase()))) ||
      (!resource.namespace && filters.namespace.some(filter => filter.toLowerCase().includes('cluster')));
    const groupMatch = filters.group.length === 0 || filters.group.some(filter => resource.group.toLowerCase().includes(filter.toLowerCase()));
    const kindMatch = filters.kind.length === 0 || filters.kind.some(filter => resource.kind.toLowerCase().includes(filter.toLowerCase()));
    
    // Status matching logic
    let statusMatch = filters.status.length === 0;
    if (!statusMatch) {
      if (resource.type === 'Resource') {
        statusMatch = resource.status.conditions.some((condition: any) => 
          filters.status.some(filter => 
            condition.type?.toLowerCase().includes(filter.toLowerCase()) ||
            condition.status?.toLowerCase().includes(filter.toLowerCase())
          )
        );
      } else {
        statusMatch = filters.status.some(filter => {
          const filterLower = filter.toLowerCase();
          return (resource.status.synced && filterLower.includes('synced')) ||
                 (resource.status.ready && filterLower.includes('ready')) ||
                 (!resource.status.synced && filterLower.includes('not synced')) ||
                 (!resource.status.ready && filterLower.includes('not ready'));
        });
      }
    }
    
    const createdMatch = filters.created.length === 0 || 
      filters.created.some(filter => 
        getRelativeTime(resource.createdAt).toLowerCase().includes(filter.toLowerCase()) ||
        formatDate(resource.createdAt).toLowerCase().includes(filter.toLowerCase())
      );
    
    return typeMatch && nameMatch && namespaceMatch && groupMatch && kindMatch && statusMatch && createdMatch;
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

  // --- Update getFilteredResources to use merged expanded rows ---
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
    // Use merged expanded rows for rendering
    const mergedExpandedRows = getMergedExpandedRows();
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
      const typeMatch = supportingFilters.type.length === 0 || supportingFilters.type.some(filter => resource.kind?.toLowerCase().includes(filter.toLowerCase()));
      const nameMatch = supportingFilters.name.length === 0 || supportingFilters.name.some(filter => resource.metadata?.name?.toLowerCase().includes(filter.toLowerCase()));
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
      const hasNestedResources = row.resource.spec?.crossplane?.resourceRefs && row.resource.spec.crossplane.resourceRefs.length > 0;
      const isExpanded = expandedRows.has(resourceId);

      // Check if this resource has any nested resources (regardless of filters, since we handle filtering in getFilteredResources)
      const hasNestedResourcesToShow = hasNestedResources && nestedResources[resourceId] && nestedResources[resourceId].length > 0;

      rows.push(
        <TableRow key={resourceId} className={`${classes.clickableRow} ${row.level > 0 ? classes.nestedRow : ''}`}>
          <TableCell className={classes.tableCell}>
            <span className={`${classes.typeBadge} ${getTypeBadgeClass(row.type)}`}>{row.type}</span>
          </TableCell>
          <TableCell className={classes.tableCell}>
            <Box className={classes.resourceName}>
              {Array.from({ length: row.level }).map((_, index) => (
                <div key={index} className={classes.indent} />
              ))}
              <Box className={classes.resourceNameContent}>
                {hasNestedResourcesToShow && (
                  <IconButton className={classes.expandIcon} size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleRowExpand(row);
                  }}>
                    {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                  </IconButton>
                )}
                {row.name}
              </Box>
            </Box>
          </TableCell>
          <TableCell className={classes.tableCell}>
            <Tooltip title={row.namespace ? `Namespace: ${row.namespace}` : 'Cluster-scoped resource'} arrow>
              <span>{row.namespace || '-'}</span>
            </Tooltip>
          </TableCell>
          <TableCell className={classes.tableCell}>{row.group}</TableCell>
          <TableCell className={classes.tableCell}>{row.kind}</TableCell>
          <TableCell className={classes.tableCell}>
            <Box display="flex">
              {row.type === 'Resource' ? (
                // For regular resources, show all conditions
                row.status.conditions.length > 0 ? (
                  row.status.conditions.map((condition: any, idx: number) => (
                    <Tooltip key={`${condition.type}-${idx}`} classes={{ tooltip: classes.tooltip }} title={
                      <Box className={classes.tooltipContent}>
                        <Typography variant="subtitle2" gutterBottom><strong>Condition: {condition.type}</strong></Typography>
                        <Typography variant="body2">Status: {condition.status}</Typography>
                        {condition.reason && <Typography variant="body2">Reason: {condition.reason}</Typography>}
                        {condition.lastTransitionTime && <Typography variant="body2">Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}</Typography>}
                        {condition.message && <Typography variant="body2" style={{ wordWrap: 'break-word' }}>Message: {condition.message}</Typography>}
                      </Box>
                    } arrow>
                      <span className={`${classes.statusBadge} ${condition.status === 'True' ? classes.readySuccess : classes.readyError}`}>
                        {condition.type}
                      </span>
                    </Tooltip>
                  ))
                ) : (
                  <span className={`${classes.statusBadge} ${classes.readySuccess}`}>No Conditions</span>
                )
              ) : row.type === 'RGD' ? (
                // For RGDs, show Ready and Active
                <>
                  {renderStatusBadge(row.status.conditions, 'Ready')}
                  {renderStatusBadge(row.status.conditions, 'Active')}
                </>
              ) : row.type === 'Instance' ? (
                // For Instances, show only InstanceSynced
                renderStatusBadge(row.status.conditions, 'InstanceSynced')
              ) : null}
            </Box>
          </TableCell>
          <TableCell className={classes.tableCell}>
            <Tooltip classes={{ tooltip: classes.tooltip }} title={formatDate(row.createdAt)} arrow>
              <span style={{ cursor: 'help' }}>{getRelativeTime(row.createdAt)}</span>
            </Tooltip>
          </TableCell>
          <TableCell className={classes.tableCell}>
            <Box className={classes.actionButtons}>
              <Tooltip title="View Graph">
                <IconButton className={classes.iconButton} size="small" onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/catalog/${entity.metadata.namespace}/component/${entity.metadata.name}/kro-graph`);
                }}>
                  <SitemapIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="View YAML & Events">
                <IconButton className={classes.iconButton} size="small" onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDrawer(row.resource, 0);
                }}>
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
        <Link href={marketplaceUrl} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.text.primary, textDecoration: 'underline' }}>
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
    if (!canListRGDs) {
      return (
        <TableRow>
          <TableCell colSpan={5}>
            <Typography align="center">You don't have permissions to view supporting resources</Typography>
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
    return filteredSupportingResources.map((resource, index) => (
      <TableRow key={`${resource.kind}-${resource.metadata?.name}-${index}`}>
        <TableCell className={classes.tableCell}>
          <span className={`${classes.typeBadge} ${classes.supportingType}`}>{resource.kind}</span>
        </TableCell>
        <TableCell className={classes.tableCell}>{resource.metadata?.name}</TableCell>
        <TableCell className={classes.tableCell}>
          <Box display="flex">
            {resource.status?.conditions?.map((condition: any, idx: number) => (
              <React.Fragment key={`${condition.type}-${idx}`}>
                {renderStatusBadge([condition], condition.type)}
              </React.Fragment>
            ))}
          </Box>
        </TableCell>
        <TableCell className={classes.tableCell}>
          <Box className={classes.actionButtons}>
            <Tooltip title="View YAML & Events">
              <IconButton className={classes.iconButton} size="small" onClick={() => handleOpenDrawer(resource, 0)}>
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

  if (!canListResources && !canListInstances && !canListRGDs) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Resources ({getTotalResourceCount()})</Typography>
          <Box m={2}>
            <Typography gutterBottom>You don't have permissions to view KRO resources</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Resources ({getTotalResourceCount()})</Typography>
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
                        Namespace
                        <IconButton
                          size="small"
                          onClick={(e) => handleFilterClick(e, 'namespace')}
                          style={{ color: isFieldFilterActive('namespace') ? theme.palette.primary.main : theme.palette.text.secondary }}
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

      {/* Supporting Resources Section */}
      <Card style={{ marginTop: theme.spacing(3) }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Supporting Resources</Typography>
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

      <Drawer className={classes.drawer} variant="temporary" anchor="right" open={drawerOpen} onClose={handleCloseDrawer} classes={{ paper: classes.drawerPaper }}>
        <Box className={classes.drawerHeader}>
          <Typography variant="h6">{selectedResource?.metadata?.name || 'Resource Details'}</Typography>
          <IconButton onClick={handleCloseDrawer}><CloseIcon /></IconButton>
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
              <SyntaxHighlighter language="yaml" style={tomorrow} showLineNumbers>
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
              <Typography align="center" color="textSecondary">No events found for this resource</Typography>
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

export default KroResourceTable;
