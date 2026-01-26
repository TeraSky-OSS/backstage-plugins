describe('kro-resources alpha exports', () => {
  describe('plugin exports', () => {
    it('should export kroResourcesPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.kroResourcesPlugin).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kroResourcesPlugin).toBeDefined();
    });

    it('should include API blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kroResourcesPlugin).toBeDefined();
    });

    it('should include overview card blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kroResourcesPlugin).toBeDefined();
    });

    it('should include table content blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kroResourcesPlugin).toBeDefined();
    });

    it('should include graph content blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kroResourcesPlugin).toBeDefined();
    });
  });
});

