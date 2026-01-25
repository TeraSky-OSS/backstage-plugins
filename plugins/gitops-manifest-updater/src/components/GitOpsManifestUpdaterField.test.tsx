import { gitopsManifestUpdaterField } from './GitOpsManifestUpdaterField';

describe('GitOpsManifestUpdaterField', () => {
  it('should be defined', () => {
    expect(gitopsManifestUpdaterField).toBeDefined();
  });

  it('should have extension type', () => {
    expect(gitopsManifestUpdaterField.kind).toBe('form-field');
  });
});

