import { useState, useEffect } from 'react';
import {
    useTheme,
    Drawer,
    IconButton,
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Tabs,
    Tab,
    Tooltip,
    TableContainer,
    Chip,
    makeStyles
} from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEntity } from '@backstage/plugin-catalog-react';
import * as yaml from 'js-yaml';
import CloseIcon from '@material-ui/icons/Close';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import { saveAs } from 'file-saver';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactFlow, { ReactFlowProvider, MiniMap, Controls, Background, Node, Edge, Handle, Position } from 'react-flow-renderer';
import dagre from 'dagre';
import { usePermission } from '@backstage/plugin-permission-react';
import { showResourceGraph } from '@terasky/backstage-plugin-kro-common';

const useStyles = makeStyles((theme) => ({
    drawer: {
        width: '50vw',
        flexShrink: 0,
    },
    drawerPaper: {
        width: '50vw',
        backgroundColor: theme.palette.background.default,
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing(2),
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    tabContent: {
        padding: theme.spacing(2),
        height: 'calc(100vh - 180px)',
        overflow: 'auto',
    },
    yamlActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: theme.spacing(1),
        gap: theme.spacing(1),
    },
    eventTable: {
        '& th': {
            fontWeight: 'bold',
        },
    },
    eventRow: {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
}));

const removeManagedFields = (resource: KubernetesObject) => {
  const resourceCopy = JSON.parse(JSON.stringify(resource));
    
    const orderedResource: any = {
        apiVersion: resourceCopy.apiVersion,
        kind: resourceCopy.kind,
        metadata: {}
    };

    if (resourceCopy.metadata) {
        if (resourceCopy.metadata.managedFields) {
            delete resourceCopy.metadata.managedFields;
        }
        if (resourceCopy.metadata.annotations && resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) {
            delete resourceCopy.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"];
        }

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

        Object.entries(resourceCopy.metadata).forEach(([key, value]) => {
            if (!['name', 'namespace', 'annotations', 'labels', 'managedFields'].includes(key)) {
                orderedResource.metadata[key] = value;
            }
        });
    }

    if (resourceCopy.spec) {
        orderedResource.spec = resourceCopy.spec;
    }
    if (resourceCopy.status) {
        orderedResource.status = resourceCopy.status;
    }

    return orderedResource;
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 80;

const CustomNode = ({ data }: { data: any }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.type === 'dark';

    const truncateText = (text: string, maxLength: number = 20) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    const getBadgeStyles = (categoryBadge: string) => {
        if (isDarkMode) {
            switch (categoryBadge) {
        case 'RGD':
                    return {
                        backgroundColor: '#1a237e',
                        color: '#90caf9'
                    };
        case 'CRD':
          return {
            backgroundColor: '#311b92',
            color: '#b39ddb'
          };
        case 'Instance':
                    return {
                        backgroundColor: '#4a148c',
                        color: '#e1bee7'
                    };
        case 'Resource':
                    return {
                        backgroundColor: '#1b5e20',
                        color: '#a5d6a7'
                    };
                default:
                    return {
                        backgroundColor: theme.palette.primary.dark,
                        color: theme.palette.primary.contrastText
                    };
            }
        } else {
            switch (categoryBadge) {
        case 'RGD':
                    return {
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2'
                    };
        case 'CRD':
          return {
            backgroundColor: '#ede7f6',
            color: '#512da8'
          };
        case 'Instance':
                    return {
                        backgroundColor: '#f3e5f5',
                        color: '#7b1fa2'
                    };
        case 'Resource':
                    return {
                        backgroundColor: '#e8f5e9',
                        color: '#388e3c'
                    };
                default:
                    return {
                        backgroundColor: theme.palette.primary.main,
                        color: 'white'
                    };
            }
        }
    };

    const badgeStyles = getBadgeStyles(data.categoryBadge);

    const getStatusColors = (isPositive: boolean) => {
        if (isDarkMode) {
            return {
                backgroundColor: isPositive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                color: isPositive ? '#81c784' : '#e57373'
            };
        }
        return {
            backgroundColor: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            color: isPositive ? '#2e7d32' : '#c62828'
        };
    };

    return (
        <div
            style={{
                padding: '8px',
                border: `1px solid ${isDarkMode ? theme.palette.grey[700] : theme.palette.grey[400]}`,
                backgroundColor: isDarkMode ? theme.palette.background.paper : '#ffffff',
                color: theme.palette.text.primary,
                fontSize: '12px',
                width: nodeWidth,
                minHeight: nodeHeight + 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                position: 'relative',
                borderRadius: '4px',
                boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                boxSizing: 'border-box',
                cursor: 'pointer'
            }}
            onMouseEnter={() => data.onHover(data.nodeId)}
            onMouseLeave={() => data.onHover(null)}
        >
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: 'transparent', border: 'none' }}
            />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '4px',
                alignItems: 'flex-start',
                gap: '4px'
            }}>
                <span style={{
                    fontWeight: 'bold',
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: '1 1 auto',
                    minWidth: 0,
                    color: theme.palette.text.primary
                }}>
                    {truncateText(data.kind)}
                </span>
                {data.categoryBadge && (
                    <span style={{
                        backgroundColor: badgeStyles.backgroundColor,
                        color: badgeStyles.color,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        {data.categoryBadge}
                    </span>
                )}
            </div>

            <div style={{
                fontStyle: 'italic',
                fontSize: '11px',
                color: theme.palette.text.secondary,
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
            }}>
                {truncateText(data.apiVersion, 25)}
            </div>

            <div style={{
                fontSize: '12px',
                marginBottom: '6px',
                wordBreak: 'break-word',
                width: '100%',
                color: theme.palette.text.primary
            }}>
                {data.name}
            </div>

            <div style={{
                width: '100%',
                borderTop: `1px solid ${isDarkMode ? theme.palette.grey[700] : theme.palette.grey[300]}`,
                marginTop: 'auto',
                paddingTop: '6px'
            }}>
                        <div style={{
          display: 'flex', 
          gap: '4px', 
          flexWrap: 'wrap',
          alignItems: 'center',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {data.categoryBadge === 'Resource' ? (
            // For resources, show all conditions
            data.conditions?.length > 0 ? (
              data.conditions.map((condition: any, idx: number) => (
                <div key={idx} style={{
                  ...getStatusColors(condition.status === 'True'),
                            padding: '2px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                  fontWeight: 'bold',
                  marginRight: idx < data.conditions.length - 1 ? '4px' : '0'
                        }}>
                  {condition.type}
                        </div>
              ))
            ) : (
              <div style={{
                ...getStatusColors(true),
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                No Conditions
              </div>
            )
          ) : data.categoryBadge === 'Instance' ? (
            // For instances, show only InstanceSynced
                            <div style={{
                                ...getStatusColors(data.isSynced),
                                padding: '2px 8px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 'bold'
                            }}>
              InstanceSynced
                            </div>
          ) : data.categoryBadge === 'CRD' ? (
            // For CRDs, show all conditions
            data.conditions?.length > 0 ? (
              data.conditions.map((condition: any, idx: number) => (
                <div key={idx} style={{
                  ...getStatusColors(condition.status === 'True'),
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginRight: idx < data.conditions.length - 1 ? '4px' : '0'
                }}>
                  {condition.type}
                </div>
              ))
            ) : (
                            <div style={{
                ...getStatusColors(true),
                                padding: '2px 8px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 'bold'
                            }}>
                No Conditions
                            </div>
            )
          ) : data.categoryBadge === 'RGD' ? (
            // For RGDs, show all conditions
            data.conditions?.length > 0 ? (
              data.conditions.map((condition: any, idx: number) => (
                <div key={idx} style={{
                  ...getStatusColors(condition.status === 'True'),
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginRight: idx < data.conditions.length - 1 ? '4px' : '0'
                }}>
                  {condition.type}
                </div>
              ))
            ) : (
              <div style={{
                ...getStatusColors(true),
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                No Conditions
              </div>
            )
          ) : (
            // For other resources, show all conditions
            data.conditions?.length > 0 ? (
              data.conditions.map((condition: any, idx: number) => (
                <div key={idx} style={{
                  ...getStatusColors(condition.status === 'True'),
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginRight: idx < data.conditions.length - 1 ? '4px' : '0'
                }}>
                  {condition.type}
                </div>
              ))
            ) : (
              <div style={{
                ...getStatusColors(true),
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                No Conditions
              </div>
            )
                    )}
                </div>
            </div>

            {data.hasChildren && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            right: -15,
                            top: '50%',
                            width: 15,
                            height: 2,
                            backgroundColor: isDarkMode ? theme.palette.grey[500] : '#999',
                            transform: 'translateY(-50%)',
                            zIndex: 1
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            right: -28,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            backgroundColor: isDarkMode ? theme.palette.grey[300] : '#000000',
                            border: `1px solid ${isDarkMode ? theme.palette.grey[400] : '#000000'}`,
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: isDarkMode ? theme.palette.grey[900] : '#ffffff',
                            userSelect: 'none',
                            zIndex: 2,
                            boxShadow: isDarkMode ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onToggle(data.nodeId);
                        }}
                    >
                        {data.isCollapsed ? '+' : '-'}
                    </div>
                </>
            )}
            <Handle
                type="source"
                position={Position.Right}
                style={{ background: 'transparent', border: 'none' }}
            />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const getLayoutedElements = (nodes: any[], edges: any[], rgdNodeId?: string) => {
  dagreGraph.setGraph({
    rankdir: 'LR',
    align: 'UL',
    ranksep: 100,
    nodesep: 50,
    marginx: 20,
    marginy: 20
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  let minX = Infinity;
  let minY = Infinity;

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const x = nodeWithPosition.x - nodeWidth / 2;
    const y = nodeWithPosition.y - nodeHeight / 2;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  });

  let rootNodeId = rgdNodeId;
  if (!rootNodeId) {
    const nodesWithIncomingEdges = new Set(edges.map(e => e.target));
    const rootNodes = nodes.filter(n => !nodesWithIncomingEdges.has(n.id));
    const rgdNode = rootNodes.find(n => n.data.categoryBadge === 'RGD');
    rootNodeId = rgdNode?.id || rootNodes[0]?.id;
  }

  const offsetX = 50;
  const offsetY = 50;

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = 'left';
    node.sourcePosition = 'right';

    const x = nodeWithPosition.x - nodeWidth / 2 - minX + offsetX;
    const y = nodeWithPosition.y - nodeHeight / 2 - minY + offsetY;

    node.position = { x, y };
  });

  if (rootNodeId) {
    const rootNode = nodes.find(n => n.id === rootNodeId);
    if (rootNode) {
      const rootX = rootNode.position.x;
      let minYAtRootLevel = rootNode.position.y;

      nodes.forEach(node => {
        if (Math.abs(node.position.x - rootX) < 10) {
          minYAtRootLevel = Math.min(minYAtRootLevel, node.position.y);
        }
      });

      rootNode.position.y = minYAtRootLevel;
    }
  }

  return { nodes, edges };
};

const KroResourceGraph = () => {
    const { entity } = useEntity();
    const theme = useTheme();
    const classes = useStyles();
    const kubernetesApi = useApi(kubernetesApiRef);
    const config = useApi(configApiRef);
  const enablePermissions = config.getOptionalBoolean('kro.enablePermissions') ?? false;
    const [resources, setResources] = useState<Array<KubernetesObject>>([]);
    const [selectedResource, setSelectedResource] = useState<KubernetesObject | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const [events, setEvents] = useState<Array<any>>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

    const canShowResourceGraphTemp = usePermission({ permission: showResourceGraph }).allowed;
    const canShowResourceGraph = enablePermissions ? canShowResourceGraphTemp : true;

    const toggleNodeCollapse = (nodeId: string) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const generateGraphElements = (resourceList: KubernetesObject[]) => {
        const nodeHasChildren = new Map<string, boolean>();
        const nodeReadyStatus = new Map<string, boolean>();

        resourceList.forEach(resource => {
            const status = (resource as any).status;
            const conditions = status?.conditions || [];
            const nodeId = resource.metadata?.uid || `${resource.kind}-${Math.random()}`;
      const isReady = conditions.some((condition: any) => 
        (condition.type === 'InstanceSynced' || condition.type === 'Ready') && condition.status === 'True'
      );
            nodeReadyStatus.set(nodeId, isReady);
        });

    // Find RGD, CRD, and Instance nodes
    const rgdNode = resourceList.find(r => r.kind === 'ResourceGraphDefinition');
    const crdNode = resourceList.find(r => r.kind === 'CustomResourceDefinition');
    const instanceNode = resourceList.find(r => 
      r.metadata?.labels?.['kro.run/resource-graph-definition-id'] === entity.metadata.annotations?.['terasky.backstage.io/kro-rgd-id'] &&
      r.metadata?.uid === entity.metadata.annotations?.['terasky.backstage.io/kro-instance-uid']
    );

    const edges: any[] = [];

    if (rgdNode && crdNode && instanceNode) {
      // Add edge from RGD to CRD
      const rgdId = rgdNode.metadata?.uid || `${rgdNode.kind}-${Math.random()}`;
      const crdId = crdNode.metadata?.uid || `${crdNode.kind}-${Math.random()}`;
      const instanceId = instanceNode.metadata?.uid || `${instanceNode.kind}-${Math.random()}`;
      nodeHasChildren.set(rgdId, true);
      nodeHasChildren.set(crdId, true);

      // Add edge from RGD to CRD
      edges.push({
        id: `${rgdId}-${crdId}`,
        source: rgdId,
        target: crdId,
        type: 'smoothstep',
        style: {
          stroke: '#999',
          strokeWidth: 1,
          zIndex: 1
        },
        animated: false,
        zIndex: 1
      });

      // Add edge from CRD to Instance
      edges.push({
        id: `${crdId}-${instanceId}`,
        source: crdId,
        target: instanceId,
        type: 'smoothstep',
        style: {
          stroke: '#999',
          strokeWidth: 1,
          zIndex: 1
        },
        animated: false,
        zIndex: 1
      });

      // Add edges from Instance to managed resources
      resourceList.forEach(resource => {
        if (resource !== rgdNode && resource !== crdNode && resource !== instanceNode) {
          const resourceId = resource.metadata?.uid || `${resource.kind}-${Math.random()}`;
          nodeHasChildren.set(instanceId, true);
          const targetReady = nodeReadyStatus.get(resourceId) ?? true;
                const isErrorEdge = !targetReady;

          edges.push({
            id: `${instanceId}-${resourceId}`,
            source: instanceId,
            target: resourceId,
                    type: 'smoothstep',
                    style: {
                        stroke: isErrorEdge ? '#f44336' : '#999',
                        strokeWidth: 1,
                        zIndex: isErrorEdge ? 10 : 1
                    },
                    animated: false,
                    zIndex: isErrorEdge ? 10 : 1
          });
        }
      });

      // Add edges from Instance to managed resources
      resourceList.forEach(resource => {
        if (resource !== rgdNode && resource !== instanceNode) {
          const resourceId = resource.metadata?.uid || `${resource.kind}-${Math.random()}`;
          nodeHasChildren.set(instanceId, true);
          const targetReady = nodeReadyStatus.get(resourceId) ?? true;
          const isErrorEdge = !targetReady;

          edges.push({
            id: `${instanceId}-${resourceId}`,
            source: instanceId,
            target: resourceId,
                type: 'smoothstep',
                style: {
              stroke: isErrorEdge ? '#f44336' : '#999',
                    strokeWidth: 1,
              zIndex: isErrorEdge ? 10 : 1
                },
                animated: false,
            zIndex: isErrorEdge ? 10 : 1
          });
        }
      });
    }

    const allEdgesWithDuplicates = edges;

        const edgeMap = new Map<string, any>();
        allEdgesWithDuplicates.forEach(edge => {
            edgeMap.set(edge.id, edge);
        });
        const allEdges = Array.from(edgeMap.values());

    let rgdNodeId: string | undefined;

    const determineCategoryBadge = (resource: KubernetesObject): string => {
      if (resource.kind === 'ResourceGraphDefinition') {
        return 'RGD';
      }
      if (resource.kind === 'CustomResourceDefinition') {
        return 'CRD';
      }
      if (resource.metadata?.labels?.['kro.run/resource-graph-definition-id'] === entity.metadata.annotations?.['terasky.backstage.io/kro-rgd-id']) {
        return resource.metadata?.uid === entity.metadata.annotations?.['terasky.backstage.io/kro-instance-uid'] ? 'Instance' : 'Resource';
      }
      return 'Resource';
    };

        const nodes = resourceList.map(resource => {
            const status = (resource as any).status;
            const conditions = status?.conditions || [];
      const isSynced = conditions.some((condition: any) => 
        (condition.type === 'InstanceSynced' || condition.type === 'Ready') && condition.status === 'True'
      );

            const resourceName = resource.metadata?.name || 'Unknown';
            const resourceKind = resource.kind || 'Unknown';
            const apiVersion = (resource as any).apiVersion || '';
            const nodeId = resource.metadata?.uid || `${resource.kind}-${Math.random()}`;

      const categoryBadge = determineCategoryBadge(resource);

      if (categoryBadge === 'RGD' && !rgdNodeId) {
        rgdNodeId = nodeId;
            }

            return {
                id: nodeId,
                type: 'custom',
                data: {
                    kind: resourceKind,
                    apiVersion: apiVersion,
                    name: resourceName,
                    isSynced: isSynced,
          conditions: conditions,
                    categoryBadge: categoryBadge,
                    hasChildren: nodeHasChildren.has(nodeId),
                    isCollapsed: collapsedNodes.has(nodeId),
                    nodeId: nodeId,
                    onToggle: toggleNodeCollapse,
                    onHover: setHoveredNode
                },
        position: { x: 0, y: 0 },
                style: {
                    zIndex: nodeHasChildren.has(nodeId) ? 100 : 1
                },
                zIndex: nodeHasChildren.has(nodeId) ? 100 : 1
            };
        });

        const getAllDescendants = (nodeId: string, descendants: Set<string> = new Set()) => {
            allEdges
                .filter(edge => edge.source === nodeId)
                .forEach(edge => {
                    descendants.add(edge.target);
                    getAllDescendants(edge.target, descendants);
                });
            return descendants;
        };

        const hiddenNodes = new Set<string>();
        collapsedNodes.forEach(collapsedNodeId => {
            const descendants = getAllDescendants(collapsedNodeId);
            descendants.forEach(id => hiddenNodes.add(id));
        });

        const visibleNodes = nodes.filter(node => !hiddenNodes.has(node.id));
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        collapsedNodes.forEach(id => visibleNodeIds.add(id));

        const visibleEdges = allEdges.filter(edge => {
            if (collapsedNodes.has(edge.source)) {
                return false;
            }
            if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
                return false;
            }
            return true;
        });

        const styledEdges = visibleEdges.map(edge => {
            if (!hoveredNode) return edge;

            const connectedNodes = new Set<string>();

            const findAncestors = (nodeId: string) => {
                allEdges.forEach(e => {
                    if (e.target === nodeId && !connectedNodes.has(e.source)) {
                        connectedNodes.add(e.source);
                        findAncestors(e.source);
                    }
                });
            };

            const findDescendants = (nodeId: string) => {
                allEdges.forEach(e => {
                    if (e.source === nodeId && !connectedNodes.has(e.target)) {
                        connectedNodes.add(e.target);
                        findDescendants(e.target);
                    }
                });
            };

            connectedNodes.add(hoveredNode);
            findAncestors(hoveredNode);
            findDescendants(hoveredNode);

            const isInPath = connectedNodes.has(edge.source) && connectedNodes.has(edge.target);

            return {
                ...edge,
                style: {
                    ...edge.style,
                    strokeDasharray: isInPath ? '5,5' : 'none',
                    strokeWidth: isInPath ? 2 : 1,
                    opacity: isInPath ? 1 : 0.3,
                    zIndex: edge.style?.zIndex || 1
                },
                animated: isInPath,
                zIndex: edge.zIndex || 1
            };
        });

        const sortedEdges = styledEdges.sort((a, b) => {
            const aIsRed = a.style?.stroke === '#f44336';
            const bIsRed = b.style?.stroke === '#f44336';

      if (aIsRed && !bIsRed) return 1;
      if (!aIsRed && bIsRed) return -1;
      return 0;
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(visibleNodes, sortedEdges, rgdNodeId);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    useEffect(() => {
        if (resources.length > 0) {
            generateGraphElements(resources);
        }
    }, [collapsedNodes, resources, hoveredNode]);

    useEffect(() => {
        if (!canShowResourceGraph) {
            setLoading(false);
            return;
        }

        const fetchResources = async () => {
            const annotations = entity.metadata.annotations || {};
      const rgdName = annotations['terasky.backstage.io/kro-rgd-name'];
      const rgdId = annotations['terasky.backstage.io/kro-rgd-id'];
      const instanceId = annotations['terasky.backstage.io/kro-instance-uid'];
      const clusterName = annotations['backstage.io/managed-by-location'].split(": ")[1];
            const namespace = entity.metadata.namespace || annotations['namespace'] || 'default';

      if (!rgdName || !rgdId || !instanceId || !clusterName) {
                setLoading(false);
                return;
            }

      try {
        // Fetch the RGD
        const rgdResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/kro.run/v1alpha1/resourcegraphdefinitions/${rgdName}`,
          init: { method: 'GET' },
        });
        const rgd = await rgdResponse.json();

        // First find the CRD name
        const crdListResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions`,
          init: { method: 'GET' },
        });
        const crdList = await crdListResponse.json();
        const crdItem = crdList.items.find((item: any) => 
          item.metadata?.labels?.['kro.run/resource-graph-definition-id'] === rgdId
        );

        if (!crdItem) {
          throw new Error('CRD not found for RGD');
        }

        // Then fetch the specific CRD to get complete details
        const crdResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdItem.metadata.name}`,
                        init: { method: 'GET' },
                    });
        const crd = await crdResponse.json();

        // Fetch the instance itself
        const instanceResponse = await kubernetesApi.proxy({
          clusterName,
          path: `/apis/kro.run/v1alpha1/namespaces/${namespace}/applications/${entity.metadata.name}`,
          init: { method: 'GET' },
        });
        const instance = await instanceResponse.json();

        // Parse sub-resources from annotation (comma-separated string)
        const subResources = (annotations['terasky.backstage.io/kro-sub-resources'] || '').split(',').filter(Boolean).map(r => {
          const [apiVersion, kind] = r.split(':');
          return { apiVersion, kind };
        });
                
                // Fetch all managed resources
        const managedResources = await Promise.all(subResources.map(async (resource: any) => {
          const [group, version] = resource.apiVersion.split('/');
          // Handle pluralization correctly
          const pluralMap: Record<string, string> = {
            'ingress': 'ingresses',
            'proxy': 'proxies',
            'index': 'indices',
            'matrix': 'matrices',
            'vertex': 'vertices',
            // Add more special cases as needed
          };
          const pluralKind = pluralMap[resource.kind.toLowerCase()] || `${resource.kind.toLowerCase()}s`;
          const path = group === 'v1' || group === 'core'
            ? `/api/v1/namespaces/${namespace}/${pluralKind}`
            : `/apis/${group}/${version}/namespaces/${namespace}/${pluralKind}`;

          try {
            // First get the list of resources
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

            // Then fetch each resource individually to get complete details
            const resourcePromises = (resourceList.items || []).map(async (item: any) => {
                    const resourceResponse = await kubernetesApi.proxy({
                clusterName,
                path: `${path}/${item.metadata.name}`,
                        init: { method: 'GET' },
                    });
              const fullResource = await resourceResponse.json();
              // Ensure apiVersion and kind are set correctly
              return {
                ...fullResource,
                apiVersion: resourceList.apiVersion,
                kind: resourceList.kind.replace('List', '')
              };
            });
            
            return Promise.all(resourcePromises);
          } catch (error) {
            console.error(`Failed to fetch ${resource.kind} resources:`, error);
            return [];
          }
        }));

        setResources([rgd, crd, instance, ...managedResources.flat()]);
        generateGraphElements([rgd, crd, instance, ...managedResources.flat()]);
            } catch (error) {
                console.error('Failed to fetch resources:', error);
                setResources([]);
                setNodes([]);
                setEdges([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, [kubernetesApi, entity, canShowResourceGraph]);

    const handleGetEvents = async (resource: KubernetesObject) => {
        const namespace = resource.metadata?.namespace || 'default';
        const name = resource.metadata?.name;
    const clusterName = entity.metadata.annotations?.['backstage.io/managed-by-location'].split(": ")[1];

    if (!namespace || !name || !clusterName) {
      console.warn('Missing required data for fetching events:', { namespace, name, clusterName });
            return;
        }

        setLoadingEvents(true);
        const url = `/api/v1/namespaces/${namespace}/events?fieldSelector=involvedObject.name=${name}`;

        try {
            const response = await kubernetesApi.proxy({
        clusterName,
                path: url,
                init: { method: 'GET' },
            });
            const eventsResponse = await response.json();
            setEvents(eventsResponse.items || []);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            setEvents([]);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleElementClick = async (_event: any, element: any) => {
        const resource = resources.find(res => res.metadata?.uid === element.id);
        if (resource) {
            setSelectedResource(resource);
            setDrawerOpen(true);
      setSelectedTab(0);
      await handleGetEvents(resource);
        }
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedResource(null);
        setEvents([]);
        setSelectedTab(0);
    };

    const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
        setSelectedTab(newValue);
    };

    const handleCopyYaml = () => {
        if (selectedResource) {
            const yamlContent = yaml.dump(removeManagedFields(selectedResource));
            navigator.clipboard.writeText(yamlContent);
        }
    };

    const handleDownloadYaml = () => {
        if (selectedResource) {
            const yamlContent = yaml.dump(removeManagedFields(selectedResource));
            const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
            const fileName = `${selectedResource.kind}-${selectedResource.metadata?.name}.yaml`;
            saveAs(blob, fileName);
        }
    };

    const getEventTypeChip = (type: string) => {
        return (
            <Chip
                label={type}
                size="small"
                color={type === 'Warning' ? 'secondary' : 'default'}
                variant={type === 'Warning' ? 'default' : 'outlined'}
            />
        );
    };

    const getRelativeTime = (timestamp: string) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return `${seconds}s ago`;
    };

    if (loading) {
        return <CircularProgress />;
    }

    if (!canShowResourceGraph) {
        return <Typography>You don't have permissions to view the resource graph</Typography>;
    }

    return (
        <ReactFlowProvider>
      <Typography variant="h6" gutterBottom>KRO Resource Graph</Typography>
            <div style={{ height: '80vh' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodeClick={handleElementClick}
                    nodeTypes={nodeTypes}
                    style={{ width: '100%', height: '100%', background: theme.palette.type === 'dark' ? theme.palette.background.default : '#fff' }}
            proOptions={{ hideAttribution: true, account: '' }}
            preventScrolling={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            nodesDraggable={false}
            nodesConnectable={false}
                >
                    <MiniMap
                        nodeColor={theme.palette.type === 'dark' ? theme.palette.grey[300] : theme.palette.grey[700]}
                        nodeStrokeColor={theme.palette.type === 'dark' ? theme.palette.grey[400] : theme.palette.grey[800]}
                        nodeBorderRadius={2}
                        style={{ 
                            backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : theme.palette.background.default,
                            border: `1px solid ${theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]}`
                        }}
                    />
                    <Controls 
                        style={{ 
                            backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : theme.palette.background.default,
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]}`,
                            borderRadius: '4px',
                            boxShadow: theme.palette.type === 'dark' ? '0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)'
                        }} 
                    />
                    <Background 
                        color={theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200]}
                        gap={16}
                    />
                </ReactFlow>
            </div>

            <Drawer
                className={classes.drawer}
                variant="temporary"
                anchor="right"
                open={drawerOpen}
                onClose={handleCloseDrawer}
        SlideProps={{
          mountOnEnter: true,
          unmountOnExit: true,
        }}
        ModalProps={{
          container: document.body,
          keepMounted: false,
          disablePortal: false,
          disableEnforceFocus: true,
          disableAutoFocus: false,
          disableRestoreFocus: false,
          disableScrollLock: false,
          BackdropProps: {
            invisible: false,
          },
        }}
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
        </ReactFlowProvider>
    );
};

export default KroResourceGraph;