import type { WorkflowNode, WorkflowEdge, ConnectionValidation } from '../../types';

export function validateConnection(
  sourceId: string,
  targetId: string,
  _nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ConnectionValidation {
  // Can't connect to self
  if (sourceId === targetId) {
    return {
      valid: false,
      message: 'Cannot connect a node to itself',
    };
  }

  // Check if connection already exists
  const connectionExists = edges.some(
    edge => edge.source === sourceId && edge.target === targetId
  );

  if (connectionExists) {
    return {
      valid: false,
      message: 'Connection already exists',
    };
  }

  // Check for cycles (DAG validation)
  const wouldCreateCycle = createsCycle(sourceId, targetId, edges);
  
  if (wouldCreateCycle) {
    return {
      valid: false,
      message: 'Connection would create a cycle',
    };
  }

  // Target can only have one incoming edge (linear workflow)
  const targetHasInput = edges.some(edge => edge.target === targetId);
  
  if (targetHasInput) {
    return {
      valid: false,
      message: 'Target node already has an input connection',
    };
  }

  return { valid: true };
}

function createsCycle(
  sourceId: string,
  targetId: string,
  edges: WorkflowEdge[]
): boolean {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  });

  // Add the new edge temporarily
  if (!graph.has(sourceId)) {
    graph.set(sourceId, []);
  }
  graph.get(sourceId)!.push(targetId);

  // DFS to detect cycle
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check all nodes
  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        return true;
      }
    }
  }

  return false;
}

export function autoLayoutNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  // Simple vertical layout
  const startNode = nodes.find(node => node.type === 'start');
  const actionNodes = nodes.filter(node => node.type === 'action');

  const layouted: WorkflowNode[] = [];
  const ySpacing = 120;
  const xPosition = 250;

  if (startNode) {
    layouted.push({
      ...startNode,
      position: { x: xPosition, y: 50 },
    });
  }

  actionNodes.forEach((node, index) => {
    layouted.push({
      ...node,
      position: { x: xPosition, y: 170 + index * ySpacing },
    });
  });

  return layouted;
}
