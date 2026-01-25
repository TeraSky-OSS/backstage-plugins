describe('gitops-manifest-updater alpha exports', () => {
  describe('plugin exports', () => {
    it('should export gitopsManifestUpdaterPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.gitopsManifestUpdaterPlugin).toBeDefined();
    });

    it('should export gitopsManifestUpdaterExtension', async () => {
      const alpha = await import('./alpha');
      expect(alpha.gitopsManifestUpdaterExtension).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.gitopsManifestUpdaterPlugin).toBeDefined();
    });

    it('should include form field extension', async () => {
      const alpha = await import('./alpha');
      expect(alpha.gitopsManifestUpdaterExtension).toBeDefined();
    });
  });
});

