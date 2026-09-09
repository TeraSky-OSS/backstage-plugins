// ModernCrossplaneV2ResourceTable.tsx
import { useState, useEffect } from 'react';
import { default as React } from 'react';
import { useNavigate } from 'react-router-dom';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
import { Drawer } from '@material-ui/core';
import {
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
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { crossplaneApiRef } from '../api/CrossplaneApi';
import { useEntity } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  listCompositeResourcesPermission,
  listManagedResourcesPermission,
  listAdditionalResourcesPermission
} from '@terasky/backstage-plugin-crossplane-common';
import pluralize from 'pluralize';
import { getAnnotation, getAnnotationPrefix } from './annotationUtils';
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
import styles from './CrossplaneV2ResourceTable.module.css';

// Custom Sitemap Icon Component (repo-specific icon, not in the RemixIcon set)
const SitemapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 576 512" {...props}>
    <path d="M208 80c0-26.5 21.5-48 48-48l64 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-8 0 0 40 152 0c30.9 0 56 25.1 56 56l0 32 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-4.4-3.6-8-8-8l-152 0 0 40 8 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-64 0c-26.5 0-48-21.5-48-48l0-64c0-26.5 21.5-48 48-48l8 0 0-32c0-30.9 25.1-56 56-56l152 0 0-40-8 0c-26.5 0-48-21.5-48-48l0-64z" />
  </svg>
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
    crossplane?: {
      resourceRefs?: Array<any>;
    };
    forProvider?: any; // This indicates it's a Crossplane MR
    providerConfigRef?: { name?: string };
    package?: string;
  };
}

interface ResourceTableRow {
  type: 'XR' | 'MR' | 'K8s'; // Added 'K8s' for regular Kubernetes resources
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

const CrossplaneV2ResourceTable = () => {
  const { entity } = useEntity();
  const crossplaneApi = useApi(crossplaneApiRef);
  const config = useApi(configApiRef);
  const navigate = useNavigate();
  const enablePermissions = config.getOptionalBoolean('crossplane.enablePermissions') ?? false;
  const annotationPrefix = getAnnotationPrefix(config);

  const { allowed: canListCompositeTemp } = usePermission({ permission: listCompositeResourcesPermission });
  const { allowed: canListManagedTemp } = usePermission({ permission: listManagedResourcesPermission });
  const { allowed: canListAdditionalTemp } = usePermission({ permission: listAdditionalResourcesPermission });

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
  const [selectedTab, setSelectedTab] = useState<string>('manifest');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // --- Use merged expanded rows for rendering if filter is active ---
  const getMergedExpandedRows = () => {
    if (hasActiveFilters) {
      return new Set([...expandedRows, ...autoExpandedRows]);
    }
    return expandedRows;
  };

  // Helper function to extract API group from apiVersion
  const getApiGroup = (apiVersion?: string): string => {
    if (!apiVersion) return 'Unknown';

    if (apiVersion.includes('/')) {
      const [group, _version] = apiVersion.split('/');
      return group;
    }
      // For core Kubernetes resources (v1), return 'core' instead of 'v1'
      return apiVersion === 'v1' ? 'core' : apiVersion;

  };

  // Fetch nested managed resources for a given XR
  const fetchNestedResources = async (parentResource: ExtendedKubernetesObject, parentId: string, level: number, scope: string, clusterOfComposite: string, xrNamespace?: string) => {
    const resourceRefs = parentResource.spec?.crossplane?.resourceRefs || [];
    if (!clusterOfComposite || resourceRefs.length === 0) return [];
    const nestedResourcesPromises = resourceRefs.map(async (ref: any, index: number) => {
      let apiGroup = '';
      let apiVersion = '';
      if (ref.apiVersion.includes('/')) {
        [apiGroup, apiVersion] = ref.apiVersion.split('/');
      } else {
        apiGroup = '';
        apiVersion = ref.apiVersion;
      }
      const kindPlural = pluralize(ref.kind.toLowerCase());
                // For managed resources, always try namespace first, then cluster-scoped
                // Even under cluster-scoped XRs, managed resources might be namespaced
                const mrNamespace = ref.namespace || xrNamespace;
      try {
        const resourceResponse = await crossplaneApi.getResources({
          clusterName: clusterOfComposite,
          namespace: mrNamespace,
          group: apiGroup,
          version: apiVersion,
          plural: kindPlural,
          name: ref.name,
        });
        const nestedResource = resourceResponse.resources[0].resource;

        // Determine resource type based on spec.forProvider and resourceRefs
        let resourceType: 'XR' | 'MR' | 'K8s';
        if (nestedResource.spec?.crossplane?.resourceRefs && nestedResource.spec.crossplane.resourceRefs.length > 0) {
          resourceType = 'XR';
        } else if (nestedResource.spec?.forProvider) {
          resourceType = 'MR'; // Crossplane Managed Resource
        } else {
          resourceType = 'K8s'; // Regular Kubernetes resource
        }

        // Handle status differently based on resource type
        const status = {
          synced: false,
          ready: false,
          conditions: nestedResource.status?.conditions || []
        };

        if (resourceType === 'MR') {
          // For MRs, use Synced and Ready conditions
          status.synced = nestedResource.status?.conditions?.find(c => c.type === 'Synced')?.status === 'True' || false;
          status.ready = nestedResource.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' || false;
        } else if (resourceType === 'K8s') {
          // For K8s resources, don't use Synced/Ready, just track conditions
          status.synced = true; // Not applicable for K8s resources
          status.ready = true; // Not applicable for K8s resources
        } else {
          // For XRs, use Synced and Ready conditions
          status.synced = nestedResource.status?.conditions?.find(c => c.type === 'Synced')?.status === 'True' || false;
          status.ready = nestedResource.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' || false;
        }

        return {
          type: resourceType,
          name: nestedResource.metadata?.name || 'Unknown',
          namespace: nestedResource.metadata?.namespace,
          group: getApiGroup(nestedResource.apiVersion),
          kind: nestedResource.kind || 'Unknown',
          status: status,
          createdAt: nestedResource.metadata?.creationTimestamp || '',
          resource: nestedResource,
          level: level,
          parentId: parentId,
          isLastChild: index === resourceRefs.length - 1
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching nested resource:', error);
        return null;
      }
    });
    const fetchedResources = (await Promise.all(nestedResourcesPromises)).filter(r => r !== null) as ResourceTableRow[];
    // Recursively fetch nested resources for XRs
    for (const resource of fetchedResources) {
      if (resource.type === 'XR' && resource.resource.spec?.crossplane?.resourceRefs) {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        const deeperNested = await fetchNestedResources(resource.resource, resourceId, level + 1, scope, clusterOfComposite || '', resource.namespace);
        if (deeperNested.length > 0) {
          setNestedResources(prev => ({ ...prev, [resourceId]: deeperNested }));
        }
      }
    }
    return fetchedResources;
  };

  // Function to expand all resources recursively
  const expandAllResources = (resources: ResourceTableRow[], nestedResourcesMap: { [key: string]: ResourceTableRow[] }) => {
    const newExpandedRows = new Set<string>();

    const expandRecursively = (resourceList: ResourceTableRow[]) => {
      for (const resource of resourceList) {
        const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
        // Check if this resource has nested resources already loaded
        if (nestedResourcesMap[resourceId] && nestedResourcesMap[resourceId].length > 0) {
          newExpandedRows.add(resourceId);
          // Recursively expand nested resources
          expandRecursively(nestedResourcesMap[resourceId]);
        }
      }
    };

    expandRecursively(resources);
    setExpandedRows(newExpandedRows);
  };

  // Fetch all resources (composite and managed)
  useEffect(() => {
    const fetchAllResources = async () => {
      setLoading(true);
      const resources: ResourceTableRow[] = [];
      const annotations = entity.metadata.annotations || {};

      try {
        const compositePlural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
        const compositeGroup = getAnnotation(annotations, annotationPrefix, 'composite-group');
        const compositeVersion = getAnnotation(annotations, annotationPrefix, 'composite-version');
        const compositeName = getAnnotation(annotations, annotationPrefix, 'composite-name');
        const clusterOfComposite = annotations['backstage.io/managed-by-location']?.split(": ")[1];
        const scope = getAnnotation(annotations, annotationPrefix, 'crossplane-scope') as 'Namespaced' | 'Cluster';
        const namespace = getAnnotation(annotations, annotationPrefix, 'composite-namespace') || 'default';

        if (compositePlural && compositeGroup && compositeVersion && compositeName && clusterOfComposite) {
          try {
            // Use getV2ResourceGraph to get all resources including synthetic K8s resources from Objects
            const graphResponse = await crossplaneApi.getV2ResourceGraph({
              clusterName: clusterOfComposite,
              namespace,
              name: compositeName,
              group: compositeGroup,
              version: compositeVersion,
              plural: compositePlural,
              scope: scope || 'Cluster',
            });

            // Process all resources from the graph response
            const allGraphResources = graphResponse.resources;

            // Build a map for quick lookup
            const resourceByUid = new Map<string, ExtendedKubernetesObject>();
            allGraphResources.forEach(resource => {
              if (resource.metadata?.uid) {
                resourceByUid.set(resource.metadata.uid, resource);
              }
            });

            // Helper to determine resource type
            const determineResourceType = (resource: ExtendedKubernetesObject): 'XR' | 'MR' | 'K8s' => {
              // Check for XR vs MR vs K8s based on spec structure
              const spec = (resource as any).spec;

              // XR: Has resourceRefs array with items
              if (spec?.crossplane?.resourceRefs && Array.isArray(spec.crossplane.resourceRefs) && spec.crossplane.resourceRefs.length > 0) {
                return 'XR';
              }

              // MR: Has spec.forProvider (Crossplane Managed Resource)
              if (spec?.forProvider) {
                return 'MR';
              }

              // K8s: Regular Kubernetes resource (no spec.forProvider)
              return 'K8s';
            };

            // Helper to convert resource to table row
            const toTableRow = (resource: ExtendedKubernetesObject, level: number, parentId?: string): ResourceTableRow => {
              const resourceType = determineResourceType(resource);

              // Handle status differently based on resource type
              const status = {
                synced: false,
                ready: false,
                conditions: resource.status?.conditions || []
              };

              if (resourceType === 'MR' || resourceType === 'XR') {
                status.synced = resource.status?.conditions?.find(c => c.type === 'Synced')?.status === 'True' || false;
                status.ready = resource.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' || false;
              } else if (resourceType === 'K8s') {
                status.synced = true; // Not applicable
                status.ready = true; // Not applicable
              }

              return {
                type: resourceType,
                name: resource.metadata?.name || 'Unknown',
                namespace: resource.metadata?.namespace,
                group: getApiGroup(resource.apiVersion),
                kind: resource.kind || 'Unknown',
                status,
                createdAt: resource.metadata?.creationTimestamp || '',
                resource,
                level,
                parentId
              };
            };

            // Build hierarchy: group resources by their parent
            const childrenByParent = new Map<string | undefined, ExtendedKubernetesObject[]>();
            allGraphResources.forEach(resource => {
              const parentUid = resource.metadata?.ownerReferences?.[0]?.uid;
              if (!childrenByParent.has(parentUid)) {
                childrenByParent.set(parentUid, []);
              }
              childrenByParent.get(parentUid)!.push(resource);
            });

            // Recursively build table rows starting from root (no parent)
            const nestedResourcesMap: { [key: string]: ResourceTableRow[] } = {};

            const buildTableRows = (parentUid: string | undefined, level: number): ResourceTableRow[] => {
              const children = childrenByParent.get(parentUid) || [];
              return children.map(child => {
                const childUid = child.metadata?.uid;
                const tableRow = toTableRow(child, level, parentUid);

                // Recursively process this child's children
                if (childUid && childrenByParent.has(childUid)) {
                  const grandchildren = buildTableRows(childUid, level + 1);
                  if (grandchildren.length > 0) {
                    nestedResourcesMap[childUid] = grandchildren;
                  }
                }

                return tableRow;
              });
            };

            // Start from root resources (those with no parent)
            const topLevelRows = buildTableRows(undefined, 0);
            resources.push(...topLevelRows);
            setNestedResources(nestedResourcesMap);

          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching resource graph:', error);
          }
        }

        setAllResources(resources);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossplaneApi, entity, canListComposite, canListManaged, enablePermissions]);

  // Expand all resources after they are loaded (only on first load)
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (!loading && !initialExpansionDone && allResources.length > 0) {
      // Use a small delay to ensure all state updates have settled
      timer = setTimeout(() => {
        expandAllResources(allResources, nestedResources);
        setInitialExpansionDone(true);
      }, 100);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loading, allResources, nestedResources, initialExpansionDone]);

  // Fetch supporting resources (XRD, Composition, Functions, Providers)
  useEffect(() => {
    const fetchSupportingResources = async () => {
      if (!canListAdditional) {
        setLoadingSupportingResources(false);
        return;
      }
      const annotations = entity.metadata.annotations || {};
      const clusterOfComposite = annotations['backstage.io/managed-by-location']?.split(": ")[1];
      if (!clusterOfComposite) {
        setLoadingSupportingResources(false);
        return;
      }
      try {
        const newSupportingResources: ExtendedKubernetesObject[] = [];
        // Fetch XRD
        const xrdPlural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
        const xrdGroup = getAnnotation(annotations, annotationPrefix, 'composite-group');
        const xrdName = `${xrdPlural}.${xrdGroup}`;
        // eslint-disable-next-line no-console
        console.log('XRD Info:', { xrdPlural, xrdGroup, xrdName });
        if (xrdName && xrdPlural && xrdGroup) {
          try {
            const xrdResponse = await crossplaneApi.getResources({
              clusterName: clusterOfComposite,
              group: 'apiextensions.crossplane.io',
              version: 'v1',
              plural: 'compositeresourcedefinitions',
              name: xrdName,
            });
            // eslint-disable-next-line no-console
            console.log('XRD Response:', xrdResponse);
            const xrdResource = xrdResponse.resources[0].resource;
            newSupportingResources.push(xrdResource);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching XRD:', error);
          }
        }

        // Fetch Composition
        const compositionName = getAnnotation(annotations, annotationPrefix, 'composition-name');
        // eslint-disable-next-line no-console
        console.log('Composition Name:', compositionName);
        if (compositionName) {
          try {
            const compositionResponse = await crossplaneApi.getResources({
              clusterName: clusterOfComposite,
              group: 'apiextensions.crossplane.io',
              version: 'v1',
              plural: 'compositions',
              name: compositionName,
            });
            // eslint-disable-next-line no-console
            console.log('Composition Response:', compositionResponse);
            const compositionResource = compositionResponse.resources[0].resource;
            newSupportingResources.push(compositionResource);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching composition:', error);
          }
        }

        // Fetch Composition Functions
        const compositionFunctions = getAnnotation(annotations, annotationPrefix, 'composition-functions')?.split(',') || [];
        // eslint-disable-next-line no-console
        console.log('Composition Functions:', compositionFunctions);
        for (const functionName of compositionFunctions) {
          if (functionName) {
            try {
              const functionResponse = await crossplaneApi.getResources({
                clusterName: clusterOfComposite,
                group: 'pkg.crossplane.io',
                version: 'v1beta1',
                plural: 'functions',
                name: functionName.trim(), // Add trim() to handle any whitespace
              });
              // eslint-disable-next-line no-console
              console.log(`Function Response for ${functionName}:`, functionResponse);
              const functionResource = functionResponse.resources[0].resource;
              newSupportingResources.push(functionResource);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(`Error fetching function ${functionName}:`, error);
              newSupportingResources.push({
                kind: 'Function',
                metadata: { name: functionName },
                status: { conditions: [{ type: 'Error', status: 'Error fetching function' }] },
              });
            }
          }
        }
        // Fetch Provider resources (using V2 logic)
        const compositePlural = getAnnotation(annotations, annotationPrefix, 'composite-plural');
        const compositeGroup = getAnnotation(annotations, annotationPrefix, 'composite-group');
        const compositeVersion = getAnnotation(annotations, annotationPrefix, 'composite-version');
        const compositeName = getAnnotation(annotations, annotationPrefix, 'composite-name');
        const scope = getAnnotation(annotations, annotationPrefix, 'crossplane-scope');
        const namespace = entity.metadata.namespace || annotations.namespace || 'default';
        if (compositePlural && compositeGroup && compositeVersion && compositeName) {
          // For supporting resources, we don't need to pass namespace since they're always cluster-scoped
          const compositeResponse = await crossplaneApi.getResources({
            clusterName: clusterOfComposite,
            group: compositeGroup,
            version: compositeVersion,
            plural: compositePlural,
            name: compositeName,
          });
          const compositeResource = compositeResponse.resources[0].resource;
          const resourceRefs = compositeResource.spec?.crossplane?.resourceRefs || [];
          const xrNamespace = (scope === 'Namespaced') ? (compositeResource.metadata?.namespace || namespace) : undefined;
          const uniqueManagedResources = Array.from(new Set(resourceRefs.map((ref: { kind: any; apiVersion: any; }) => `${ref.kind}-${ref.apiVersion}`)))
            .map(key => {
              const foundRef = resourceRefs.find((refItem: { kind: any; apiVersion: any; }) => `${refItem.kind}-${refItem.apiVersion}` === key);
              if (foundRef && !foundRef.namespace && scope === 'Namespaced') {
                return { ...foundRef, namespace: xrNamespace };
              }
              return foundRef;
            });
          const providerResourcesSet = new Set();
          const providerResources = await Promise.all(uniqueManagedResources.map(async (ref: any) => {
            try {
              let apiGroup = '';
              if (ref.apiVersion.includes('/')) {
                [apiGroup] = ref.apiVersion.split('/');
              } else {
                apiGroup = '';
              }

              // Skip core API group resources
              if (!apiGroup || apiGroup === 'v1') {
                // eslint-disable-next-line no-console
                console.log(`Skipping provider lookup for core resource ${ref.kind}`);
                return [];
              }

              const kindPlural = pluralize(ref.kind.toLowerCase());
              // eslint-disable-next-line no-console
              console.log(`Looking up CRD for ${kindPlural}.${apiGroup}`);

              // Try to fetch the CRD
              let crd;
              try {
                const crdResponse = await crossplaneApi.getResources({
                  clusterName: clusterOfComposite,
                  group: 'apiextensions.k8s.io',
                  version: 'v1',
                  plural: 'customresourcedefinitions',
                  name: `${kindPlural}.${apiGroup}`,
                });
                crd = crdResponse.resources[0].resource;
                // eslint-disable-next-line no-console
                console.log('Found CRD:', crd);
              } catch (error) {
                // eslint-disable-next-line no-console
                console.log(`No CRD found for ${kindPlural}.${apiGroup}, skipping provider lookup`);
                return [];
              }

              const ownerReferences = crd.metadata?.ownerReferences || [];
              const providerRefs = ownerReferences.filter((ownerRef: { kind: string; }) => ownerRef.kind === 'ProviderRevision');
              // eslint-disable-next-line no-console
              console.log('Provider Refs:', providerRefs);

              const providerPromises = providerRefs.map(async (providerRef: any) => {
                try {
                  const providerKey = `${providerRef.apiVersion}-${providerRef.name}`;
                  if (providerResourcesSet.has(providerKey)) {
                    // eslint-disable-next-line no-console
                    console.log(`Provider ${providerRef.name} already processed, skipping`);
                    return null;
                  }
                  providerResourcesSet.add(providerKey);

                  // Get provider revision
                  // eslint-disable-next-line no-console
                  console.log(`Fetching provider revision ${providerRef.name}`);
                  // Get provider revision to verify it exists
                  await crossplaneApi.getResources({
                    clusterName: clusterOfComposite,
                    group: 'pkg.crossplane.io',
                    version: 'v1',
                    plural: 'providerrevisions',
                    name: providerRef.name,
                  });

                  // Get provider
                  const providerName = providerRef.name.split('-').slice(0, -1).join('-');
                  // eslint-disable-next-line no-console
                  console.log(`Fetching provider ${providerName}`);
                  const providerResponse = await crossplaneApi.getResources({
                    clusterName: clusterOfComposite,
                    group: 'pkg.crossplane.io',
                    version: 'v1',
                    plural: 'providers',
                    name: providerName,
                  });
                  const providerResource = providerResponse.resources[0].resource;
                  return providerResource;
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error(`Error processing provider ${providerRef.name}:`, error);
                  return null;
                }
              });

              const providers = await Promise.all(providerPromises);
              return providers.filter(Boolean);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(`Error processing managed resource ${ref.kind}:`, error);
              return [];
            }
          }));

          const filteredProviders = providerResources.flat().filter((r): r is ExtendedKubernetesObject => r !== null);
          // eslint-disable-next-line no-console
          console.log('Filtered Providers:', filteredProviders);
          newSupportingResources.push(...filteredProviders);
        }
        // eslint-disable-next-line no-console
        console.log('Final Supporting Resources:', newSupportingResources);
        setSupportingResources(newSupportingResources);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching supporting resources:", error);
      } finally {
        setLoadingSupportingResources(false);
      }
    };
    fetchSupportingResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossplaneApi, entity, canListAdditional]);

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
      if (!resource.metadata?.name) {
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
      // eslint-disable-next-line no-console
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleOpenDrawer = (resource: ExtendedKubernetesObject, tab: 'manifest' | 'events') => {
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
  const handleRowExpand = (resource: ResourceTableRow) => {
    const resourceId = resource.resource.metadata?.uid || `${resource.kind}-${resource.name}`;
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(resourceId)) {
      newExpandedRows.delete(resourceId);
    } else {
      newExpandedRows.add(resourceId);
    }
    setExpandedRows(newExpandedRows);
    // No need to fetch - all nested resources are already loaded from getV2ResourceGraph
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
      case 'XR': return styles.badgeAccent;
      case 'MR': return styles.badgePositive;
      case 'K8s': return styles.badgeAnnouncement;
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
        if (resource.type === 'K8s') {
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
      if (resource.type === 'K8s') {
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

  const renderResourceRows = (resources: ResourceTableRow[], _?: string): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    resources.forEach((row, index) => {
      const resourceId = row.resource.metadata?.uid || `${row.kind}-${row.name}-${index}`;
      // Check if this resource has nested resources in the nestedResources map
      const hasNestedResourcesToShow = nestedResources[resourceId] && nestedResources[resourceId].length > 0;
      const isExpanded = expandedRows.has(resourceId);

      rows.push(
        <tr key={resourceId} className={`${styles.clickableRow} ${row.level > 0 ? styles.nestedRow : ''}`}>
          <td className={styles.tableCell}>
            <span className={`${styles.typeBadge} ${getTypeBadgeClass(row.type)}`}>{row.type}</span>
          </td>
          <td className={styles.tableCell}>
            <div className={styles.resourceName}>
              {Array.from({ length: row.level }).map((_item, levelIndex) => (
                <div key={levelIndex} className={styles.indent} />
              ))}
              <div className={styles.resourceNameContent}>
                {hasNestedResourcesToShow && (
                  <ButtonIcon
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    icon={isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                    size="small"
                    onPress={() => handleRowExpand(row)}
                  />
                )}
                {row.name}
              </div>
            </div>
          </td>
          <td className={styles.tableCell}>
            <TooltipTrigger>
              <span>{row.namespace || '-'}</span>
              <Tooltip>{row.namespace ? `Namespace: ${row.namespace}` : 'Cluster-scoped resource'}</Tooltip>
            </TooltipTrigger>
          </td>
          <td className={styles.tableCell}>{row.group}</td>
          <td className={styles.tableCell}>{row.kind}</td>
          <td className={styles.tableCell}>
            <Flex style={{ flexWrap: 'wrap' }}>
              {row.type === 'K8s' && row.status.conditions.length > 0 && (
                row.status.conditions.map((condition: any, idx: number) => (
                  <TooltipTrigger key={idx}>
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
              )}
              {row.type === 'K8s' && row.status.conditions.length === 0 && (
                <span className={`${styles.statusBadge} ${styles.badgePositive}`}>No Conditions</span>
              )}
              {row.type !== 'K8s' && (
                // For XR and MR resources, show Synced and Ready
                <>
                  {renderStatusBadge(row.status.conditions, 'Synced')}
                  {renderStatusBadge(row.status.conditions, 'Ready')}
                </>
              )}
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
                  onPress={() => navigate(`/catalog/${entity.metadata.namespace}/component/${entity.metadata.name}/crossplane-graph`)}
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
    if (!canListAdditional) {
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
    return filteredSupportingResources.map((resource) => (
      <tr key={resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`}>
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
        <td className={styles.tableCell}>{getArtifact(resource)}</td>
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

  if (!canListComposite && !canListManaged) {
    return (
      <Card>
        <CardBody>
          <Box mb="4">
            <Text variant="title-small" weight="bold">Resources ({getTotalResourceCount()})</Text>
          </Box>
          <Box m="2">
            <Text>You don't have permissions to view Crossplane resources</Text>
          </Box>
        </CardBody>
      </Card>
    );
  }

  const annotations = entity.metadata.annotations || {};
  const clusterOfComposite = annotations['backstage.io/managed-by-location']?.split(": ")[1];
  const scope = getAnnotation(annotations, annotationPrefix, 'crossplane-scope');

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
                    <th className={`${styles.tableCell} ${styles.headerCell}`}>
                      <ColumnFilterHeader label="Artifact" options={getSupportingResourceValues().artifact} selected={supportingFilters.artifact} onChange={(v) => handleSupportingFilterChange('artifact', v)} />
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

      {/* Summary Table */}
      <Card style={{ marginTop: 'var(--bui-space-6)' }}>
        <CardBody>
          <Box mb="4">
            <Text variant="title-small" weight="bold">Summary</Text>
          </Box>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Property</th>
                  <th className={`${styles.tableCell} ${styles.headerCell}`}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tableCell}>Cluster</td>
                  <td className={styles.tableCell}>{clusterOfComposite || 'Unknown'}</td>
                </tr>
                <tr>
                  <td className={styles.tableCell}>XR Scope</td>
                  <td className={styles.tableCell}>{scope || 'Unknown'}</td>
                </tr>
              </tbody>
            </table>
          </div>
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

export default CrossplaneV2ResourceTable;
