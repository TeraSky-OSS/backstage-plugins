// KroResourceTable.tsx
import { useState, useEffect } from 'react';
import { default as React } from 'react';
import { useNavigate } from 'react-router-dom';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
import { Drawer } from '@material-ui/core';
import {
  Badge,
  Box,
  ButtonIcon,
  Card,
  CardBody,
  Checkbox,
  DialogTrigger,
  Flex,
  Link,
  Popover,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { CopyTextButton, Progress } from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { kroApiRef } from '../api/KroApi';
import { KroResource } from '@terasky/backstage-plugin-kro-common';
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
import { getAnnotationPrefix, getKroAnnotation } from './annotationUtils';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDownloadLine,
  RiFileTextLine,
  RiFilterLine,
  RiSearchLine,
} from '@remixicon/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import yaml from 'js-yaml';
import styles from './KroResourceTable.module.css';

// Custom Sitemap Icon Component (repo-specific icon, not in the RemixIcon set)
const SitemapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 576 512" {...props}>
    <path d="M208 80c0-26.5 21.5-48 48-48l64 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-8 0 0 40 152 0c30.9 0 56 25.1 56 56l0 32 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-4.4-3.6-8-8-8l-152 0 0 40 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-30.9 25.1-56 56-56l152 0 0-40-8 0c-26.5 0-48-21.5-48-48l0-64z" />
  </svg>
);

// Using KroResource from common package

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
  resource: KroResource;
  level: number;
  parentId?: string;
  isLastChild?: boolean;
  isExternal?: boolean;
  scope?: 'Namespaced' | 'Cluster';
  reconcilePaused?: boolean;
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

const removeManagedFields = (resource: KroResource) => {
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

  // Add spec and status with priority, then any remaining top-level fields
  // (e.g. ConfigMap uses `data`/`binaryData` instead of `spec`)
  if (resourceCopy.spec) {
      orderedResource.spec = resourceCopy.spec;
  }
  if (resourceCopy.status) {
      orderedResource.status = resourceCopy.status;
  }
  const handledTopLevel = new Set(['apiVersion', 'kind', 'metadata', 'spec', 'status']);
  Object.entries(resourceCopy).forEach(([key, value]) => {
      if (!handledTopLevel.has(key)) {
          orderedResource[key] = value;
      }
  });

  return orderedResource;
};

const KroResourceTable = () => {
  const { entity } = useEntity();
  const kroApi = useApi(kroApiRef);
  const config = useApi(configApiRef);
  const navigate = useNavigate();
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
  const annotationPrefix = getAnnotationPrefix(config);

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
  const [supportingResources, setSupportingResources] = useState<KroResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSupportingResources, setLoadingSupportingResources] = useState<boolean>(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [nestedResources, setNestedResources] = useState<Record<string, ResourceTableRow[]>>({});
  const [initialExpansionDone, setInitialExpansionDone] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<string>('manifest');
  const [selectedResource, setSelectedResource] = useState<KroResource | null>(null);
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
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const allResourcesFlattened = getAllResourcesFlattened();
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const filteredResources = allResourcesFlattened.filter(resource => resourceMatchesFilters(resource));
    const autoExpanded = new Set<string>();
    const resourceMap = new Map<string, ResourceTableRow>();
    allResourcesFlattened.forEach(resource => {
      const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
      resourceMap.set(resourceId, resource);
    });
    filteredResources.forEach(resource => {
      let current = resource;
      const visited = new Set<string>();
      while (current) {
        const currentId = current.resource.metadata?.uid || `${current.kind}-${current.name}`;
        if (visited.has(currentId)) {
          // Circular reference detected, break to avoid infinite loop
          break;
        }
        visited.add(currentId);
        
        if (current.parentId) {
          autoExpanded.add(current.parentId);
          current = resourceMap.get(current.parentId)!;
        } else {
          break;
        }
      }
    });
    setAutoExpandedRows(autoExpanded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // --- Use merged expanded rows for rendering if filter is active ---
  const getMergedExpandedRows = () => {
    if (hasActiveFilters) {
      return new Set([...expandedRows, ...autoExpandedRows]);
    }
    return expandedRows;
  };

  // These functions are now handled by the backend

  // Fetch nested resources for a given instance (supports both top-level and nested instances)
  const fetchNestedResources = async (parentId: string, level: number, clusterName: string, namespace: string, parentResource?: any) => {
    let rgdName; let rgdId; let instanceId; let instanceName; let crdName;

    // If parentResource is provided, it's a nested instance - extract from its labels/metadata
    // Check for KRO labels that indicate this is a KRO instance
    if (parentResource?.metadata?.labels?.['kro.run/resource-graph-definition-id']) {
      // For nested instances, we'll rely on the backend to look up the RGD by kind/group/version
      // We only need to extract what we can from the resource itself
      // NOTE: We do NOT use the rgdId from the parent resource's labels because that's the PARENT's RGD ID,
      // not this nested instance's RGD ID. The backend will look up the correct RGD ID.
      instanceId = parentResource.metadata.uid;
      instanceName = parentResource.metadata.name;
      
      // These will be looked up by backend using kind/group/version
      rgdName = undefined;
      crdName = undefined;
      rgdId = undefined;
    } else {
      // Top-level instance - use entity annotations
      const annotations = entity.metadata.annotations || {};
      rgdName = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-name');
      rgdId = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-id');
      instanceId = getKroAnnotation(annotations, annotationPrefix, 'kro-instance-uid');
      instanceName = getKroAnnotation(annotations, annotationPrefix, 'kro-instance-name') || entity.metadata.name;
      crdName = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-crd-name');
    }

    if (!instanceId || !instanceName) {
      // eslint-disable-next-line no-console
      console.warn('Missing required instance metadata', { instanceId, instanceName, parentResource });
      return [];
    }

    try {
      // For nested instances, also pass kind/group/version for backend lookup
      const requestParams: any = {
        clusterName,
        namespace,
        instanceId,
        instanceName,
      };

      // If we have rgdName and crdName, use them directly (top-level instances)
      if (rgdName && crdName) {
        requestParams.rgdName = rgdName;
        requestParams.crdName = crdName;
        requestParams.rgdId = rgdId;
      }

      // If this is a nested instance, provide kind/group/version for backend to look up the RGD
      if (parentResource) {
        const [group, version] = (parentResource.apiVersion || '').split('/');
        requestParams.kind = parentResource.kind;
        requestParams.group = group || parentResource.apiVersion;
        requestParams.version = version || parentResource.apiVersion;
        // Do NOT pass rgdId from parent - let backend look it up from the RGD matching kind/group
      }

      const { resources } = await kroApi.getResources(requestParams);

      return resources
        .filter(r => r.type === 'Resource' || r.type === 'Instance')
        .map(r => ({
          ...r,
          level,
          parentId,
        }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch nested resources:', error);
      return [];
    }
  };

  // Function to expand all resources recursively
  const expandAllResources = async (resources: ResourceTableRow[]) => {
    const newExpandedRows = new Set<string>();
    const visited = new Set<string>();

    const expandRecursively = async (resourceList: ResourceTableRow[]) => {
      for (const resource of resourceList) {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        
        // Skip if already visited to prevent infinite recursion
        if (visited.has(resourceId)) {
          continue;
        }
        visited.add(resourceId);
        
        if (resource.type === 'Instance') {
          newExpandedRows.add(resourceId);

          // Fetch nested resources if not already loaded
          if (!nestedResources[resourceId]) {
            const clusterName = entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1];
            // Pass the resource if it's a KRO instance (has the KRO label), regardless of level
            const hasKroLabel = resource.resource.metadata?.labels?.['kro.run/resource-graph-definition-id'];
            const parentResource = hasKroLabel ? resource.resource : undefined;
            const nested = await fetchNestedResources(resourceId, resource.level + 1, clusterName || '', resource.namespace || 'default', parentResource);
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
      setLoadingSupportingResources(true);
      const annotations = entity.metadata.annotations || {};
      try {
        const rgdName = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-name');
        const rgdId = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-id');
        const instanceId = getKroAnnotation(annotations, annotationPrefix, 'kro-instance-uid');
        const clusterName = annotations['backstage.io/managed-by-location']?.split(": ")[1];
        const namespace = getKroAnnotation(annotations, annotationPrefix, 'kro-instance-namespace') || 'default';

        if (!rgdName || !rgdId || !instanceId || !clusterName) {
          setLoading(false);
          setLoadingSupportingResources(false);
          return;
        }

        const crdName = getKroAnnotation(annotations, annotationPrefix, 'kro-rgd-crd-name');
        if (!crdName) {
          throw new Error('CRD name not found in entity annotations');
        }

        const { resources, supportingResources: supporting } = await kroApi.getResources({
          clusterName,
          namespace,
          rgdName,
          rgdId,
          instanceId,
          instanceName: getKroAnnotation(annotations, annotationPrefix, 'kro-instance-name') || entity.metadata.name,
          crdName,
        });

        setAllResources(resources);
        setSupportingResources(supporting);

        // Expand all resources by default after initial load
        if (!initialExpansionDone) {
          await expandAllResources(resources);
          setInitialExpansionDone(true);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching resources:', error);
        setAllResources([]);
        setSupportingResources([]);
      } finally {
        setLoading(false);
        setLoadingSupportingResources(false);
      }
    };
    fetchAllResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kroApi, entity, canListResources, canListInstances, canListRGDs]);

  // Supporting resources are now fetched as part of getResources

  // Utility functions
  const fetchEvents = async (resource: KroResource) => {
    setLoadingEvents(true);
    try {
      const { events: resourceEvents } = await kroApi.getEvents({
        clusterName: entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1] || '',
        namespace: resource.metadata?.namespace || 'default',
        resourceName: resource.metadata?.name || '',
        resourceKind: resource.kind || '',
      });
      setEvents(resourceEvents);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleOpenDrawer = (resource: KroResource, tab: 'manifest' | 'events') => {
    let resourceType: string;
    if (resource.kind === 'ResourceGraphDefinition') {
      resourceType = 'RGD';
    } else if (resource.metadata?.labels?.['kro.run/resource-graph-definition-id']) {
      resourceType = resource.metadata?.uid === getKroAnnotation(entity.metadata.annotations, annotationPrefix, 'kro-instance-uid') ? 'Instance' : 'Resource';
    } else {
      resourceType = 'Resource';
    }

    // Check if we can show the requested tab
    if (tab === 'events') {
      let canShowEvents: boolean;
      if (resourceType === 'RGD') {
        canShowEvents = canShowEventsRGDs;
      } else if (resourceType === 'Instance') {
        canShowEvents = canShowEventsInstances;
      } else {
        canShowEvents = canShowEventsResources;
      }
      if (!canShowEvents) {
        return;
      }
    } else { // YAML tab
      let canViewYaml: boolean;
      if (resourceType === 'RGD') {
        canViewYaml = canViewYamlRGDs;
      } else if (resourceType === 'Instance') {
        canViewYaml = canViewYamlInstances;
      } else {
        canViewYaml = canViewYamlResources;
      }
      if (!canViewYaml) {
        return;
      }
    }

    setSelectedResource(resource);
    setSelectedTab(tab);
    setDrawerOpen(true);
    if (tab === 'events') {
      fetchEvents(resource);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedResource(null);
    setEvents([]);
  };

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue);
    if (newValue === 'events' && selectedResource) {
      fetchEvents(selectedResource);
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
        // eslint-disable-next-line no-console
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
      const clusterName = entity.metadata.annotations?.['backstage.io/managed-by-location']?.split(": ")[1] || '';
      const namespace = resource.namespace || 'default';
      // Pass the resource if it's a KRO instance (has the KRO label), regardless of level
      // This handles both nested instances (level > 0) and top-level instances viewed on their own entity page
      const hasKroLabel = resource.resource.metadata?.labels?.['kro.run/resource-graph-definition-id'];
      const parentResource = hasKroLabel ? resource.resource : undefined;
      const nested = await fetchNestedResources(resourceId, resource.level + 1, clusterName, namespace, parentResource);
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
    return (
      <TooltipTrigger key={conditionType}>
        <span className={`${styles.statusBadge} ${isSuccess ? styles.badgePositive : styles.badgeNegative}`}>{conditionType}</span>
        <Tooltip>
          <Box style={{ maxWidth: '380px' }}>
            <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Condition: {condition.type}</Text>
            <Text variant="body-small" style={{ display: 'block' }}>Status: {condition.status}</Text>
            {condition.reason && <Text variant="body-small" style={{ display: 'block' }}>Reason: {condition.reason}</Text>}
            {condition.lastTransitionTime && <Text variant="body-small" style={{ display: 'block' }}>Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}</Text>}
            {condition.message && <Text variant="body-small" style={{ wordWrap: 'break-word', display: 'block' }}>Message: {condition.message}</Text>}
          </Box>
        </Tooltip>
      </TooltipTrigger>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()  } ${  date.toLocaleTimeString()}`;
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
      case 'RGD': return styles.badgeAccent;
      case 'Instance': return styles.badgePositive;
      case 'Resource': return styles.badgeAnnouncement;
      default: return '';
    }
  };

  const getEventTypeChip = (type?: string) => {
    switch (type) {
      case 'Warning': return <span className={`${styles.statusBadge} ${styles.badgeWarning}`}>{type}</span>;
      case 'Error': return <span className={`${styles.statusBadge} ${styles.badgeNegative}`}>{type}</span>;
      default: return <span className={`${styles.statusBadge} ${styles.badgeAccent}`}>{type || 'Normal'}</span>;
    }
  };

  const getTotalResourceCount = (): number => {
    let count = allResources.filter(r => !r.parentId).length;
    const visited = new Set<string>();
    
    const countNested = (parentId: string): number => {
      if (visited.has(parentId)) return 0;
      visited.add(parentId);
      
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

    // Track visited resources to prevent infinite recursion
    const visited = new Set<string>();

    // Collect values from all resources (including nested)
    const collectValues = (resources: ResourceTableRow[]) => {
      resources.forEach(resource => {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        
        // Skip if already visited to prevent infinite recursion
        if (visited.has(resourceId)) {
          return;
        }
        visited.add(resourceId);

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
      
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
          
          // Add nested resources recursively only if not already processed
          if (nestedResources[resourceId]) {
            addResourcesRecursively(nestedResources[resourceId]);
          }
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
      const visited = new Set<string>();
      while (current) {
        const resourceId = current.resource.metadata?.uid || `${current.kind}-${current.name}`;
        if (visited.has(resourceId)) {
          // Circular reference detected, break to avoid infinite loop
          break;
        }
        visited.add(resourceId);
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

  const getFilteredSupportingResources = (): KroResource[] => {
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
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
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

  const renderRowStatusBadges = (row: ResourceTableRow) => {
    if (row.type === 'Resource') {
      return row.status.conditions.length > 0 ? (
        row.status.conditions.map((condition: any, idx: number) => (
          <TooltipTrigger key={`${condition.type}-${idx}`}>
            <span className={`${styles.statusBadge} ${condition.status === 'True' ? styles.badgePositive : styles.badgeNegative}`}>
              {condition.type}
            </span>
            <Tooltip>
              <Box style={{ maxWidth: '380px' }}>
                <Text variant="body-small" weight="bold" style={{ display: 'block' }}>Condition: {condition.type}</Text>
                <Text variant="body-small" style={{ display: 'block' }}>Status: {condition.status}</Text>
                {condition.reason && <Text variant="body-small" style={{ display: 'block' }}>Reason: {condition.reason}</Text>}
                {condition.lastTransitionTime && <Text variant="body-small" style={{ display: 'block' }}>Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}</Text>}
                {condition.message && <Text variant="body-small" style={{ wordWrap: 'break-word', display: 'block' }}>Message: {condition.message}</Text>}
              </Box>
            </Tooltip>
          </TooltipTrigger>
        ))
      ) : (
        <span className={`${styles.statusBadge} ${styles.badgePositive}`}>No Conditions</span>
      );
    }
    if (row.type === 'RGD') {
      return (
        <>
          {renderStatusBadge(row.status.conditions, 'Ready')}
          {renderStatusBadge(row.status.conditions, 'Active')}
        </>
      );
    }
    if (row.type === 'Instance') {
      return row.status.conditions.find((c: any) => c.type === 'Ready')
        ? renderStatusBadge(row.status.conditions, 'Ready')
        : renderStatusBadge(row.status.conditions, 'InstanceSynced');
    }
    return null;
  };

  const renderResourceRows = (resources: ResourceTableRow[], _?: string): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    resources.forEach((row, index) => {
      const resourceId = row.resource.metadata?.uid || `${row.kind}-${row.name}-${index}`;
      const mergedExpandedRows = getMergedExpandedRows();
      const isExpanded = mergedExpandedRows.has(resourceId);

      // Check if this resource can be expanded
      // Show expand icon for all instances, and for already-loaded nested resources that have children
      const canExpand = row.type === 'Instance' || (nestedResources[resourceId] && nestedResources[resourceId].length > 0);

      rows.push(
        <tr key={resourceId} className={`${styles.clickableRow} ${row.level > 0 ? styles.nestedRow : ''}`}>
          <td className={styles.tableCell}>
            <span className={`${styles.typeBadge} ${getTypeBadgeClass(row.type)}`}>{row.type}</span>
          </td>
          <td className={styles.tableCell}>
            <div className={styles.resourceName}>
              {Array.from({ length: row.level }).map((_item, indentIndex) => (
                <div key={indentIndex} className={styles.indent} />
              ))}
              <div className={styles.resourceNameContent}>
                {canExpand && (
                  <ButtonIcon
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    icon={isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                    size="small"
                    onPress={() => handleRowExpand(row)}
                  />
                )}
                {row.name}
                {row.isExternal && (
                  <TooltipTrigger>
                    <span className={styles.externalBadge}>EXTERNAL</span>
                    <Tooltip>External Reference - Not managed by KRO</Tooltip>
                  </TooltipTrigger>
                )}
                {row.reconcilePaused && (
                  <TooltipTrigger>
                    <Badge style={{ color: 'var(--bui-fg-warning)' }}>Paused</Badge>
                    <Tooltip>Reconciliation is paused for this instance (kro.run/reconcile: disabled)</Tooltip>
                  </TooltipTrigger>
                )}
              </div>
            </div>
          </td>
          <td className={styles.tableCell}>
            {row.scope === 'Cluster' ? (
              <TooltipTrigger>
                <Badge style={{ color: 'var(--bui-fg-announcement)' }}>Cluster-Scoped</Badge>
                <Tooltip>Cluster-scoped resource (no namespace)</Tooltip>
              </TooltipTrigger>
            ) : (
              <TooltipTrigger>
                <span>{row.namespace || '-'}</span>
                <Tooltip>{row.namespace ? `Namespace: ${row.namespace}` : 'Cluster-scoped resource'}</Tooltip>
              </TooltipTrigger>
            )}
          </td>
          <td className={styles.tableCell}>{row.group}</td>
          <td className={styles.tableCell}>{row.kind}</td>
          <td className={styles.tableCell}>
            <Flex style={{ flexWrap: 'wrap' }}>
              {renderRowStatusBadges(row)}
            </Flex>
          </td>
          <td className={styles.tableCell}>
            <TooltipTrigger>
              <span style={{ cursor: 'help' }}>{getRelativeTime(row.createdAt)}</span>
              <Tooltip>{formatDate(row.createdAt)}</Tooltip>
            </TooltipTrigger>
          </td>
          <td className={styles.tableCell}>
            <Flex className={styles.actionButtons}>
              <TooltipTrigger>
                <ButtonIcon
                  aria-label="View Graph"
                  icon={<SitemapIcon />}
                  size="small"
                  onPress={() => navigate(`/catalog/${entity.metadata.namespace}/component/${entity.metadata.name}/kro-graph`)}
                />
                <Tooltip>View Graph</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger>
                <ButtonIcon
                  aria-label="View YAML & Events"
                  icon={<RiFileTextLine />}
                  size="small"
                  onPress={() => handleOpenDrawer(row.resource, 'manifest')}
                />
                <Tooltip>View YAML & Events</Tooltip>
              </TooltipTrigger>
            </Flex>
          </td>
        </tr>
      );
      // Don't add nested resources here since they're already included in the flattened list
      // The expand button is just for visual indication now
    });
    return rows;
  };

  const getArtifact = (resource: KroResource) => {
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
        <Link href={marketplaceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bui-fg-primary)', textDecoration: 'underline' }}>
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
        <Link href={marketplaceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bui-fg-primary)', textDecoration: 'underline' }}>
          {packageName}
        </Link>
      );
    }
    return packageName;
  };

  const renderSupportingResourceRows = () => {
    if (!canListRGDs) {
      return (
        <tr>
          <td className={styles.tableCell} colSpan={5}>
            <Text style={{ textAlign: 'center', display: 'block' }}>You don't have permissions to view supporting resources</Text>
          </td>
        </tr>
      );
    }
    if (loadingSupportingResources) {
      return (
        <tr>
          <td className={styles.tableCell} colSpan={5}>
            <Flex align="center" justify="center" p="4">
              <Progress />
            </Flex>
          </td>
        </tr>
      );
    }
    const filteredSupportingResources = getFilteredSupportingResources();
    if (filteredSupportingResources.length === 0) {
      return (
        <tr>
          <td className={styles.tableCell} colSpan={5}>
            <Text style={{ textAlign: 'center', display: 'block' }}>No supporting resources found</Text>
          </td>
        </tr>
      );
    }
    return filteredSupportingResources.map((resource, index) => (
      <tr key={`${resource.kind}-${resource.metadata?.name}-${index}`}>
        <td className={styles.tableCell}>
          <span className={`${styles.typeBadge} ${styles.badgeAccent}`}>{resource.kind}</span>
        </td>
        <td className={styles.tableCell}>{resource.metadata?.name}</td>
        <td className={styles.tableCell}>
          <Flex style={{ flexWrap: 'wrap' }}>
            {resource.status?.conditions?.map((condition: any, idx: number) => (
              <React.Fragment key={`${condition.type}-${idx}`}>
                {renderStatusBadge([condition], condition.type)}
              </React.Fragment>
            ))}
          </Flex>
        </td>
        <td className={styles.tableCell}>
          <Flex className={styles.actionButtons}>
            <TooltipTrigger>
              <ButtonIcon
                aria-label="View YAML & Events"
                icon={<RiFileTextLine />}
                size="small"
                onPress={() => handleOpenDrawer(resource, 'manifest')}
              />
              <Tooltip>View YAML & Events</Tooltip>
            </TooltipTrigger>
          </Flex>
        </td>
      </tr>
    ));
  };

  // Reusable filterable column header: owns its own popover open state via DialogTrigger,
  // so no anchor-element/open-state bookkeeping is needed in the parent component.
  const ColumnFilterHeader = ({
    label,
    options,
    selected,
    onChange,
  }: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
  }) => {
      const [searchValue, setSearchValue] = useState('');
      const isActive = selected.length > 0;
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
          <Flex align="center" justify="between" gap="2">
              <span>{label}</span>
              <DialogTrigger>
                  <ButtonIcon
                      aria-label={`Filter ${label}`}
                      icon={<RiFilterLine />}
                      size="small"
                      style={isActive ? { color: 'var(--bui-accent-bg)' } : undefined}
                  />
                  <Popover>
                      <Box className={styles.filterPopoverBody}>
                          <TextField
                              size="small"
                              placeholder="Search..."
                              icon={<RiSearchLine />}
                              value={searchValue}
                              onChange={setSearchValue}
                          />
                          <Box className={styles.filterList}>
                              <Checkbox
                                  isSelected={allSelected}
                                  isIndeterminate={selected.length > 0 && !allSelected}
                                  onChange={handleSelectAll}
                              >
                                  All
                              </Checkbox>
                              {filteredOptions.map(option => (
                                  <Checkbox key={option} isSelected={selected.includes(option)} onChange={() => handleToggle(option)}>
                                      {option}
                                  </Checkbox>
                              ))}
                          </Box>
                      </Box>
                  </Popover>
              </DialogTrigger>
          </Flex>
      );
  };

  if (!canListResources && !canListInstances && !canListRGDs) {
    return (
      <Card>
        <CardBody>
          <Box mb="4">
            <Text variant="title-small" weight="bold">Resources ({getTotalResourceCount()})</Text>
          </Box>
          <Box m="2">
            <Text>You don't have permissions to view KRO resources</Text>
          </Box>
        </CardBody>
      </Card>
    );
  }


  return (
    <>
      <Card>
        <CardBody>
          <Box mb="4">
            <Text variant="title-small" weight="bold">Resources ({getTotalResourceCount()})</Text>
          </Box>
          {loading && (
            <Flex align="center" justify="center" style={{ height: '200px' }}>
              <Progress />
            </Flex>
          )}
          {!loading && (allResources.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Type" options={getAllResourceValues().type} selected={filters.type} onChange={(v) => handleFilterChange('type', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Name" options={getAllResourceValues().name} selected={filters.name} onChange={(v) => handleFilterChange('name', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Namespace" options={getAllResourceValues().namespace} selected={filters.namespace} onChange={(v) => handleFilterChange('namespace', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Group" options={getAllResourceValues().group} selected={filters.group} onChange={(v) => handleFilterChange('group', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Kind" options={getAllResourceValues().kind} selected={filters.kind} onChange={(v) => handleFilterChange('kind', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Status" options={getAllResourceValues().status} selected={filters.status} onChange={(v) => handleFilterChange('status', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Created" options={getAllResourceValues().created} selected={filters.created} onChange={(v) => handleFilterChange('created', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {renderResourceRows(getFilteredResources())}
                </tbody>
              </table>
            </div>
          ) : (
            <Text>No resources found</Text>
          ))}
        </CardBody>
      </Card>

      {/* Supporting Resources Section */}
      <Card style={{ marginTop: 'var(--bui-space-6)' }}>
        <CardBody>
          <Box mb="4">
            <Text variant="title-small" weight="bold">Supporting Resources</Text>
          </Box>
          {loadingSupportingResources ? (
            <Flex align="center" justify="center" style={{ height: '200px' }}>
              <Progress />
            </Flex>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Type" options={getSupportingResourceValues().type} selected={supportingFilters.type} onChange={(v) => handleSupportingFilterChange('type', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Name" options={getSupportingResourceValues().name} selected={supportingFilters.name} onChange={(v) => handleSupportingFilterChange('name', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Status" options={getSupportingResourceValues().status} selected={supportingFilters.status} onChange={(v) => handleSupportingFilterChange('status', v)} />
                    </th>
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {renderSupportingResourceRows()}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
        <Box style={{ width: '800px' }}>
          <Flex align="center" justify="between" className={styles.drawerHeader}>
            <Text variant="title-small" weight="bold">{selectedResource?.metadata?.name || 'Resource Details'}</Text>
            <ButtonIcon aria-label="Close" icon={<RiCloseLine />} onPress={handleCloseDrawer} />
          </Flex>
          <Tabs selectedKey={selectedTab} onSelectionChange={key => handleTabChange(String(key))}>
            <TabList>
              <Tab id="manifest">Kubernetes Manifest</Tab>
              <Tab id="events">Kubernetes Events</Tab>
            </TabList>
            <TabPanel id="manifest">
              <Box className={styles.tabContent}>
                {selectedResource && (
                  <>
                    <Flex className={styles.yamlActions}>
                      <CopyTextButton text={yaml.dump(removeManagedFields(selectedResource))} aria-label="Copy YAML to clipboard" />
                      <TooltipTrigger>
                        <ButtonIcon aria-label="Download YAML" icon={<RiDownloadLine />} size="small" onPress={handleDownloadYaml} />
                        <Tooltip>Download YAML</Tooltip>
                      </TooltipTrigger>
                    </Flex>
                    <SyntaxHighlighter language="yaml" style={tomorrow} showLineNumbers>
                      {yaml.dump(removeManagedFields(selectedResource))}
                    </SyntaxHighlighter>
                  </>
                )}
              </Box>
            </TabPanel>
            <TabPanel id="events">
              <Box className={styles.tabContent}>
                {loadingEvents && (
                  <Flex align="center" justify="center" p="4">
                    <Progress />
                  </Flex>
                )}
                {!loadingEvents && (
                  events.length > 0 ? (
                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.tableCell}>Type</th>
                            <th className={styles.tableCell}>Reason</th>
                            <th className={styles.tableCell}>Age</th>
                            <th className={styles.tableCell}>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((event, index) => (
                            <tr key={index} className={styles.clickableRow}>
                              <td className={styles.tableCell}>{getEventTypeChip(event.type)}</td>
                              <td className={styles.tableCell}>{event.reason}</td>
                              <td className={styles.tableCell}>{getRelativeTime(event.lastTimestamp || event.firstTimestamp)}</td>
                              <td className={styles.tableCell}>{event.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Text style={{ textAlign: 'center', color: 'var(--bui-fg-secondary)', display: 'block' }}>No events found for this resource</Text>
                  )
                )}
              </Box>
            </TabPanel>
          </Tabs>
        </Box>
      </Drawer>
    </>
  );
};

export default KroResourceTable;
