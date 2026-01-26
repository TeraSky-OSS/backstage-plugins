import { GitOpsManifestUpdaterSchema, GitOpsManifestUpdaterFieldSchema } from './GitOpsManifestUpdaterSchema';

describe('GitOpsManifestUpdaterSchema', () => {
  it('should be defined', () => {
    expect(GitOpsManifestUpdaterSchema).toBeDefined();
  });

  it('should be a valid schema object', () => {
    expect(typeof GitOpsManifestUpdaterSchema).toBe('object');
  });

  it('should have uiSchema property', () => {
    expect(GitOpsManifestUpdaterSchema).toHaveProperty('uiSchema');
  });

  it('should have schema property', () => {
    expect(GitOpsManifestUpdaterSchema).toHaveProperty('schema');
  });

  it('should have returnValue property', () => {
    expect(GitOpsManifestUpdaterSchema).toHaveProperty('returnValue');
  });

  it('should have correct ui:field', () => {
    expect(GitOpsManifestUpdaterSchema.uiSchema['ui:field']).toBe('GitOpsManifestUpdater');
  });
});

describe('GitOpsManifestUpdaterFieldSchema', () => {
  it('should be defined', () => {
    expect(GitOpsManifestUpdaterFieldSchema).toBeDefined();
  });
});
