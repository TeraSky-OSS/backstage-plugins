import type { WorkflowNode, WorkflowEdge, ParameterStep } from '../types';

export type LayoutDirection = 'horizontal' | 'vertical';

const HORIZONTAL_SPACING = 400; // Increased for better horizontal spacing
const VERTICAL_SPACING = 250; // Increased spacing to reduce line overlap

/**
 * Auto-layout nodes in a horizontal or vertical flow
 */
export function layoutNodes(
  nodes: WorkflowNode[],
  direction: LayoutDirection = 'vertical'
): WorkflowNode[] {
  if (nodes.length === 0) return nodes;

  // Separate node types
  const parameterGroupNodes = nodes.filter(n => n.type === 'parameter-group');
  const actionNodes = nodes.filter(n => n.type === 'action');
  const outputGroupNodes = nodes.filter(n => n.type === 'output-group');

  const layoutedNodes: WorkflowNode[] = [];

  // Calculate dimensions
  const hasParams = parameterGroupNodes.length > 0;
  const hasOutputs = outputGroupNodes.length > 0;
  
  // Calculate heights for proper centering in horizontal mode
  let paramBoxHeight = 0;
  let outputBoxHeight = 0;
  
  if (direction === 'horizontal') {
    // Estimate parameter box height
    if (hasParams) {
      const paramGroupData = parameterGroupNodes[0].data as any;
      const numParams = paramGroupData.parameters?.length || 0;
      // Header: ~50px, each param chip: ~38px (28 + 10 gap)
      paramBoxHeight = 80 + (numParams * 38);
    }
    
    // Estimate output box height
    if (hasOutputs) {
      const outputGroupData = outputGroupNodes[0].data as any;
      const numOutputs = outputGroupData.outputs?.length || 0;
      // Header: ~50px, each output chip: ~38px
      outputBoxHeight = 80 + (numOutputs * 38);
    }
  }

  // Use the taller box as reference for centering
  const referenceHeight = Math.max(paramBoxHeight, outputBoxHeight);
  const centerY = 50 + (referenceHeight / 2);

  // Position parameter group node
  if (hasParams) {
    if (direction === 'horizontal') {
      // LEFT side - position so its center aligns with centerY
      const paramCenterOffset = paramBoxHeight / 2;
      layoutedNodes.push({
        ...parameterGroupNodes[0],
        position: { x: 50, y: centerY - paramCenterOffset },
      });
    } else {
      // TOP center - horizontally spread
      layoutedNodes.push({
        ...parameterGroupNodes[0],
        position: { x: 200, y: 50 },
      });
    }
  }

  // Position action nodes
  actionNodes.forEach((node, index) => {
    if (direction === 'horizontal') {
      // HORIZONTAL: left to right, vertically centered
      const startX = hasParams ? 450 : 50;
      // Action nodes are ~100px tall, center them
      layoutedNodes.push({
        ...node,
        position: {
          x: startX + (index * HORIZONTAL_SPACING),
          y: centerY - 50, // Center action node (assuming ~100px height)
        },
      });
    } else {
      // VERTICAL: top to bottom, centered horizontally
      const actionStartY = hasParams ? 300 : 50;
      layoutedNodes.push({
        ...node,
        position: {
          x: 400,
          y: actionStartY + index * VERTICAL_SPACING,
        },
      });
    }
  });

  // Position output group node
  if (hasOutputs) {
    if (direction === 'horizontal') {
      // RIGHT side - position so its center aligns with centerY
      const startX = hasParams ? 450 : 50;
      const outputX = startX + (actionNodes.length * HORIZONTAL_SPACING) + 200;
      const outputCenterOffset = outputBoxHeight / 2;
      layoutedNodes.push({
        ...outputGroupNodes[0],
        position: {
          x: outputX,
          y: centerY - outputCenterOffset,
        },
      });
    } else {
      // VERTICAL: bottom center - horizontally spread
      const outputY = hasParams ? 300 + (actionNodes.length * VERTICAL_SPACING) + 150 : actionNodes.length * VERTICAL_SPACING + 150;
      layoutedNodes.push({
        ...outputGroupNodes[0],
        position: {
          x: 200,
          y: outputY,
        },
      });
    }
  }

  return layoutedNodes;
}

/**
 * Auto-detect edges based on input expressions referencing previous step outputs and parameters
 */
export function detectEdgesFromInputs(nodes: WorkflowNode[]): WorkflowEdge[] {
  const edges: WorkflowEdge[] = [];
  const edgeSet = new Set<string>(); // Track unique edges

  nodes.forEach(node => {
    if (node.type !== 'action') return;

    const nodeData = node.data as any;
    const inputs = nodeData.inputs || {};

    // Find all references to other steps and parameters in the inputs
    const referencedSteps = new Set<string>();
    const referencedParams = new Set<string>();
    let usesAllParameters = false;

    // Check if statement for parameter references
    const ifStatement = nodeData.if;
    const valuesToCheck = [...Object.values(inputs), ifStatement].filter(Boolean);

    valuesToCheck.forEach((value: any) => {
      if (typeof value === 'string') {
        // Check for full parameters object reference: ${{ parameters }}
        const fullParamsMatch = /\$\{\{\s*parameters\s*\}\}/.test(value);
        if (fullParamsMatch) {
          usesAllParameters = true;
        }

        // Match step references:
        // - ${{ steps.stepId.output.* }}
        // - ${{ steps['stepId'].output.* }}
        
        // Pattern 1: steps.stepId
        const dotNotationRefs = value.match(/\$\{\{\s*steps\.([a-zA-Z0-9_-]+)/g);
        if (dotNotationRefs) {
          dotNotationRefs.forEach(ref => {
            const match = ref.match(/steps\.([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              referencedSteps.add(match[1]);
            }
          });
        }
        
        // Pattern 2: steps['stepId'] or steps["stepId"]
        const bracketNotationRefs = value.match(/\$\{\{\s*steps\[['"]([^'"]+)['"]\]/g);
        if (bracketNotationRefs) {
          bracketNotationRefs.forEach(ref => {
            const match = ref.match(/steps\[['"]([^'"]+)['"]\]/);
            if (match && match[1]) {
              referencedSteps.add(match[1]);
            }
          });
        }

        // Match parameter references (including in complex expressions):
        // - ${{ parameters.paramName }}
        // - parameters.paramName (without outer {{ }})
        // This will catch params in expressions like: parameters.foo if parameters.bar else 'default'
        const paramRefs = value.match(/parameters\.([a-zA-Z0-9_-]+)/g);
        if (paramRefs) {
          paramRefs.forEach(ref => {
            const match = ref.match(/parameters\.([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              referencedParams.add(match[1]);
            }
          });
        }
      }
    });

    // Create edges for referenced steps
    referencedSteps.forEach(sourceId => {
      const edgeKey = `${sourceId}-${node.id}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `e-${sourceId}-${node.id}`,
          source: sourceId,
          target: node.id,
          animated: true,
          type: 'step',
          style: { stroke: '#1976d2', strokeWidth: 2 },
          zIndex: 500,
        } as any);
      }
    });

    // Create edges for referenced parameters
    if (usesAllParameters) {
      // If entire parameters object is used, connect from parameter-group "all" handle
      const paramGroupNode = nodes.find(n => n.type === 'parameter-group');
      if (paramGroupNode) {
        const edgeKey = `${paramGroupNode.id}-all-${node.id}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: `e-${paramGroupNode.id}-all-${node.id}`,
            source: paramGroupNode.id,
            sourceHandle: 'all',
            target: node.id,
            animated: false,
            type: 'straight',
            style: { stroke: '#9c27b0', strokeWidth: 3, strokeDasharray: '5,5' },
          } as any);
        }
      }
    } else {
      // Connect individual parameters from inner handles
      const paramGroupNode = nodes.find(n => n.type === 'parameter-group');
      if (paramGroupNode) {
        referencedParams.forEach(paramName => {
          const edgeKey = `${paramGroupNode.id}-${paramName}-${node.id}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edges.push({
              id: `e-${paramGroupNode.id}-param-${paramName}-${node.id}`,
              source: paramGroupNode.id,
              sourceHandle: `param-${paramName}`,
              target: node.id,
              animated: false,
              type: 'straight',
              style: { stroke: '#9c27b0', strokeWidth: 2 },
            } as any);
          }
        });
      }
    }
  });

  // Create edges from actions to output group
  const outputGroupNode = nodes.find(n => n.type === 'output-group');
  if (outputGroupNode) {
    const outputGroupData = outputGroupNode.data as any;
    
    outputGroupData.outputs.forEach((output: any) => {
      output.stepRefs.forEach((stepId: string) => {
        const edgeKey = `${stepId}-output-${output.title}`;
        
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: `e-${stepId}-output-${output.title}`,
            source: stepId,
            target: outputGroupNode.id,
            targetHandle: `output-${output.title}`,
            animated: false,
            type: 'straight',
            style: { stroke: '#4caf50', strokeWidth: 2 },
          } as any);
        }
      });
    });
  }

  return edges;
}

/**
 * Create a single parameter group node from parameter steps
 */
export function createParameterGroupNode(
  parameters: ParameterStep[],
  actionNodes: WorkflowNode[],
  layoutDirection: LayoutDirection = 'vertical'
): WorkflowNode | null {
  // Get all parameter names
  const allParams: Array<{ name: string; title: string }> = [];
  parameters.forEach(step => {
    Object.entries(step.properties).forEach(([paramName, paramDef]) => {
      allParams.push({
        name: paramName,
        title: paramDef.title || paramName,
      });
    });
  });

  if (allParams.length === 0) return null;

  // Count usage of each parameter
  const paramUsage = new Map<string, number>();
  let totalUsage = 0;

  actionNodes.forEach(node => {
    if (node.type !== 'action') return;
    const nodeData = node.data as any;
    const valuesToCheck = [...Object.values(nodeData.inputs || {}), nodeData.if].filter(Boolean);
    
    valuesToCheck.forEach((value: any) => {
      if (typeof value === 'string') {
        const paramRefs = value.match(/parameters\.([a-zA-Z0-9_-]+)/g);
        if (paramRefs) {
          paramRefs.forEach(ref => {
            const match = ref.match(/parameters\.([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              const count = paramUsage.get(match[1]) || 0;
              paramUsage.set(match[1], count + 1);
              totalUsage++;
            }
          });
        }
      }
    });
  });

  return {
    id: 'parameter-group',
    type: 'parameter-group',
    position: { x: 50, y: 50 },
    data: {
      type: 'parameter-group',
      parameters: allParams.map(p => ({
        ...p,
        usageCount: paramUsage.get(p.name) || 0,
      })),
      totalUsageCount: totalUsage,
      layoutDirection,
    },
  };
}

/**
 * Create output group node from template output.links
 */
export function createOutputGroupNode(
  templateOutput: { links?: Array<{ title?: string; url?: string; if?: string; [key: string]: any }> },
  _actionNodes: WorkflowNode[],
  layoutDirection: LayoutDirection = 'vertical'
): WorkflowNode | null {
  const links = templateOutput.links || [];
  
  if (links.length === 0) return null;

  // For each output link, find which steps it references
  const outputs = links.map(link => {
    const title = link.title || 'Untitled';
    const url = link.url || '';
    const stepRefs: string[] = [];

    // Check URL and all other fields for step references
    const valuesToCheck = Object.values(link).filter(v => typeof v === 'string');
    
    valuesToCheck.forEach((value: any) => {
      if (typeof value === 'string') {
        // Find all step references - both dot and bracket notation
        // Match: steps.stepId or steps['stepId'] or steps["stepId"]
        const patterns = [
          /steps\.([a-zA-Z0-9_-]+)/g,
          /steps\['([^']+)'\]/g,
          /steps\["([^"]+)"\]/g,
        ];
        
        patterns.forEach(pattern => {
          const matches = [...value.matchAll(pattern)];
          matches.forEach(match => {
            const stepId = match[1];
            if (stepId && !stepRefs.includes(stepId)) {
              stepRefs.push(stepId);
            }
          });
        });
      }
    });

    return {
      title,
      url,
      stepRefs,
    };
  });

  return {
    id: 'output-group',
    type: 'output-group',
    position: { x: 0, y: 0 },
    data: {
      type: 'output-group',
      outputs,
      layoutDirection,
    },
  };
}
