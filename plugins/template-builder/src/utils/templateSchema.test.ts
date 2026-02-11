import { generateTemplateSchema } from './templateSchema';

describe('templateSchema', () => {
  describe('generateTemplateSchema', () => {
    it('should generate schema with action IDs', () => {
      const actions: any[] = [
        {
          id: 'fetch:template',
          name: 'Fetch Template',
          description: 'Fetch template',
          category: 'fetch',
          schema: {
            input: {
              properties: {
                url: { type: 'string' },
              },
            },
          },
        },
        {
          id: 'publish:github',
          name: 'Publish to GitHub',
          description: 'Publish to GitHub',
          category: 'publish',
          schema: {
            input: {
              properties: {
                repoUrl: { type: 'string' },
              },
            },
          },
        },
      ];

      const schema = generateTemplateSchema(actions);

      expect(schema).toHaveProperty('$schema');
      expect(schema).toHaveProperty('properties');
      expect(schema.properties.apiVersion.const).toBe('scaffolder.backstage.io/v1beta3');
      expect(schema.properties.kind.const).toBe('Template');
    });

    it('should handle empty actions array', () => {
      const schema = generateTemplateSchema([]);

      expect(schema).toHaveProperty('$schema');
      expect(schema).toHaveProperty('properties');
    });

    it('should include metadata schema', () => {
      const schema = generateTemplateSchema([]);

      expect(schema.properties.metadata).toBeDefined();
      expect(schema.properties.metadata.properties.name).toBeDefined();
      expect(schema.properties.metadata.properties.title).toBeDefined();
    });
  });
});
