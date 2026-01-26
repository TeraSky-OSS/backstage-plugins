describe('ai-rules-plugin alpha exports', () => {
  describe('plugin exports', () => {
    it('should export aiRulesPlugin as default', async () => {
      const alpha = await import('./alpha');
      expect(alpha.default).toBeDefined();
      expect(alpha.aiRulesPlugin).toBeDefined();
    });
  });

  describe('entity content blueprints', () => {
    it('should define aiRules content blueprint', async () => {
      const alpha = await import('./alpha');
      const plugin = alpha.aiRulesPlugin;
      expect(plugin).toBeDefined();
    });

    it('should define aiInstructions content blueprint', async () => {
      const alpha = await import('./alpha');
      const plugin = alpha.aiRulesPlugin;
      expect(plugin).toBeDefined();
    });

    it('should define mcpServers content blueprint', async () => {
      const alpha = await import('./alpha');
      const plugin = alpha.aiRulesPlugin;
      expect(plugin).toBeDefined();
    });

    it('should define aiRulesApi blueprint', async () => {
      const alpha = await import('./alpha');
      const plugin = alpha.aiRulesPlugin;
      expect(plugin).toBeDefined();
    });
  });
});

