import { validateYAML } from './YAMLValidator';

describe('YAMLValidator', () => {
  describe('validateYAML', () => {
    it('should validate correct YAML syntax', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test
  title: Test
spec:
  parameters: []
  steps:
    - id: test
      action: test
`;
      const errors = validateYAML(yaml);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid YAML syntax', () => {
      const yaml = `
name: test
  invalid indentation
value: 123
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].severity).toBe('error');
    });

    it('should handle empty YAML', () => {
      const errors = validateYAML('');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('template validation', () => {
    const validTemplate = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
  title: Test Template
spec:
  owner: user:default/guest
  type: service
  parameters:
    - title: Info
      properties:
        name:
          title: Name
          type: string
  steps:
    - id: fetch
      name: Fetch
      action: fetch:template
      input:
        url: ./skeleton
`;

    it('should validate correct template structure', () => {
      const errors = validateYAML(validTemplate);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing apiVersion', () => {
      const yaml = `
kind: Template
metadata:
  name: test
spec:
  parameters: []
  steps: []
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('apiversion'))).toBe(true);
    });

    it('should detect incorrect apiVersion', () => {
      const yaml = `
apiVersion: invalid/v1
kind: Template
metadata:
  name: test
spec:
  parameters: []
  steps: []
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('apiversion'))).toBe(true);
    });

    it('should detect missing kind', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
metadata:
  name: test
spec:
  parameters: []
  steps: []
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('kind'))).toBe(true);
    });

    it('should detect incorrect kind', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Component
metadata:
  name: test
spec:
  parameters: []
  steps: []
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('kind'))).toBe(true);
    });

    it('should detect missing metadata', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
spec:
  parameters: []
  steps: []
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('metadata'))).toBe(true);
    });

    it('should detect missing name in metadata', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  title: Test
spec:
  parameters: []
  steps:
    - id: test
      action: test
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('name'))).toBe(true);
    });

    it('should detect missing spec', () => {
      const yaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test
  title: Test
`;
      const errors = validateYAML(yaml);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.toLowerCase().includes('spec'))).toBe(true);
    });
  });
});
