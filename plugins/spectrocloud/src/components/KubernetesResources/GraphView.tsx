import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'react-flow-renderer';
import { 
  Box, 
  Drawer, 
  Typography, 
  Chip, 
  Button,
  IconButton,
  Divider,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { Link } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import {
  getKubernetesKind,
  getResourceCategory,
  getEntityNamespace,
  getEntityOwner,
  getEntityStatus,
  isNamespaceEntity,
} from './utils';
import { useKubernetesResourcesStyles } from './styles';

interface GraphViewProps {
  entities: Entity[];
  annotationPrefix: string;
}

interface NodeData {
  name: string;
  kubernetesKind: string;
  category: string;
  status?: string;
  namespace: string;
  entity: Entity;
}

export const GraphView: React.FC<GraphViewProps> = ({
  entities,
  annotationPrefix,
}) => {
  const classes = useKubernetesResourcesStyles();
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  // Generate nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];

    // Group entities by namespace
    const namespaceMap = new Map<string, Entity[]>();
    const namespaceEntities: Entity[] = [];

    entities.forEach(entity => {
      if (isNamespaceEntity(entity, annotationPrefix)) {
        namespaceEntities.push(entity);
        namespaceMap.set(entity.metadata.name, []);
      }
    });

    // Assign resources to namespaces
    entities.forEach(entity => {
      if (!isNamespaceEntity(entity, annotationPrefix)) {
        const ns = getEntityNamespace(entity, annotationPrefix);
        if (namespaceMap.has(ns)) {
          namespaceMap.get(ns)!.push(entity);
        } else {
          // Create implicit namespace if not exists
          if (!namespaceMap.has(ns)) {
            namespaceMap.set(ns, []);
          }
          namespaceMap.get(ns)!.push(entity);
        }
      }
    });

    let yOffset = 0;
    const namespaceNodeHeight = 100;
    const resourceNodeHeight = 80;
    const horizontalSpacing = 250;

    // Create nodes for each namespace and its resources
    Array.from(namespaceMap.entries()).forEach(([nsName, resources]) => {
      const nsEntity = namespaceEntities.find(e => e.metadata.name === nsName);
      
      // Namespace node
      const nsNodeId = nsEntity?.metadata.uid || `ns-${nsName}`;
      if (nsEntity) {
        nodes.push({
          id: nsNodeId,
          type: 'default',
          data: {
            label: `🏷️ ${nsName}`,
            name: nsName,
            kubernetesKind: 'Namespace',
            category: 'Namespace',
            namespace: nsName,
            entity: nsEntity,
          } as NodeData,
          position: { x: 0, y: yOffset },
          style: {
            backgroundColor: '#2196f3',
            color: 'white',
            border: '2px solid #1976d2',
            borderRadius: 8,
            padding: 16,
            minWidth: 180,
          },
        });
      }

      yOffset += namespaceNodeHeight + 20;

      // Resource nodes
      resources.forEach((resource, resourceIndex) => {
        const category = getResourceCategory(resource, annotationPrefix);
        const k8sKind = getKubernetesKind(resource, annotationPrefix);
        const status = getEntityStatus(resource);

        // Determine node color based on category
        let bgColor = '#9e9e9e';
        let borderColor = '#757575';
        let icon = '📋';

        switch (category) {
          case 'Workload':
            bgColor = '#4caf50';
            borderColor = '#388e3c';
            icon = '📦';
            break;
          case 'Crossplane Claim':
            bgColor = '#9c27b0';
            borderColor = '#7b1fa2';
            icon = '🔷';
            break;
          case 'Crossplane XR':
            bgColor = '#673ab7';
            borderColor = '#512da8';
            icon = '🔶';
            break;
          case 'KRO Instance':
            bgColor = '#ff9800';
            borderColor = '#f57c00';
            icon = '🟠';
            break;
          case 'CRD':
            bgColor = '#607d8b';
            borderColor = '#455a64';
            icon = '📋';
            break;
        }

        const nodeId = resource.metadata.uid!;
        const xPos = horizontalSpacing + (resourceIndex % 4) * horizontalSpacing;
        const yRow = Math.floor(resourceIndex / 4);
        
        nodes.push({
          id: nodeId,
          type: 'default',
          data: {
            label: `${icon} ${k8sKind}: ${resource.metadata.title || resource.metadata.name}`,
            name: resource.metadata.title || resource.metadata.name,
            kubernetesKind: k8sKind,
            category,
            status,
            namespace: nsName,
            entity: resource,
          } as NodeData,
          position: { x: xPos, y: yOffset + yRow * (resourceNodeHeight + 20) },
          style: {
            backgroundColor: bgColor,
            color: 'white',
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 12,
            minWidth: 200,
            fontSize: 12,
          },
        });

        // Create edge from namespace to resource
        if (nsEntity) {
          edges.push({
            id: `${nsNodeId}-${nodeId}`,
            source: nsNodeId,
            target: nodeId,
            type: 'smoothstep',
            style: { stroke: '#999', strokeWidth: 1.5 },
          });
        }

        // Create edges for dependencies
        const dependsOn = resource.spec?.dependsOn as string[] | undefined;
        if (dependsOn && Array.isArray(dependsOn)) {
          dependsOn.forEach(dep => {
            // Parse dependency format: kind:namespace/name
            const depEntity = entities.find(e => {
              const entityRef = `${e.kind}:${e.metadata.namespace || 'default'}/${e.metadata.name}`;
              return entityRef.toLowerCase() === dep.toLowerCase();
            });

            if (depEntity) {
              edges.push({
                id: `dep-${nodeId}-${depEntity.metadata.uid}`,
                source: nodeId,
                target: depEntity.metadata.uid!,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#ff9800', strokeWidth: 2 },
                label: 'depends on',
              });
            }
          });
        }
      });

      // Update yOffset for next namespace
      const resourceRows = Math.ceil(resources.length / 4);
      yOffset += resourceRows * (resourceNodeHeight + 20) + 40;
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [entities, annotationPrefix]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = (_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedEntity(node.data.entity);
  };

  const handleCloseDrawer = () => {
    setSelectedEntity(null);
  };

  if (entities.length === 0) {
    return (
      <Box className={classes.emptyState}>
        <Typography variant="h6" gutterBottom>
          No resources found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          No Kubernetes resources are associated with this cluster.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box className={classes.graphContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>
      </Box>

      {/* Entity Details Drawer */}
      <Drawer
        anchor="right"
        open={selectedEntity !== null}
        onClose={handleCloseDrawer}
      >
        {selectedEntity && (
          <Box style={{ width: 400, padding: 24 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                {selectedEntity.metadata.title || selectedEntity.metadata.name}
              </Typography>
              <IconButton size="small" onClick={handleCloseDrawer}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider style={{ marginBottom: 16 }} />

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Kubernetes Kind
              </Typography>
              <Typography variant="body1">
                {getKubernetesKind(selectedEntity, annotationPrefix)}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Category
              </Typography>
              <Chip 
                label={getResourceCategory(selectedEntity, annotationPrefix)} 
                size="small"
              />
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Entity Kind
              </Typography>
              <Chip label={selectedEntity.kind} size="small" />
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Namespace
              </Typography>
              <Typography variant="body1">
                {getEntityNamespace(selectedEntity, annotationPrefix)}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Owner
              </Typography>
              <Typography variant="body1">
                {getEntityOwner(selectedEntity)}
              </Typography>
            </Box>

            {getEntityStatus(selectedEntity) && (
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Status
                </Typography>
                <Typography variant="body1">
                  {getEntityStatus(selectedEntity)}
                </Typography>
              </Box>
            )}

            {selectedEntity.metadata.description && (
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2">
                  {selectedEntity.metadata.description}
                </Typography>
              </Box>
            )}

            <Divider style={{ marginTop: 16, marginBottom: 16 }} />

            <Link
              to={`/catalog/${selectedEntity.metadata.namespace || 'default'}/${selectedEntity.kind.toLowerCase()}/${selectedEntity.metadata.name}`}
            >
              <Button
                variant="contained"
                color="primary"
                fullWidth
                endIcon={<OpenInNewIcon />}
              >
                View in Catalog
              </Button>
            </Link>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
