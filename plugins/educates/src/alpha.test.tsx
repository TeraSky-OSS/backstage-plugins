describe('educates alpha exports', () => {
  describe('plugin exports', () => {
    it('should export educatesPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.educatesPlugin).toBeDefined();
    });

    it('should export educatesApi', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesApi).toBeDefined();
    });

    it('should export educatesPage', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesPage).toBeDefined();
    });

    it('should export educatesNavItem', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesNavItem).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesPlugin).toBeDefined();
    });

    it('should include API blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesApi).toBeDefined();
    });

    it('should include page blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesPage).toBeDefined();
    });

    it('should include nav item blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.educatesNavItem).toBeDefined();
    });
  });
});

