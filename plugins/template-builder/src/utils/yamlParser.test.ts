import { parseYAML, formatYAML } from './yamlParser';

describe('yamlParser', () => {
  describe('parseYAML', () => {
    it('should parse valid YAML', () => {
      const yaml = 'name: test\nvalue: 123';
      const result = parseYAML(yaml);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveProperty('name', 'test');
      expect(result.data).toHaveProperty('value', 123);
    });

    it('should parse nested structures', () => {
      const yaml = 'parent:\n  child: value';
      const result = parseYAML(yaml);

      expect(result.valid).toBe(true);
      expect(result.data.parent).toHaveProperty('child', 'value');
    });

    it('should parse arrays', () => {
      const yaml = 'items:\n  - first\n  - second';
      const result = parseYAML(yaml);

      expect(result.valid).toBe(true);
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    it('should preserve template expressions', () => {
      const yaml = 'param: ${{ parameters.name }}';
      const result = parseYAML(yaml);

      expect(result.valid).toBe(true);
      expect(result.data.param).toBe('${{ parameters.name }}');
    });

    it('should handle invalid YAML', () => {
      const invalidYaml = 'invalid: : : yaml';
      const result = parseYAML(invalidYaml);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty YAML', () => {
      const yaml = '';
      const result = parseYAML(yaml);

      expect(result).toBeDefined();
    });
  });

  describe('formatYAML', () => {
    it('should format simple YAML', () => {
      const yaml = 'name: test';
      const formatted = formatYAML(yaml);

      expect(formatted).toContain('name');
      expect(formatted).toContain('test');
    });

    it('should format nested structures', () => {
      const yaml = 'parent:\n  child: value';
      const formatted = formatYAML(yaml);

      expect(formatted).toContain('parent');
      expect(formatted).toContain('child');
    });

    it('should handle objects', () => {
      const yaml = 'config:\n  enabled: true\n  count: 5';
      const formatted = formatYAML(yaml);

      expect(formatted).toContain('config');
      expect(formatted).toContain('enabled');
    });

    it('should return original on invalid YAML', () => {
      const invalidYaml = 'invalid: : : yaml';
      const result = formatYAML(invalidYaml);

      expect(result).toBe(invalidYaml);
    });
  });
});
