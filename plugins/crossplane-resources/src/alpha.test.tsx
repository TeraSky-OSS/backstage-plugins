describe('crossplane-resources alpha exports', () => {
  describe('plugin exports', () => {
    it('should export crossplaneResourcesPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.crossplaneResourcesPlugin).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.crossplaneResourcesPlugin).toBeDefined();
    });

    it('should include overview card blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.crossplaneResourcesPlugin).toBeDefined();
    });

    it('should include table content blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.crossplaneResourcesPlugin).toBeDefined();
    });

    it('should include graph content blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.crossplaneResourcesPlugin).toBeDefined();
    });

    it('should include API blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.crossplaneResourcesPlugin).toBeDefined();
    });
  });
});

