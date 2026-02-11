import { renderHook, act } from '@testing-library/react';
import { useTemplateState } from './useTemplateState';

describe('useTemplateState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTemplateState());

    expect(result.current.state.metadata.name).toBe('new-template');
    expect(result.current.state.metadata.title).toBe('New Template');
    expect(result.current.state.parameters).toHaveLength(1); // Has default parameter
    expect(result.current.state.workflow.nodes).toHaveLength(0);
  });

  it('should add a parameter', () => {
    const { result } = renderHook(() => useTemplateState());

    act(() => {
      result.current.actions.addParameterStep({
        id: 'step2',
        title: 'Basic Info',
        properties: {
          name: { title: 'Name', type: 'string' },
        },
        required: [],
      });
    });

    expect(result.current.state.parameters).toHaveLength(2); // Default + new one
    expect(result.current.state.parameters[1].title).toBe('Basic Info');
  });

  it('should update metadata', () => {
    const { result } = renderHook(() => useTemplateState());

    act(() => {
      result.current.actions.updateMetadata({
        name: 'my-template',
        title: 'My Template',
        description: 'Test description',
        tags: ['test'],
      });
    });

    expect(result.current.state.metadata.name).toBe('my-template');
    expect(result.current.state.metadata.title).toBe('My Template');
    expect(result.current.state.metadata.description).toBe('Test description');
  });

  it('should add a workflow node', () => {
    const { result } = renderHook(() => useTemplateState());

    const newNode = {
      id: 'action1',
      type: 'action' as const,
      position: { x: 100, y: 100 },
      data: {
        type: 'action' as const,
        actionId: 'fetch:template',
        name: 'Fetch',
        inputs: {},
      },
    };

    act(() => {
      result.current.actions.addWorkflowNode(newNode);
    });

    expect(result.current.state.workflow.nodes).toHaveLength(1);
    expect(result.current.state.workflow.nodes[0].id).toBe('action1');
  });

  it('should delete a workflow node', () => {
    const { result } = renderHook(() => useTemplateState());

    const newNode = {
      id: 'action1',
      type: 'action' as const,
      position: { x: 100, y: 100 },
      data: {
        type: 'action' as const,
        actionId: 'fetch:template',
        name: 'Fetch',
        inputs: {},
      },
    };

    act(() => {
      result.current.actions.addWorkflowNode(newNode);
    });

    expect(result.current.state.workflow.nodes).toHaveLength(1);

    act(() => {
      result.current.actions.deleteWorkflowNode('action1');
    });

    expect(result.current.state.workflow.nodes).toHaveLength(0);
  });

  it('should update node inputs', () => {
    const { result } = renderHook(() => useTemplateState());

    const newNode = {
      id: 'action1',
      type: 'action' as const,
      position: { x: 100, y: 100 },
      data: {
        type: 'action' as const,
        actionId: 'fetch:template',
        name: 'Fetch',
        inputs: {},
      },
    };

    act(() => {
      result.current.actions.addWorkflowNode(newNode);
    });

    act(() => {
      result.current.actions.updateNodeInputs('action1', {
        url: './skeleton',
        targetPath: './output',
      });
    });

    const node = result.current.state.workflow.nodes.find(n => n.id === 'action1');
    expect(node).toBeDefined();
    if (node && node.data.type === 'action') {
      expect(node.data.inputs.url).toBe('./skeleton');
      expect(node.data.inputs.targetPath).toBe('./output');
    }
  });

  it('should set entire state', () => {
    const { result } = renderHook(() => useTemplateState());

    const newState = {
      metadata: {
        name: 'imported-template',
        title: 'Imported Template',
        description: '',
        tags: [],
      },
      parameters: [],
      workflow: { nodes: [], edges: [] },
      output: { links: [] },
    };

    act(() => {
      result.current.actions.setState(newState);
    });

    expect(result.current.state.metadata.name).toBe('imported-template');
  });
});
