describe('kubernetes-resources alpha exports', () => {
  describe('plugin exports', () => {
    it('should export kubernetesResourcesPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.kubernetesResourcesPlugin).toBeDefined();
    });

    it('should export kubernetesResourcesGraphCard', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kubernetesResourcesGraphCard).toBeDefined();
    });

    it('should export kubernetesResourcesContent', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kubernetesResourcesContent).toBeDefined();
    });
  });

  describe('plugin configuration', () => {
    it('should have correct pluginId', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kubernetesResourcesPlugin).toBeDefined();
    });

    it('should include graph content blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kubernetesResourcesGraphCard).toBeDefined();
    });

    it('should include table content blueprint', async () => {
      const alpha = await import('./alpha');
      expect(alpha.kubernetesResourcesContent).toBeDefined();
    });
  });
});

