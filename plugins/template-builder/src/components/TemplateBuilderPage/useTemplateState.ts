import { useReducer, useMemo } from 'react';
import type {
  TemplateBuilderState,
  TemplateMetadata,
  ParameterStep,
  FieldDefinition,
  WorkflowNode,
  WorkflowEdge,
  ActionNodeData,
} from '../../types';

interface HistoryState {
  past: TemplateBuilderState[];
  present: TemplateBuilderState;
  future: TemplateBuilderState[];
}

type TemplateAction =
  | { type: 'SET_STATE'; payload: TemplateBuilderState }
  | { type: 'UPDATE_METADATA'; payload: Partial<TemplateMetadata> }
  | { type: 'ADD_PARAMETER_STEP'; payload: ParameterStep }
  | { type: 'UPDATE_PARAMETER_STEP'; payload: { index: number; step: Partial<ParameterStep> } }
  | { type: 'DELETE_PARAMETER_STEP'; payload: number }
  | { type: 'ADD_PARAMETER_FIELD'; payload: { stepIndex: number; fieldName: string; field: FieldDefinition } }
  | { type: 'UPDATE_PARAMETER_FIELD'; payload: { stepIndex: number; fieldName: string; updates: Partial<FieldDefinition> } }
  | { type: 'DELETE_PARAMETER_FIELD'; payload: { stepIndex: number; fieldName: string } }
  | { type: 'REORDER_PARAMETER_FIELDS'; payload: { stepIndex: number; fromIndex: number; toIndex: number } }
  | { type: 'ADD_WORKFLOW_NODE'; payload: WorkflowNode }
  | { type: 'UPDATE_WORKFLOW_NODE'; payload: { nodeId: string; updates: Partial<WorkflowNode> } }
  | { type: 'UPDATE_NODE_INPUTS'; payload: { nodeId: string; inputs: Record<string, any> } }
  | { type: 'DELETE_WORKFLOW_NODE'; payload: string }
  | { type: 'SET_WORKFLOW_NODES'; payload: WorkflowNode[] }
  | { type: 'ADD_WORKFLOW_EDGE'; payload: WorkflowEdge }
  | { type: 'DELETE_WORKFLOW_EDGE'; payload: string }
  | { type: 'SET_WORKFLOW_EDGES'; payload: WorkflowEdge[] }
  | { type: 'UPDATE_OUTPUT'; payload: Partial<TemplateBuilderState['output']> }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialState: TemplateBuilderState = {
  metadata: {
    name: 'new-template',
    title: 'New Template',
    description: '',
    tags: [],
  },
  parameters: [
    {
      id: 'step-1',
      title: 'Fill in some information',
      properties: {},
      required: [],
    },
  ],
  workflow: {
    nodes: [],
    edges: [],
  },
  output: {
    links: [],
  },
};

function templateReducer(state: TemplateBuilderState, action: TemplateAction): TemplateBuilderState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'UPDATE_METADATA':
      return {
        ...state,
        metadata: { ...state.metadata, ...action.payload },
      };

    case 'ADD_PARAMETER_STEP':
      return {
        ...state,
        parameters: [...state.parameters, action.payload],
      };

    case 'UPDATE_PARAMETER_STEP': {
      const newParameters = [...state.parameters];
      newParameters[action.payload.index] = {
        ...newParameters[action.payload.index],
        ...action.payload.step,
      };
      return { ...state, parameters: newParameters };
    }

    case 'DELETE_PARAMETER_STEP':
      return {
        ...state,
        parameters: state.parameters.filter((_, index) => index !== action.payload),
      };

    case 'ADD_PARAMETER_FIELD': {
      const newParameters = [...state.parameters];
      const step = { ...newParameters[action.payload.stepIndex] };
      step.properties = {
        ...step.properties,
        [action.payload.fieldName]: action.payload.field,
      };
      newParameters[action.payload.stepIndex] = step;
      return { ...state, parameters: newParameters };
    }

    case 'UPDATE_PARAMETER_FIELD': {
      const newParameters = [...state.parameters];
      const step = { ...newParameters[action.payload.stepIndex] };
      step.properties = {
        ...step.properties,
        [action.payload.fieldName]: {
          ...step.properties[action.payload.fieldName],
          ...action.payload.updates,
        },
      };
      newParameters[action.payload.stepIndex] = step;
      return { ...state, parameters: newParameters };
    }

    case 'DELETE_PARAMETER_FIELD': {
      const newParameters = [...state.parameters];
      const step = { ...newParameters[action.payload.stepIndex] };
      const { [action.payload.fieldName]: _, ...rest } = step.properties;
      step.properties = rest;
      step.required = step.required.filter(name => name !== action.payload.fieldName);
      newParameters[action.payload.stepIndex] = step;
      return { ...state, parameters: newParameters };
    }

    case 'REORDER_PARAMETER_FIELDS': {
      const { stepIndex, fromIndex, toIndex } = action.payload;
      const step = state.parameters[stepIndex];
      const entries = Object.entries(step.properties);
      const [removed] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, removed);
      
      const newParameters = [...state.parameters];
      newParameters[stepIndex] = {
        ...step,
        properties: Object.fromEntries(entries),
      };
      return { ...state, parameters: newParameters };
    }

    case 'ADD_WORKFLOW_NODE':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          nodes: [...state.workflow.nodes, action.payload],
        },
      };

    case 'UPDATE_WORKFLOW_NODE': {
      const nodes = state.workflow.nodes.map(node =>
        node.id === action.payload.nodeId
          ? { ...node, ...action.payload.updates }
          : node
      );
      return {
        ...state,
        workflow: { ...state.workflow, nodes },
      };
    }

    case 'UPDATE_NODE_INPUTS': {
      const nodes = state.workflow.nodes.map(node => {
        if (node.id === action.payload.nodeId && node.data.type === 'action') {
          return {
            ...node,
            data: {
              ...node.data,
              inputs: action.payload.inputs,
            } as ActionNodeData,
          };
        }
        return node;
      });
      return {
        ...state,
        workflow: { ...state.workflow, nodes },
      };
    }

    case 'DELETE_WORKFLOW_NODE':
      return {
        ...state,
        workflow: {
          nodes: state.workflow.nodes.filter(node => node.id !== action.payload),
          edges: state.workflow.edges.filter(
            edge => edge.source !== action.payload && edge.target !== action.payload
          ),
        },
      };

    case 'SET_WORKFLOW_NODES':
      return {
        ...state,
        workflow: { ...state.workflow, nodes: action.payload },
      };

    case 'ADD_WORKFLOW_EDGE':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          edges: [...state.workflow.edges, action.payload],
        },
      };

    case 'DELETE_WORKFLOW_EDGE':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          edges: state.workflow.edges.filter(edge => edge.id !== action.payload),
        },
      };

    case 'SET_WORKFLOW_EDGES':
      return {
        ...state,
        workflow: { ...state.workflow, edges: action.payload },
      };

    case 'UPDATE_OUTPUT':
      return {
        ...state,
        output: { ...state.output, ...action.payload },
      };

    default:
      return state;
  }
}

function historyReducer(history: HistoryState, action: TemplateAction): HistoryState {
  const { past, present, future } = history;

  switch (action.type) {
    case 'UNDO': {
      if (past.length === 0) return history;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    }

    case 'REDO': {
      if (future.length === 0) return history;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    }

    default: {
      const newPresent = templateReducer(present, action);
      if (present === newPresent) return history;
      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      };
    }
  }
}

export function useTemplateState(initialTemplate?: TemplateBuilderState) {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialTemplate || initialState,
    future: [],
  });

  const { past, present: state, future } = history;

  const actions = useMemo(
    () => ({
      setState: (newState: TemplateBuilderState) =>
        dispatch({ type: 'SET_STATE', payload: newState }),

      updateMetadata: (metadata: Partial<TemplateMetadata>) =>
        dispatch({ type: 'UPDATE_METADATA', payload: metadata }),

      addParameterStep: (step: ParameterStep) =>
        dispatch({ type: 'ADD_PARAMETER_STEP', payload: step }),

      updateParameterStep: (index: number, step: Partial<ParameterStep>) =>
        dispatch({ type: 'UPDATE_PARAMETER_STEP', payload: { index, step } }),

      deleteParameterStep: (index: number) =>
        dispatch({ type: 'DELETE_PARAMETER_STEP', payload: index }),

      addParameterField: (stepIndex: number, fieldName: string, field: FieldDefinition) =>
        dispatch({ type: 'ADD_PARAMETER_FIELD', payload: { stepIndex, fieldName, field } }),

      updateParameterField: (stepIndex: number, fieldName: string, updates: Partial<FieldDefinition>) =>
        dispatch({ type: 'UPDATE_PARAMETER_FIELD', payload: { stepIndex, fieldName, updates } }),

      deleteParameterField: (stepIndex: number, fieldName: string) =>
        dispatch({ type: 'DELETE_PARAMETER_FIELD', payload: { stepIndex, fieldName } }),

      reorderParameterFields: (stepIndex: number, fromIndex: number, toIndex: number) =>
        dispatch({ type: 'REORDER_PARAMETER_FIELDS', payload: { stepIndex, fromIndex, toIndex } }),

      addWorkflowNode: (node: WorkflowNode) =>
        dispatch({ type: 'ADD_WORKFLOW_NODE', payload: node }),

      updateWorkflowNode: (nodeId: string, updates: Partial<WorkflowNode>) =>
        dispatch({ type: 'UPDATE_WORKFLOW_NODE', payload: { nodeId, updates } }),

      updateNodeInputs: (nodeId: string, inputs: Record<string, any>) =>
        dispatch({ type: 'UPDATE_NODE_INPUTS', payload: { nodeId, inputs } }),

      deleteWorkflowNode: (nodeId: string) =>
        dispatch({ type: 'DELETE_WORKFLOW_NODE', payload: nodeId }),

      setWorkflowNodes: (nodes: WorkflowNode[]) =>
        dispatch({ type: 'SET_WORKFLOW_NODES', payload: nodes }),

      addWorkflowEdge: (edge: WorkflowEdge) =>
        dispatch({ type: 'ADD_WORKFLOW_EDGE', payload: edge }),

      deleteWorkflowEdge: (edgeId: string) =>
        dispatch({ type: 'DELETE_WORKFLOW_EDGE', payload: edgeId }),

      setWorkflowEdges: (edges: WorkflowEdge[]) =>
        dispatch({ type: 'SET_WORKFLOW_EDGES', payload: edges }),

      updateOutput: (output: Partial<TemplateBuilderState['output']>) =>
        dispatch({ type: 'UPDATE_OUTPUT', payload: output }),

      undo: () => dispatch({ type: 'UNDO' }),
      redo: () => dispatch({ type: 'REDO' }),
    }),
    []
  );

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return {
    state,
    actions,
    canUndo,
    canRedo,
  };
}
