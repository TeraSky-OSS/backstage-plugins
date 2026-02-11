import { stateToYAML, yamlToState } from './templateSerializer';
import type { TemplateBuilderState } from '../types';

describe('templateSerializer', () => {
  const sampleState: TemplateBuilderState = {
    metadata: {
      name: 'test-template',
      title: 'Test Template',
      description: 'A test template',
      tags: ['test', 'example'],
    },
    parameters: [
      {
        id: 'step-1',
        title: 'Basic Information',
        properties: {
          name: {
            title: 'Name',
            type: 'string',
            description: 'The name of the component',
          },
          description: {
            title: 'Description',
            type: 'string',
          },
        },
        required: ['name'],
      },
    ],
    workflow: {
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 250, y: 50 },
          data: { type: 'start', label: 'Start' },
        },
        {
          id: 'fetch',
          type: 'action',
          position: { x: 250, y: 150 },
          data: {
            type: 'action',
            actionId: 'fetch:template',
            name: 'Fetch Template',
            inputs: {
              url: './skeleton',
              values: {
                name: '${{ parameters.name }}',
              },
            },
          },
        },
      ],
      edges: [
        {
          id: 'e-start-fetch',
          source: 'start',
          target: 'fetch',
        },
      ],
    },
    output: {
      links: [
        {
          title: 'Repository',
          url: '${{ steps.publish.output.remoteUrl }}',
        },
      ],
    },
  };

  describe('stateToYAML', () => {
    it('should convert state to valid YAML', () => {
      const yaml = stateToYAML(sampleState);
      
      expect(yaml).toContain('apiVersion: scaffolder.backstage.io/v1beta3');
      expect(yaml).toContain('kind: Template');
      expect(yaml).toContain('name: test-template');
      expect(yaml).toContain('title: Test Template');
    });

    it('should include all parameters', () => {
      const yaml = stateToYAML(sampleState);
      
      expect(yaml).toContain('parameters:');
      expect(yaml).toContain('Basic Information');
      expect(yaml).toContain('name:');
      expect(yaml).toContain('required:');
    });

    it('should include all steps', () => {
      const yaml = stateToYAML(sampleState);
      
      expect(yaml).toContain('steps:');
      expect(yaml).toContain('fetch:template');
      expect(yaml).toContain('Fetch Template');
    });

    it('should preserve expressions', () => {
      const yaml = stateToYAML(sampleState);
      
      expect(yaml).toContain('${{ parameters.name }}');
      expect(yaml).toContain('${{ steps.publish.output.remoteUrl }}');
    });
  });

  describe('yamlToState', () => {
    it('should parse valid template YAML', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
  title: Test Template
  description: A test template
spec:
  owner: user:default/guest
  type: service
  parameters:
    - title: Basic Information
      properties:
        name:
          title: Name
          type: string
      required:
        - name
  steps:
    - id: fetch
      name: Fetch Template
      action: fetch:template
      input:
        url: ./skeleton
`;
      
      const state = yamlToState(yaml);
      
      expect(state.metadata.name).toBe('test-template');
      expect(state.metadata.title).toBe('Test Template');
      expect(state.parameters).toHaveLength(1);
      expect(state.parameters[0].title).toBe('Basic Information');
      expect(state.workflow.nodes).toHaveLength(1); // 1 action node
    });

    it('should throw on invalid YAML', () => {
      const invalidYaml = 'invalid: yaml: content:';
      
      expect(() => yamlToState(invalidYaml)).toThrow();
    });

    it('should throw on invalid apiVersion', () => {
      const yaml = `
apiVersion: invalid/v1
kind: Template
metadata:
  name: test
  title: Test
spec:
  parameters: []
  steps: []
`;
      
      expect(() => yamlToState(yaml)).toThrow('Invalid template apiVersion');
    });

    it('should throw on invalid kind', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Component
metadata:
  name: test
  title: Test
spec:
  parameters: []
  steps: []
`;
      
      expect(() => yamlToState(yaml)).toThrow('Invalid template kind');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve state through YAML conversion', () => {
      const yaml = stateToYAML(sampleState);
      const restoredState = yamlToState(yaml);
      
      expect(restoredState.metadata.name).toBe(sampleState.metadata.name);
      expect(restoredState.metadata.title).toBe(sampleState.metadata.title);
      expect(restoredState.parameters).toHaveLength(sampleState.parameters.length);
      expect(restoredState.workflow.nodes.filter(n => n.type === 'action')).toHaveLength(
        sampleState.workflow.nodes.filter(n => n.type === 'action').length
      );
    });
  });
});
