import { SpringInitializerFieldSchema } from './SpringInitializerSchema';

describe('SpringInitializerFieldSchema', () => {
  it('should validate valid data', () => {
    const validData = {
      type: 'maven-project',
      language: 'java',
      bootVersion: '3.5.10',
      groupId: 'com.example',
      artifactId: 'demo',
    };

    const result = SpringInitializerFieldSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should allow optional fields', () => {
    const minimalData = {};

    const result = SpringInitializerFieldSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
  });
});
