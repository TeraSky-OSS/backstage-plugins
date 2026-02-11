import { validateTemplate } from './templateValidator';
import type { TemplateBuilderState } from '../types';

describe('templateValidator', () => {
  const validState: TemplateBuilderState = {
    metadata: {
      name: 'test-template',
      title: 'Test Template',
      description: 'A test',
      tags: [],
    },
    parameters: [
      {
        id: 'step1',
        title: 'Info',
        properties: {
          name: { title: 'Name', type: 'string' },
        },
        required: ['name'],
      },
    ],
    workflow: {
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 0, y: 0 },
          data: {
            type: 'start',
            label: 'Start',
          },
        },
        {
          id: 'action1',
          type: 'action',
          position: { x: 0, y: 100 },
          data: {
            type: 'action',
            actionId: 'fetch:template',
            name: 'Fetch',
            inputs: {},
          },
        },
      ],
      edges: [
        {
          id: 'e-start-action1',
          source: 'start',
          target: 'action1',
        },
      ],
    },
    output: {
      links: [],
    },
  };

  it('should pass validation for valid template', () => {
    const errors = validateTemplate(validState);
    expect(errors).toHaveLength(0);
  });

  it('should fail when template name is missing', () => {
    const invalidState = {
      ...validState,
      metadata: { ...validState.metadata, name: '' },
    };

    const errors = validateTemplate(invalidState);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.toLowerCase().includes('name'))).toBe(true);
  });

  it('should fail when template title is missing', () => {
    const invalidState = {
      ...validState,
      metadata: { ...validState.metadata, title: '' },
    };

    const errors = validateTemplate(invalidState);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.toLowerCase().includes('title'))).toBe(true);
  });

  it('should warn when no parameters defined', () => {
    const invalidState = {
      ...validState,
      parameters: [],
    };

    const errors = validateTemplate(invalidState);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.toLowerCase().includes('parameter'))).toBe(true);
  });

  it('should fail when no steps defined', () => {
    const invalidState = {
      ...validState,
      workflow: { nodes: [], edges: [] },
    };

    const errors = validateTemplate(invalidState);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.toLowerCase().includes('step'))).toBe(true);
  });

  it('should validate action names', () => {
    const invalidState = {
      ...validState,
      workflow: {
        nodes: [
          {
            id: 'action1',
            type: 'action' as const,
            position: { x: 0, y: 0 },
            data: {
              type: 'action' as const,
              actionId: 'fetch:template',
              name: '',
              inputs: {},
            },
          },
        ],
        edges: [],
      },
    };

    const errors = validateTemplate(invalidState);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.message.toLowerCase().includes('name'))).toBe(true);
  });
});
