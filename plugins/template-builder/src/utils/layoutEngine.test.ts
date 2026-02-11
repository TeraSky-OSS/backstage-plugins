import { 
  layoutNodes, 
  createParameterGroupNode, 
  createOutputGroupNode, 
  detectEdgesFromInputs 
} from './layoutEngine';
import type { WorkflowNode, ParameterStep } from '../types';

describe('layoutEngine', () => {
  describe('layoutNodes', () => {
    it('should layout nodes vertically by default', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'fetch:template',
            name: 'Fetch',
            inputs: {},
          },
        },
        {
          id: 'action2',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'publish:github',
            name: 'Publish',
            inputs: {},
          },
        },
      ];

      const layouted = layoutNodes(nodes, 'vertical');

      expect(layouted[0].position.x).toBe(400);
      expect(layouted[1].position.x).toBe(400);
      expect(layouted[1].position.y).toBeGreaterThan(layouted[0].position.y);
    });

    it('should layout nodes horizontally', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'fetch:template',
            name: 'Fetch',
            inputs: {},
          },
        },
        {
          id: 'action2',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'publish:github',
            name: 'Publish',
            inputs: {},
          },
        },
      ];

      const layouted = layoutNodes(nodes, 'horizontal');

      expect(layouted[1].position.x).toBeGreaterThan(layouted[0].position.x);
      expect(layouted[0].position.y).toBe(layouted[1].position.y);
    });

    it('should position parameter-group and output-group nodes correctly in vertical mode', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'parameter-group',
          type: 'parameter-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'parameter-group',
            parameters: [],
            totalUsageCount: 0,
          },
        },
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'test',
            name: 'Test',
            inputs: {},
          },
        },
        {
          id: 'output-group',
          type: 'output-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'output-group',
            outputs: [],
          },
        },
      ];

      const layouted = layoutNodes(nodes, 'vertical');

      const paramNode = layouted.find(n => n.type === 'parameter-group');
      const actionNode = layouted.find(n => n.type === 'action');
      const outputNode = layouted.find(n => n.type === 'output-group');

      expect(paramNode!.position.y).toBeLessThan(actionNode!.position.y);
      expect(actionNode!.position.y).toBeLessThan(outputNode!.position.y);
    });

    it('should position nodes horizontally left to right', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'parameter-group',
          type: 'parameter-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'parameter-group',
            parameters: [],
            totalUsageCount: 0,
          },
        },
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'test',
            name: 'Test',
            inputs: {},
          },
        },
        {
          id: 'output-group',
          type: 'output-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'output-group',
            outputs: [],
          },
        },
      ];

      const layouted = layoutNodes(nodes, 'horizontal');

      const paramNode = layouted.find(n => n.type === 'parameter-group');
      const actionNode = layouted.find(n => n.type === 'action');
      const outputNode = layouted.find(n => n.type === 'output-group');

      expect(paramNode!.position.x).toBeLessThan(actionNode!.position.x);
      expect(actionNode!.position.x).toBeLessThan(outputNode!.position.x);
    });
  });

  describe('createParameterGroupNode', () => {
    const parameters: ParameterStep[] = [
      {
        id: 'step1',
        title: 'Step 1',
        properties: {
          name: { title: 'Name', type: 'string' },
          email: { title: 'Email', type: 'string' },
        },
        required: [],
      },
    ];

    const actionNodes: WorkflowNode[] = [
      {
        id: 'action1',
        type: 'action',
        position: { x: 0, y: 0 },
        data: {
          type: 'action',
          actionId: 'test',
          name: 'Test',
          inputs: {
            userName: '${{ parameters.name }}',
            userEmail: '${{ parameters.email }}',
          },
        },
      },
    ];

    it('should create parameter group node with all parameters', () => {
      const node = createParameterGroupNode(parameters, actionNodes);

      expect(node).not.toBeNull();
      expect(node!.type).toBe('parameter-group');
      if (node && node.data.type === 'parameter-group') {
        expect(node.data.parameters).toHaveLength(2);
        expect(node.data.parameters[0].name).toBe('name');
        expect(node.data.parameters[1].name).toBe('email');
      }
    });

    it('should calculate usage count for each parameter', () => {
      const node = createParameterGroupNode(parameters, actionNodes);

      expect(node).not.toBeNull();
      if (node && node.data.type === 'parameter-group') {
        expect(node.data.parameters[0].usageCount).toBe(1);
        expect(node.data.parameters[1].usageCount).toBe(1);
        expect(node.data.totalUsageCount).toBe(2);
      }
    });

    it('should return null when no parameters', () => {
      const node = createParameterGroupNode([], actionNodes);

      expect(node).toBeNull();
    });

    it('should inject layoutDirection', () => {
      const node = createParameterGroupNode(parameters, actionNodes, 'horizontal');

      expect(node).not.toBeNull();
      if (node && node.data.type === 'parameter-group') {
        expect(node.data.layoutDirection).toBe('horizontal');
      }
    });
  });

  describe('createOutputGroupNode', () => {
    const templateOutput = {
      links: [
        {
          title: 'Repository',
          url: '${{ steps.publish.output.remoteUrl }}',
        },
        {
          title: 'Pull Request',
          url: '${{ steps["create-pr"].output.prUrl }}',
          if: '${{ parameters.createPR }}',
        },
      ],
    };

    it('should create output group node with all outputs', () => {
      const node = createOutputGroupNode(templateOutput, []);

      expect(node).not.toBeNull();
      expect(node!.type).toBe('output-group');
      if (node && node.data.type === 'output-group') {
        expect(node.data.outputs).toHaveLength(2);
        expect(node.data.outputs[0].title).toBe('Repository');
        expect(node.data.outputs[1].title).toBe('Pull Request');
      }
    });

    it('should extract step references from output URLs', () => {
      const node = createOutputGroupNode(templateOutput, []);

      expect(node).not.toBeNull();
      if (node && node.data.type === 'output-group') {
        expect(node.data.outputs[0].stepRefs).toContain('publish');
        expect(node.data.outputs[1].stepRefs).toContain('create-pr');
      }
    });

    it('should extract step references from if conditions', () => {
      const node = createOutputGroupNode(templateOutput, []);

      expect(node).not.toBeNull();
      if (node && node.data.type === 'output-group') {
        expect(node.data.outputs[1].stepRefs).toContain('create-pr');
      }
    });

    it('should return null when no outputs', () => {
      const node = createOutputGroupNode({ links: [] }, []);

      expect(node).toBeNull();
    });

    it('should inject layoutDirection', () => {
      const node = createOutputGroupNode(templateOutput, [], 'horizontal');

      expect(node).not.toBeNull();
      if (node && node.data.type === 'output-group') {
        expect(node.data.layoutDirection).toBe('horizontal');
      }
    });
  });

  describe('detectEdgesFromInputs', () => {
    it('should detect parameter references', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'param-group',
          type: 'parameter-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'parameter-group',
            parameters: [{ name: 'repoName', title: 'Repo Name', usageCount: 0 }],
            totalUsageCount: 0,
          },
        },
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'publish:github',
            name: 'Publish',
            inputs: {
              repo: '${{ parameters.repoName }}',
            },
          },
        },
      ];

      const edges = detectEdgesFromInputs(nodes);

      const paramEdge = edges.find(e => e.source === 'param-group' && e.target === 'action1');
      expect(paramEdge).toBeDefined();
      expect(paramEdge!.sourceHandle).toBe('param-repoName');
    });

    it('should detect full parameters object usage', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'param-group',
          type: 'parameter-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'parameter-group',
            parameters: [],
            totalUsageCount: 0,
          },
        },
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'custom:action',
            name: 'Custom',
            inputs: {
              data: '${{ parameters }}',
            },
          },
        },
      ];

      const edges = detectEdgesFromInputs(nodes);

      const allParamsEdge = edges.find(e => e.sourceHandle === 'all');
      expect(allParamsEdge).toBeDefined();
      expect(allParamsEdge!.style?.strokeDasharray).toBe('5,5');
    });

    it('should detect step-to-step connections', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'fetch',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'fetch:template',
            name: 'Fetch',
            inputs: {},
          },
        },
        {
          id: 'publish',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'publish:github',
            name: 'Publish',
            inputs: {
              sourcePath: '${{ steps.fetch.output.targetPath }}',
            },
          },
        },
      ];

      const edges = detectEdgesFromInputs(nodes);

      const stepEdge = edges.find(e => e.source === 'fetch' && e.target === 'publish');
      expect(stepEdge).toBeDefined();
      expect(stepEdge!.type).toBe('step');
    });

    it('should detect output connections', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'publish',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'publish:github',
            name: 'Publish',
            inputs: {},
          },
        },
        {
          id: 'output-group',
          type: 'output-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'output-group',
            outputs: [
              {
                title: 'Repository',
                url: '${{ steps.publish.output.remoteUrl }}',
                stepRefs: ['publish'],
              },
            ],
          },
        },
      ];

      const edges = detectEdgesFromInputs(nodes);

      const outputEdge = edges.find(e => e.source === 'publish' && e.target === 'output-group');
      expect(outputEdge).toBeDefined();
      expect(outputEdge!.style?.stroke).toBe('#4caf50');
    });

    it('should detect conditional steps', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'param-group',
          type: 'parameter-group',
          position: { x: 0, y: 0 },
          data: {
            type: 'parameter-group',
            parameters: [{ name: 'pushToGit', title: 'Push to Git', usageCount: 0 }],
            totalUsageCount: 0,
          },
        },
        {
          id: 'publish',
          type: 'action',
          position: { x: 0, y: 0 },
          data: {
            type: 'action',
            actionId: 'publish:github',
            name: 'Publish',
            inputs: {},
            if: '${{ parameters.pushToGit }}',
          },
        },
      ];

      const edges = detectEdgesFromInputs(nodes);

      const paramEdge = edges.find(e => e.source === 'param-group' && e.target === 'publish');
      expect(paramEdge).toBeDefined();
    });
  });
});
