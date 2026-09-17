import { useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'react-flow-renderer';
// BUI-EXCEPTION: `Drawer` has no BUI equivalent (see MUI_TO_BUI_MIGRATION.md exception list).
import { Drawer } from '@material-ui/core';
import { Badge, Box, Button, ButtonIcon, Flex, Text } from '@backstage/ui';
import { Link } from '@backstage/core-components';
import { RiCloseLine, RiExternalLinkLine } from '@remixicon/react';
import { Entity } from '@backstage/catalog-model';
import {
  getKubernetesKind,
  getResourceCategory,
  getEntityNamespace,
  getEntityOwner,
  getEntityStatus,
  isNamespaceEntity,
} from './utils';
import styles from './KubernetesResources.module.css';

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
          default:
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
            type: 'default',
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
                type: 'default',
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
      <Box className={styles.emptyState}>
        <Text variant="title-small" weight="bold">
          No resources found
        </Text>
        <Text color="secondary">
          No Kubernetes resources are associated with this cluster.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box className={styles.graphContainer}>
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
          <Box className={styles.drawerBody}>
            <Flex align="center" justify="between" mb="4">
              <Text variant="title-small" weight="bold">
                {selectedEntity.metadata.title || selectedEntity.metadata.name}
              </Text>
              <ButtonIcon aria-label="Close" icon={<RiCloseLine />} onPress={handleCloseDrawer} />
            </Flex>

            <hr className={styles.divider} />

            <Box mb="4">
              <Text variant="title-x-small" color="secondary">
                Kubernetes Kind
              </Text>
              <Text>{getKubernetesKind(selectedEntity, annotationPrefix)}</Text>
            </Box>

            <Box mb="4">
              <Text variant="title-x-small" color="secondary">
                Category
              </Text>
              <Badge size="small">{getResourceCategory(selectedEntity, annotationPrefix)}</Badge>
            </Box>

            <Box mb="4">
              <Text variant="title-x-small" color="secondary">
                Entity Kind
              </Text>
              <Badge size="small">{selectedEntity.kind}</Badge>
            </Box>

            <Box mb="4">
              <Text variant="title-x-small" color="secondary">
                Namespace
              </Text>
              <Text>{getEntityNamespace(selectedEntity, annotationPrefix)}</Text>
            </Box>

            <Box mb="4">
              <Text variant="title-x-small" color="secondary">
                Owner
              </Text>
              <Text>{getEntityOwner(selectedEntity)}</Text>
            </Box>

            {getEntityStatus(selectedEntity) && (
              <Box mb="4">
                <Text variant="title-x-small" color="secondary">
                  Status
                </Text>
                <Text>{getEntityStatus(selectedEntity)}</Text>
              </Box>
            )}

            {selectedEntity.metadata.description && (
              <Box mb="4">
                <Text variant="title-x-small" color="secondary">
                  Description
                </Text>
                <Text>{selectedEntity.metadata.description}</Text>
              </Box>
            )}

            <hr className={styles.divider} />

            <Link
              to={`/catalog/${selectedEntity.metadata.namespace || 'default'}/${selectedEntity.kind.toLowerCase()}/${selectedEntity.metadata.name}`}
            >
              <Button variant="primary" iconEnd={<RiExternalLinkLine />} style={{ width: '100%' }}>
                View in Catalog
              </Button>
            </Link>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
