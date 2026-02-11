import React, { useCallback, useState } from 'react';
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
import { Box, Button, Tooltip, ButtonGroup, Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';
import SwapVertIcon from '@material-ui/icons/SwapVert';
import StartNode from './nodes/StartNode';
import ActionNode from './nodes/ActionNode';
import ParameterNode from './nodes/ParameterNode';
import ParameterGroupNode from './nodes/ParameterGroupNode';
import OutputNode from './nodes/OutputNode';
import OutputGroupNode from './nodes/OutputGroupNode';
import type { WorkflowNode, WorkflowEdge } from '../../types';
import { layoutNodes, detectEdgesFromInputs, type LayoutDirection } from '../../utils/layoutEngine';

const useStyles = makeStyles(theme => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1, // Keep workflow canvas below editor panels
  },
  reactFlow: {
    backgroundColor: theme.palette.background.default,
    width: '100%',
    height: '100%',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    zIndex: 10,
    minWidth: 200,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.75),
    fontSize: '0.8rem',
    '&:last-child': {
      marginBottom: 0,
    },
  },
  legendLine: {
    width: 30,
    height: 2,
  },
  legendDashedLine: {
    width: 30,
    height: 2,
    backgroundImage: 'repeating-linear-gradient(to right, currentColor 0, currentColor 5px, transparent 5px, transparent 10px)',
  },
}));

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

  const classes = useStyles();
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('vertical');
  const [legendExpanded, setLegendExpanded] = useState(false);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges as any);

  // Sync with parent state, inject delete handler, layout direction, and apply layout
  React.useEffect(() => {
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
  React.useEffect(() => {
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
    <Box className={classes.root} onKeyDown={handleKeyDown} tabIndex={0}>
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
        className={classes.reactFlow}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        elevateEdgesOnSelect={false}
        elevateNodesOnSelect={true}
        edgesFocusable={false}
      >
        <Background />
        <Controls />
        <Panel position="top-left">
          <Box display="flex" style={{ gap: 8 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={onAddActionClick}
              size="small"
            >
              Add Action
            </Button>
            <ButtonGroup size="small" variant="outlined">
              <Tooltip title="Horizontal Layout (Left to Right)">
                <Button
                  onClick={() => setLayoutDirection('horizontal')}
                  variant={layoutDirection === 'horizontal' ? 'contained' : 'outlined'}
                  color={layoutDirection === 'horizontal' ? 'primary' : 'default'}
                >
                  <SwapHorizIcon fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Vertical Layout (Top to Bottom)">
                <Button
                  onClick={() => setLayoutDirection('vertical')}
                  variant={layoutDirection === 'vertical' ? 'contained' : 'outlined'}
                  color={layoutDirection === 'vertical' ? 'primary' : 'default'}
                >
                  <SwapVertIcon fontSize="small" />
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>
        </Panel>
      </ReactFlow>

      {/* Collapsible Legend */}
      <Box
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        <Paper elevation={3} style={{ overflow: 'hidden' }}>
          <Button
            size="small"
            onClick={() => setLegendExpanded(!legendExpanded)}
            style={{
              minWidth: 100,
              padding: '4px 12px',
              textTransform: 'none',
              fontSize: '0.75rem',
            }}
          >
            {legendExpanded ? '▼ Hide Legend' : '▲ Legend'}
          </Button>
          {legendExpanded && (
            <Box style={{ padding: 12, maxWidth: 500 }}>
              <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Box style={{ width: 20, height: 3, backgroundColor: '#9c27b0' }} />
                  <Typography variant="caption">Parameter</Typography>
                </Box>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Box style={{ width: 20, height: 3, backgroundColor: '#9c27b0', borderTop: '2px dashed #9c27b0' }} />
                  <Typography variant="caption">All Params</Typography>
                </Box>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Box style={{ width: 20, height: 3, backgroundColor: '#2196f3' }} />
                  <Typography variant="caption">Step Flow</Typography>
                </Box>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Box style={{ width: 20, height: 3, backgroundColor: '#4caf50' }} />
                  <Typography variant="caption">To Output</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
