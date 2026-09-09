import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  Node,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Panel,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './WorkflowCanvas.css';
import { Box, Button, Card, Text, ToggleButton, ToggleButtonGroup, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiAddLine, RiArrowLeftRightLine, RiArrowUpDownLine } from '@remixicon/react';
import StartNode from './nodes/StartNode';
import ActionNode from './nodes/ActionNode';
import ParameterNode from './nodes/ParameterNode';
import ParameterGroupNode from './nodes/ParameterGroupNode';
import OutputNode from './nodes/OutputNode';
import OutputGroupNode from './nodes/OutputGroupNode';
import type { WorkflowNode, WorkflowEdge } from '../../types';
import { layoutNodes, detectEdgesFromInputs, type LayoutDirection } from '../../utils/layoutEngine';
import styles from './WorkflowCanvas.module.css';

const nodeTypes: NodeTypes = {
  start: StartNode as any,
  action: ActionNode as any,
  parameter: ParameterNode as any,
  'parameter-group': ParameterGroupNode as any,
  output: OutputNode as any,
  'output-group': OutputGroupNode as any,
};

export interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode?: string;
  onNodesChange: (nodes: any[]) => void;
  onEdgesChange: (edges: any[]) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDelete: (nodeId: string) => void;
  onAddActionClick: () => void;
}

const HANDLE_POSITIONS = {
  horizontal: { source: Position.Right, target: Position.Left },
  vertical: { source: Position.Bottom, target: Position.Top },
};

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  const {
    nodes: initialNodes,
    edges: initialEdges,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onNodeDelete,
    onAddActionClick,
  } = props;

  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('vertical');
  const [legendExpanded, setLegendExpanded] = useState(false);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges as any);

  // Sync with parent state, inject delete handler, layout direction, and apply layout
  useEffect(() => {
    const handlePositions = HANDLE_POSITIONS[layoutDirection];
    
    const nodesWithDelete = initialNodes.map(node => {
      const baseNode = {
        ...node,
        sourcePosition: handlePositions.source,
        targetPosition: handlePositions.target,
      };
      
      if (node.type === 'action') {
        return {
          ...baseNode,
          data: {
            ...node.data,
            onDelete: () => onNodeDelete(node.id),
            layoutDirection, // Inject layoutDirection into actions too
          },
        };
      }
      
      // Inject layoutDirection into group nodes
      if (node.type === 'parameter-group' || node.type === 'output-group') {
        return {
          ...baseNode,
          data: {
            ...node.data,
            layoutDirection,
          },
        };
      }
      
      return baseNode;
    });
    
    // Apply layout
    const layoutedNodes = layoutNodes(nodesWithDelete, layoutDirection);
    setNodes(layoutedNodes as any);
  }, [initialNodes, setNodes, onNodeDelete, layoutDirection]);

  // Auto-detect edges from input expressions
  useEffect(() => {
    const autoEdges = detectEdgesFromInputs(initialNodes);
    setEdges(autoEdges as any);
    onEdgesChange(autoEdges as any);
  }, [initialNodes, setEdges, onEdgesChange]);

  // Disable manual edge creation - edges are auto-detected
  const onConnect = useCallback(
    (_connection: Connection) => {
      // Manual edge creation is disabled
      // Edges are automatically detected from input expressions
    },
    []
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
      
      // Debounce updates to parent
      setTimeout(() => {
        setNodes(currentNodes => {
          onNodesChange(currentNodes as any);
          return currentNodes;
        });
      }, 100);
    },
    [onNodesChangeInternal, setNodes, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      
      setTimeout(() => {
        setEdges(currentEdges => {
          onEdgesChange(currentEdges as any);
          return currentEdges;
        });
      }, 100);
    },
    [onEdgesChangeInternal, setEdges, onEdgesChange]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'action') {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  const handlePaneClick = useCallback(() => {
    // Close action config panel when clicking on empty canvas
    onNodeClick('');
  }, [onNodeClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNode = nodes.find((node: Node) => node.selected);
        if (selectedNode && selectedNode.type === 'action') {
          onNodeDelete(selectedNode.id);
        }
      }
    },
    [nodes, onNodeDelete]
  );

  return (
    <Box className={styles.root} onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          animated: false,
          type: 'straight',
        }}
        className={styles.reactFlow}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        elevateEdgesOnSelect={false}
        elevateNodesOnSelect
        edgesFocusable={false}
      >
        <Background />
        <Controls />
        <Panel position="top-left">
          <Box display="flex" style={{ gap: 8 }}>
            <Button variant="primary" size="small" iconStart={<RiAddLine />} onPress={onAddActionClick}>
              Add Action
            </Button>
            <ToggleButtonGroup
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[layoutDirection]}
              onSelectionChange={keys => {
                const [value] = Array.from(keys);
                if (value) setLayoutDirection(value as LayoutDirection);
              }}
            >
              <TooltipTrigger>
                <ToggleButton id="horizontal" aria-label="Horizontal Layout (Left to Right)" size="small">
                  <RiArrowLeftRightLine size={16} />
                </ToggleButton>
                <Tooltip>Horizontal Layout (Left to Right)</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger>
                <ToggleButton id="vertical" aria-label="Vertical Layout (Top to Bottom)" size="small">
                  <RiArrowUpDownLine size={16} />
                </ToggleButton>
                <Tooltip>Vertical Layout (Top to Bottom)</Tooltip>
              </TooltipTrigger>
            </ToggleButtonGroup>
          </Box>
        </Panel>
      </ReactFlow>

      {/* Collapsible Legend */}
      <Box className={styles.legendWrapper}>
        <Card className={styles.legendCard}>
          <Button
            variant="tertiary"
            size="small"
            onPress={() => setLegendExpanded(!legendExpanded)}
          >
            {legendExpanded ? '▼ Hide Legend' : '▲ Legend'}
          </Button>
          {legendExpanded && (
            <Box className={styles.legendContent}>
              <Box className={styles.legendItems}>
                <Box className={styles.legendItem}>
                  <span className={styles.legendLine} style={{ backgroundColor: '#9c27b0' }} />
                  <Text variant="body-x-small">Parameter</Text>
                </Box>
                <Box className={styles.legendItem}>
                  <span className={styles.legendDashedLine} style={{ backgroundColor: '#9c27b0', color: '#9c27b0' }} />
                  <Text variant="body-x-small">All Params</Text>
                </Box>
                <Box className={styles.legendItem}>
                  <span className={styles.legendLine} style={{ backgroundColor: '#2196f3' }} />
                  <Text variant="body-x-small">Step Flow</Text>
                </Box>
                <Box className={styles.legendItem}>
                  <span className={styles.legendLine} style={{ backgroundColor: '#4caf50' }} />
                  <Text variant="body-x-small">To Output</Text>
                </Box>
              </Box>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
}
