import { validateConnection, autoLayoutNodes } from './ConnectionValidator';
import type { WorkflowNode, WorkflowEdge } from '../../types';

describe('ConnectionValidator', () => {
  describe('validateConnection', () => {
    const nodes: WorkflowNode[] = [
      {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { type: 'start', label: 'Start' },
      },
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

    it('should reject self-connections', () => {
      const result = validateConnection('action1', 'action1', nodes, []);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('itself');
    });

    it('should reject duplicate connections', () => {
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'action1', target: 'action2' },
      ];
      
      const result = validateConnection('action1', 'action2', nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should reject connections that would create cycles', () => {
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'action1', target: 'action2' },
      ];
      
      const result = validateConnection('action2', 'action1', nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cycle');
    });

    it('should reject multiple inputs to same target', () => {
      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'start', target: 'action1' },
      ];
      
      const result = validateConnection('action2', 'action1', nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('already has an input');
    });

    it('should allow valid connections', () => {
      const result = validateConnection('action1', 'action2', nodes, []);
      expect(result.valid).toBe(true);
    });
  });

  describe('autoLayoutNodes', () => {
    it('should layout nodes vertically', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'start',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { type: 'start', label: 'Start' },
        },
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
      ];

      const layouted = autoLayoutNodes(nodes);

      expect(layouted[0].position.x).toBe(250);
      expect(layouted[0].position.y).toBe(50);
      expect(layouted[1].position.y).toBeGreaterThan(layouted[0].position.y);
    });
  });
});
