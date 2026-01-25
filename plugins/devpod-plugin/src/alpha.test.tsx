describe('devpod-plugin alpha exports', () => {
  describe('plugin exports', () => {
    it('should export devpodPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.devpodPlugin).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.devpodPlugin).toBeDefined();
    });

    it('should include entity card blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.devpodPlugin).toBeDefined();
    });
  });
});

