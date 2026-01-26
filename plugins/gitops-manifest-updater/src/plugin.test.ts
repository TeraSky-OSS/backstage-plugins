import { gitopsManifestUpdaterPlugin, GitOpsManifestUpdaterExtension } from './plugin';

describe('gitopsManifestUpdaterPlugin', () => {
  it('should be defined', () => {
    expect(gitopsManifestUpdaterPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(gitopsManifestUpdaterPlugin.getId()).toBe('gitops-manifest-updater');
  });

  it('should export GitOpsManifestUpdaterExtension', () => {
    expect(GitOpsManifestUpdaterExtension).toBeDefined();
  });
});

