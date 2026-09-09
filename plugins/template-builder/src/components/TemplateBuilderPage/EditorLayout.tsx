import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  ButtonIcon,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
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
import styles from './EditorLayout.module.css';

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

  const handleResizeKeyDown = (panel: 'left' | 'right') => (e: React.KeyboardEvent) => {
    const step = 20;
    const maxWidth = Math.floor(window.innerWidth * 0.8);
    if (panel === 'left') {
      if (e.key === 'ArrowLeft') {
        setLeftPanelWidth(w => Math.max(200, w - step));
      } else if (e.key === 'ArrowRight') {
        setLeftPanelWidth(w => Math.min(maxWidth, w + step));
      }
    } else if (panel === 'right') {
      if (e.key === 'ArrowLeft') {
        setRightPanelWidth(w => Math.min(maxWidth, w + step));
      } else if (e.key === 'ArrowRight') {
        setRightPanelWidth(w => Math.max(300, w - step));
      }
    }
  };

  useEffect(() => {
    if (!isResizing) return () => {};

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
    <div className={styles.root}>
      {/* Overlay to block all events during resize */}
      {isResizing && (
        <div className={styles.resizeOverlay} />
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

      <div className={styles.content}>
        {/* Left Panel - Inputs & Outputs */}
        <div
          className={`${styles.leftPanel} ${leftSidebarCollapsed ? styles.leftPanelCollapsed : styles.leftPanelExpanded}`}
          style={{
            position: 'relative',
            width: leftSidebarCollapsed ? 0 : leftPanelWidth,
            transition: leftSidebarCollapsed ? 'width 0.3s ease' : 'none',
          }}
        >
          {/* Left Panel Collapse Button */}
          <TooltipTrigger>
            <ButtonIcon
              aria-label={leftSidebarCollapsed ? 'Expand Input / Output Sidebar' : 'Collapse Left Sidebar'}
              className={leftSidebarCollapsed ? styles.leftCollapseButtonCollapsed : styles.leftCollapseButton}
              size="small"
              icon={leftSidebarCollapsed ? <RiArrowRightSLine /> : <RiArrowLeftSLine />}
              onPress={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            />
            <Tooltip placement="right">
              {leftSidebarCollapsed ? 'Expand Input / Output Sidebar' : 'Collapse Left Sidebar'}
            </Tooltip>
          </TooltipTrigger>

          {!leftSidebarCollapsed && (
            <>
              {/* Resize Handle */}
              <div
                className={styles.resizeHandle}
                role="slider"
                aria-orientation="vertical"
                aria-label="Resize left sidebar"
                aria-valuenow={leftPanelWidth}
                aria-valuemin={200}
                aria-valuemax={Math.floor(window.innerWidth * 0.8)}
                tabIndex={0}
                onMouseDown={handleResizeStart('left')}
                onKeyDown={handleResizeKeyDown('left')}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{
                  backgroundColor: isResizing === 'left' ? 'var(--bui-accent-fg)' : undefined,
                }}
              />
              <Accordion
                isExpanded={expandedPanels.inputs}
                onExpandedChange={() => handlePanelChange('inputs')}
              >
                <AccordionTrigger>Input Parameters</AccordionTrigger>
                <AccordionPanel className={styles.sidePanelAccordionPanel}>
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
                </AccordionPanel>
              </Accordion>

              <Accordion
                isExpanded={expandedPanels.outputs}
                onExpandedChange={() => handlePanelChange('outputs')}
              >
                <AccordionTrigger>Template Outputs</AccordionTrigger>
                <AccordionPanel className={styles.sidePanelAccordionPanel}>
                  <OutputConfig
                    links={state.output.links}
                    onUpdateLinks={links => actions.updateOutput({ links })}
                  />
                </AccordionPanel>
              </Accordion>
            </>
          )}
        </div>

        {/* Center Panel - Workflow Canvas */}
        <div className={styles.centerPanel}>
          <Accordion
            className={styles.workflowAccordion}
            isExpanded={expandedPanels.workflow}
            onExpandedChange={() => handlePanelChange('workflow')}
          >
            <AccordionTrigger>Workflow Steps</AccordionTrigger>
            {expandedPanels.workflow && (
              <AccordionPanel className={styles.workflowAccordionPanel}>
                <div className={styles.canvasContainer}>
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
                </div>
              </AccordionPanel>
            )}
          </Accordion>

          {/* Action Configuration Panel */}
          {selectedNodeData && (
            <div className={styles.actionConfigPanel}>
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
            </div>
          )}

          {/* Right Panel Resize Handle - Attached to center panel to avoid Monaco interference */}
          {showYamlEditor && (
            <div
              className={styles.centerPanelRightResizeHandle}
              role="slider"
              aria-orientation="vertical"
              aria-label="Resize YAML editor panel"
              aria-valuenow={rightPanelWidth}
              aria-valuemin={300}
              aria-valuemax={Math.floor(window.innerWidth * 0.8)}
              tabIndex={0}
              onMouseDown={handleResizeStart('right')}
              onKeyDown={handleResizeKeyDown('right')}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                backgroundColor: isResizing === 'right' ? 'var(--bui-accent-fg)' : undefined,
              }}
            />
          )}
        </div>

        {/* Right Panel - YAML Editor */}
        <div
          className={styles.rightPanel}
          style={{
            position: 'relative',
            display: showYamlEditor ? 'flex' : 'none',
            width: rightPanelWidth,
          }}
        >
          {/* Right Panel Collapse Button */}
          <TooltipTrigger>
            <ButtonIcon
              aria-label="Collapse YAML Editor"
              className={styles.rightCollapseButton}
              size="small"
              icon={<RiArrowRightSLine />}
              onPress={() => setShowYamlEditor(false)}
            />
            <Tooltip placement="left">Collapse YAML Editor</Tooltip>
          </TooltipTrigger>

          <div className={styles.yamlEditorContainer}>
            <div className={styles.yamlEditorHeader}>
              <Text variant="body-small" weight="bold">YAML Editor</Text>
            </div>
            <div className={styles.yamlEditorBody}>
              <YAMLEditor
                value={yamlValue}
                onChange={handleYAMLChange}
                availableActions={availableActions}
                fieldExtensions={fieldExtensions}
              />
            </div>
          </div>
        </div>

        {/* Show YAML Editor Button - When collapsed */}
        {!showYamlEditor && (
          <TooltipTrigger>
            <ButtonIcon
              aria-label="Expand YAML Editor"
              className={styles.rightCollapseButtonCollapsed}
              size="small"
              icon={<RiArrowLeftSLine />}
              onPress={() => setShowYamlEditor(true)}
            />
            <Tooltip placement="left">Expand YAML Editor</Tooltip>
          </TooltipTrigger>
        )}
      </div>

      {/* Add Action Dialog */}
      <AddActionDialog
        open={addActionDialogOpen}
        actions={availableActions}
        onClose={() => setAddActionDialogOpen(false)}
        onSelectAction={handleAddAction}
      />
    </div>
  );
}
