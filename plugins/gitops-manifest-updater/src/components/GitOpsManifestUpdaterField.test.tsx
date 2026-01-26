import { gitopsManifestUpdaterField } from './GitOpsManifestUpdaterField';

describe('GitOpsManifestUpdaterField', () => {
  it('should be defined', () => {
    expect(gitopsManifestUpdaterField).toBeDefined();
  });

  it('should be an object with extension data', () => {
    expect(typeof gitopsManifestUpdaterField).toBe('object');
  });
});

