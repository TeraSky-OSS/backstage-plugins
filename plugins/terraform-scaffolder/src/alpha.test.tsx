describe('terraform-scaffolder alpha exports', () => {
  describe('plugin exports', () => {
    it('should export terraformScaffolderPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.terraformScaffolderPlugin).toBeDefined();
    });

    it('should export terraformModuleExtension', async () => {
      const alpha = await import('./alpha');
      expect(alpha.terraformModuleExtension).toBeDefined();
    });

    it('should export terraformModuleApi', async () => {
      const alpha = await import('./alpha');
      expect(alpha.terraformModuleApi).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.terraformScaffolderPlugin).toBeDefined();
    });

    it('should include form field extension', async () => {
      const alpha = await import('./alpha');
      expect(alpha.terraformModuleExtension).toBeDefined();
    });

    it('should include API blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.terraformModuleApi).toBeDefined();
    });
  });
});

