import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Typography,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import { ReactFlowProvider } from '@xyflow/react';
import { InputDesigner } from '../InputDesigner';
import { WorkflowCanvas } from '../WorkflowCanvas';
import { ActionConfigPanel } from '../ActionConfigPanel';
import { AddActionDialog } from '../AddActionDialog';
import { YAMLEditor } from '../YAMLEditor';
import { Toolbar } from '../Toolbar';
import { OutputConfig } from '../OutputConfig';
import type { TemplateBuilderState, ActionNodeData, AvailableAction } from '../../types';
import { stateToYAML, yamlToState } from '../../utils/templateSerializer';
import { validateTemplate } from '../../utils/templateValidator';
import { autoLayoutNodes } from '../WorkflowCanvas/ConnectionValidator';
import { createParameterGroupNode, createOutputGroupNode, detectEdgesFromInputs, layoutNodes } from '../../utils/layoutEngine';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    height: '100%',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: 'width 0.3s ease',
    position: 'relative',
  },
  leftPanelExpanded: {
    flex: '0 0 auto',
  },
  leftPanelCollapsed: {
    width: 0,
    flex: '0 0 0',
    borderRight: 'none',
  },
  resizeHandle: {
    position: 'absolute',
    right: -5,
    top: 0,
    bottom: 0,
    width: 10,
    cursor: 'col-resize',
    zIndex: 10003, // Above everything
    pointerEvents: 'auto',
    backgroundColor: 'transparent',
    borderRight: `2px solid transparent`,
    transition: 'background-color 0.2s, opacity 0.2s, border-color 0.2s',
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.2)',
      borderRightColor: theme.palette.primary.main,
      opacity: 1,
    },
    '&:active': {
      backgroundColor: 'rgba(25, 118, 210, 0.4)',
      borderRightColor: theme.palette.primary.main,
      opacity: 1,
    },
  },
  resizeOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10002, // Above resize handles to capture all events
    cursor: 'col-resize',
    backgroundColor: 'rgba(0, 0, 0, 0.01)', // Nearly invisible but blocks events
  },
  leftCollapseButton: {
    position: 'absolute',
    right: -16, // Position on the right edge of the left panel
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1200,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[3],
    width: 32,
    height: 32,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },
  },
  leftCollapseButtonCollapsed: {
    position: 'fixed',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1200,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.divider}`,
    borderLeft: 'none',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    boxShadow: theme.shadows[3],
    width: 32,
    height: 64,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },
  },
  rightCollapseButton: {
    position: 'absolute',
    left: -16, // Position on the left edge of the right panel
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[3],
    width: 32,
    height: 32,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },
  },
  rightCollapseButtonCollapsed: {
    position: 'fixed',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.divider}`,
    borderRight: 'none',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    boxShadow: theme.shadows[3],
    width: 32,
    height: 64,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },
  },
  centerPanel: {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    minWidth: 0, // Allow flex item to shrink below content size
    position: 'relative',
  },
  centerPanelRightResizeHandle: {
    position: 'absolute',
    right: -8,
    top: 0,
    bottom: 0,
    width: 16,
    cursor: 'col-resize',
    zIndex: 10003, // Above everything including the overlay
    pointerEvents: 'auto',
    backgroundColor: 'transparent',
    borderLeft: `2px solid transparent`,
    transition: 'background-color 0.2s, opacity 0.2s, border-color 0.2s',
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.2)',
      borderLeftColor: theme.palette.primary.main,
      opacity: 1,
    },
    '&:active': {
      backgroundColor: 'rgba(25, 118, 210, 0.4)',
      borderLeftColor: theme.palette.primary.main,
      opacity: 1,
    },
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible', // MUST be visible for Monaco autocomplete popup
    borderLeft: `1px solid ${theme.palette.divider}`,
    position: 'relative',
    zIndex: 1000, // High enough to be above canvas
    flex: '0 0 auto',
  },
  accordion: {
    '&:before': {
      display: 'none',
    },
    boxShadow: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  accordionExpanded: {
    margin: '0 !important',
  },
  accordionSummary: {
    minHeight: 48,
    '&.Mui-expanded': {
      minHeight: 48,
    },
  },
  accordionDetails: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    height: '100%',
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 400,
    height: '100%',
    width: '100%',
  },
}));

export interface EditorLayoutProps {
  state: TemplateBuilderState;
  actions: ReturnType<typeof import('./useTemplateState').useTemplateState>['actions'];
  canUndo: boolean;
  canRedo: boolean;
  availableActions: AvailableAction[];
  fieldExtensions: string[];
}

export function EditorLayout(props: EditorLayoutProps) {
  const { state, actions, canUndo, canRedo, availableActions, fieldExtensions } = props;
  const classes = useStyles();

  const [selectedField, setSelectedField] = useState<{ stepIndex: number; fieldName: string }>();
  const [selectedNode, setSelectedNode] = useState<string>();
  const [yamlValue, setYamlValue] = useState(() => {
    // Initialize with current state serialized to YAML
    try {
      return stateToYAML(state);
    } catch (error) {
      return '';
    }
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addActionDialogOpen, setAddActionDialogOpen] = useState(false);
  const [showYamlEditor, setShowYamlEditor] = useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('templateBuilder:leftPanelWidth');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('templateBuilder:rightPanelWidth');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  
  const [expandedPanels, setExpandedPanels] = useState({
    inputs: false,
    workflow: true, // Keep workflow expanded by default
    outputs: false,
  });
  
  // Track whether the state change originated from YAML editor
  const isUpdatingFromYaml = useRef(false);
  const yamlParseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (yamlParseTimerRef.current) {
        clearTimeout(yamlParseTimerRef.current);
      }
    };
  }, []);

  // Handle panel resizing
  const handleResizeStart = (panel: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(panel);
  };

  useEffect(() => {
    if (!isResizing) return;

    // Add cursor style to body during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isResizing === 'left') {
        const newWidth = e.clientX;
        // Min 200px, max 80% of screen width
        const maxWidth = Math.floor(window.innerWidth * 0.8);
        const clampedWidth = Math.max(200, Math.min(maxWidth, newWidth));
        setLeftPanelWidth(clampedWidth);
      } else if (isResizing === 'right') {
        const newWidth = window.innerWidth - e.clientX;
        // Min 300px, max 80% of screen width
        const maxWidth = Math.floor(window.innerWidth * 0.8);
        const clampedWidth = Math.max(300, Math.min(maxWidth, newWidth));
        setRightPanelWidth(clampedWidth);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Save to localStorage when resize ends
      if (isResizing === 'left') {
        localStorage.setItem('templateBuilder:leftPanelWidth', leftPanelWidth.toString());
      } else if (isResizing === 'right') {
        localStorage.setItem('templateBuilder:rightPanelWidth', rightPanelWidth.toString());
      }
      
      setIsResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, leftPanelWidth, rightPanelWidth]);

  // Track the last YAML value we sent to prevent overwriting during editing
  const lastSentYamlRef = useRef<string>('');

  // Sync state to YAML (only when NOT actively editing YAML)
  useEffect(() => {
    if (isUpdatingFromYaml.current) {
      // Currently syncing from YAML, don't override
      isUpdatingFromYaml.current = false;
      return;
    }
    
    // If there's a pending parse timer, user is still editing - don't override!
    if (yamlParseTimerRef.current) {
      return;
    }
    
    try {
      const yaml = stateToYAML(state);
      // Only update if the YAML actually changed
      if (yaml !== lastSentYamlRef.current) {
        lastSentYamlRef.current = yaml;
        setYamlValue(yaml);
      }
    } catch (error) {
      // Silently fail
    }
  }, [state]);

  const handleYAMLChange = (newYaml: string) => {
    // Update the YAML value immediately for responsive editing
    setYamlValue(newYaml);
    setHasUnsavedChanges(true);
    
    // Clear any existing timer
    if (yamlParseTimerRef.current) {
      clearTimeout(yamlParseTimerRef.current);
    }
    
    // Parse YAML to update visual editors after a LONG delay
    // This allows you to finish editing completely before it syncs
    yamlParseTimerRef.current = setTimeout(() => {
      try {
        const newState = yamlToState(newYaml);
        // Set flag to prevent cyclic update
        isUpdatingFromYaml.current = true;
        actions.setState(newState);
      } catch (error) {
        // If YAML is invalid, don't update state - that's fine
      }
    }, 2000); // 2 second delay - quick feedback, no interruption
  };

  const handleDownload = () => {
    const blob = new Blob([yamlValue], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.metadata.name}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setHasUnsavedChanges(false);
  };

  const handleValidate = () => {
    return validateTemplate(state);
  };

  const handleAddAction = (action: AvailableAction) => {
    const actionNodes = state.workflow.nodes.filter(n => n.type === 'action');
    const newNode = {
      id: `step-${Date.now()}`,
      type: 'action' as const,
      position: { x: 250, y: 150 + actionNodes.length * 120 },
      data: {
        type: 'action' as const,
        actionId: action.id,
        name: action.name,
        inputs: {},
      },
    };
    
    actions.addWorkflowNode(newNode);
    
    // Auto-connect to previous node
    const previousNodeId = actionNodes.length > 0 
      ? actionNodes[actionNodes.length - 1].id 
      : 'start';
    
    actions.addWorkflowEdge({
      id: `e-${previousNodeId}-${newNode.id}`,
      source: previousNodeId,
      target: newNode.id,
    });

    // Auto-layout
    setTimeout(() => {
      const layoutedNodes = autoLayoutNodes([...state.workflow.nodes, newNode]);
      actions.setWorkflowNodes(layoutedNodes);
    }, 100);
    
    setAddActionDialogOpen(false);
    setSelectedNode(newNode.id);
  };

  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return undefined;
    const node = state.workflow.nodes.find(n => n.id === selectedNode);
    return node?.type === 'action' ? (node.data as ActionNodeData) : undefined;
  }, [selectedNode, state.workflow.nodes]);

  const selectedActionSchema = useMemo(() => {
    if (!selectedNodeData) return undefined;
    const action = availableActions.find(a => a.id === selectedNodeData.actionId);
    return action?.schema;
  }, [selectedNodeData, availableActions]);

  const previousSteps = useMemo(() => {
    if (!selectedNode) return [];
    
    const nodeIndex = state.workflow.nodes.findIndex(n => n.id === selectedNode);
    return state.workflow.nodes
      .slice(0, nodeIndex)
      .filter(n => n.type === 'action')
      .map(n => ({
        id: n.id,
        name: (n.data as ActionNodeData).name,
      }));
  }, [selectedNode, state.workflow.nodes]);

  // Create combined nodes including parameter group and output group
  const displayNodes = useMemo(() => {
    const paramGroupNode = createParameterGroupNode(state.parameters, state.workflow.nodes);
    const outputGroupNode = createOutputGroupNode(state.output, state.workflow.nodes);
    const allNodes = [
      ...(paramGroupNode ? [paramGroupNode] : []),
      ...state.workflow.nodes,
      ...(outputGroupNode ? [outputGroupNode] : []),
    ];
    return layoutNodes(allNodes);
  }, [state.parameters, state.workflow.nodes, state.output]);

  // Create edges including parameter and output connections
  const displayEdges = useMemo(() => {
    return detectEdgesFromInputs(displayNodes);
  }, [displayNodes]);

  const handlePanelChange = (panel: keyof typeof expandedPanels) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  return (
    <Box className={classes.root}>
      {/* Overlay to block all events during resize */}
      {isResizing && (
        <Box className={classes.resizeOverlay} />
      )}
      
      <Toolbar
        templateName={state.metadata.name}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        onNameChange={name => actions.updateMetadata({ name })}
        onDownload={handleDownload}
        onValidate={handleValidate}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onHelp={() => window.open('https://backstage.io/docs/features/software-templates/', '_blank')}
      />

      <Box className={classes.content}>
        {/* Left Panel - Inputs & Outputs */}
        <Box 
          className={`${classes.leftPanel} ${leftSidebarCollapsed ? classes.leftPanelCollapsed : classes.leftPanelExpanded}`} 
          style={{ 
            position: 'relative',
            width: leftSidebarCollapsed ? 0 : leftPanelWidth,
            transition: leftSidebarCollapsed ? 'width 0.3s ease' : 'none',
          }}
        >
          {/* Left Panel Collapse Button */}
          <Tooltip title={leftSidebarCollapsed ? "Expand Input / Output Sidebar" : "Collapse Left Sidebar"} placement="right">
            <IconButton
              className={leftSidebarCollapsed ? classes.leftCollapseButtonCollapsed : classes.leftCollapseButton}
              size="small"
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            >
              {leftSidebarCollapsed ? <KeyboardArrowRightIcon /> : <KeyboardArrowLeftIcon />}
            </IconButton>
          </Tooltip>

          {!leftSidebarCollapsed && (
            <>
              {/* Resize Handle */}
              <Box 
                className={classes.resizeHandle}
                onMouseDown={handleResizeStart('left')}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ 
                  backgroundColor: isResizing === 'left' ? 'rgba(25, 118, 210, 0.8)' : undefined,
                }}
              />
          <Accordion 
            expanded={expandedPanels.inputs}
            onChange={() => handlePanelChange('inputs')}
            className={classes.accordion}
            classes={{ expanded: classes.accordionExpanded }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              className={classes.accordionSummary}
            >
              <Typography variant="h6">Input Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.accordionDetails}>
              <Box flex={1} overflow="auto">
                <InputDesigner
                  parameters={state.parameters}
                  selectedField={selectedField}
                  fieldExtensions={fieldExtensions}
                  onAddStep={actions.addParameterStep}
                  onUpdateStep={actions.updateParameterStep}
                  onDeleteStep={actions.deleteParameterStep}
                  onAddField={actions.addParameterField}
                  onUpdateField={actions.updateParameterField}
                  onDeleteField={actions.deleteParameterField}
                  onSelectField={(stepIndex, fieldName) => setSelectedField({ stepIndex, fieldName })}
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion 
            expanded={expandedPanels.outputs}
            onChange={() => handlePanelChange('outputs')}
            className={classes.accordion}
            classes={{ expanded: classes.accordionExpanded }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              className={classes.accordionSummary}
            >
              <Typography variant="h6">Template Outputs</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.accordionDetails}>
              <OutputConfig
                links={state.output.links}
                onUpdateLinks={links => actions.updateOutput({ links })}
              />
            </AccordionDetails>
          </Accordion>
          </>
          )}
        </Box>

        {/* Center Panel - Workflow Canvas */}
        <Box className={classes.centerPanel}>
          {expandedPanels.workflow ? (
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <Box 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  cursor: 'pointer'
                }}
                onClick={() => handlePanelChange('workflow')}
              >
                <ExpandMoreIcon />
                <Typography variant="h6" style={{ marginLeft: 8 }}>Workflow Steps</Typography>
              </Box>
              <Box style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <ReactFlowProvider>
                  <WorkflowCanvas
                    nodes={displayNodes}
                    edges={displayEdges}
                    selectedNode={selectedNode}
                    onNodesChange={nodes => {
                      // Only save action nodes (filter out parameter-group and output-group nodes)
                      const actionNodes = nodes.filter((n: any) => n.type === 'action');
                      actions.setWorkflowNodes(actionNodes);
                    }}
                    onEdgesChange={actions.setWorkflowEdges}
                    onNodeClick={nodeId => {
                      // Close panel if clicking empty space or same node
                      if (!nodeId || nodeId === selectedNode) {
                        setSelectedNode(undefined);
                      } else {
                        setSelectedNode(nodeId);
                      }
                    }}
                    onNodeDelete={actions.deleteWorkflowNode}
                    onAddActionClick={() => setAddActionDialogOpen(true)}
                  />
                </ReactFlowProvider>
              </Box>
            </Box>
          ) : (
            <Accordion 
              expanded={false}
              onChange={() => handlePanelChange('workflow')}
              className={classes.accordion}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                className={classes.accordionSummary}
              >
                <Typography variant="h6">Workflow Steps</Typography>
              </AccordionSummary>
            </Accordion>
          )}

          {/* Action Configuration Panel */}
          {selectedNodeData && (
            <Box borderTop="1px solid rgba(0, 0, 0, 0.12)" maxHeight="50%" overflow="auto">
              <ActionConfigPanel
                action={selectedNodeData}
                nodeId={selectedNode!}
                actionSchema={selectedActionSchema}
                parameters={state.parameters}
                previousSteps={previousSteps}
                onUpdateInputs={inputs => actions.updateNodeInputs(selectedNode!, inputs)}
                onUpdateName={name => {
                  const node = state.workflow.nodes.find(n => n.id === selectedNode);
                  if (node && node.type === 'action') {
                    actions.updateWorkflowNode(selectedNode!, {
                      data: { ...(node.data as ActionNodeData), name }
                    });
                  }
                }}
                onUpdateId={newId => {
                  if (newId && selectedNode && newId !== selectedNode) {
                    // Update the node ID
                    const node = state.workflow.nodes.find(n => n.id === selectedNode);
                    if (node && node.type === 'action') {
                      // Create new node with updated ID
                      const newNode = { ...node, id: newId };
                      const newNodes = state.workflow.nodes.map(n => n.id === selectedNode ? newNode : n);
                      
                      // Update edges to reference new ID
                      const oldId = selectedNode;
                      const newEdges = state.workflow.edges.map(edge => ({
                        ...edge,
                        source: edge.source === oldId ? newId : edge.source,
                        target: edge.target === oldId ? newId : edge.target,
                        id: edge.id.replace(oldId, newId),
                      }));
                      
                      actions.setWorkflowNodes(newNodes);
                      actions.setWorkflowEdges(newEdges);
                      setSelectedNode(newId);
                    }
                  }
                }}
                onClose={() => setSelectedNode(undefined)}
              />
            </Box>
          )}
          
          {/* Right Panel Resize Handle - Attached to center panel to avoid Monaco interference */}
          {showYamlEditor && (
            <Box 
              className={classes.centerPanelRightResizeHandle}
              onMouseDown={handleResizeStart('right')}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                backgroundColor: isResizing === 'right' ? 'rgba(25, 118, 210, 0.8)' : undefined,
              }}
            />
          )}
        </Box>

        {/* Right Panel - YAML Editor */}
        <Box 
          className={classes.rightPanel} 
          style={{ 
            position: 'relative', 
            display: showYamlEditor ? 'flex' : 'none',
            width: rightPanelWidth,
          }}
        >
          {/* Right Panel Collapse Button */}
          <Tooltip title="Collapse YAML Editor" placement="left">
            <IconButton
              className={classes.rightCollapseButton}
              size="small"
              onClick={() => setShowYamlEditor(false)}
            >
              <KeyboardArrowRightIcon />
            </IconButton>
          </Tooltip>

          <Box flex={1} display="flex" flexDirection="column" style={{ height: '100%', overflow: 'visible', position: 'relative', zIndex: 1000 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" p={1} borderBottom="1px solid rgba(0, 0, 0, 0.12)">
              <Typography variant="subtitle2">YAML Editor</Typography>
            </Box>
            <Box 
              flex={1} 
              style={{ 
                minHeight: 0, 
                overflow: 'visible', 
                position: 'relative',
                isolation: 'isolate',
                contain: 'layout',
              }}
            >
              <YAMLEditor
                value={yamlValue}
                onChange={handleYAMLChange}
                availableActions={availableActions}
                fieldExtensions={fieldExtensions}
              />
            </Box>
          </Box>
        </Box>

        {/* Show YAML Editor Button - When collapsed */}
        {!showYamlEditor && (
          <Tooltip title="Expand YAML Editor" placement="left">
            <IconButton
              className={classes.rightCollapseButtonCollapsed}
              size="small"
              onClick={() => setShowYamlEditor(true)}
            >
              <KeyboardArrowLeftIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Add Action Dialog */}
      <AddActionDialog
        open={addActionDialogOpen}
        actions={availableActions}
        onClose={() => setAddActionDialogOpen(false)}
        onSelectAction={handleAddAction}
      />
    </Box>
  );
}
