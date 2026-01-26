import { aiRulesPlugin, AIRulesComponent, MCPServersComponent, AiInstructionsComponent } from './plugin';

describe('aiRulesPlugin', () => {
  it('should be defined', () => {
    expect(aiRulesPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(aiRulesPlugin.getId()).toBe('ai-rules');
  });

  it('should export AIRulesComponent extension', () => {
    expect(AIRulesComponent).toBeDefined();
  });

  it('should export MCPServersComponent extension', () => {
    expect(MCPServersComponent).toBeDefined();
  });

  it('should export AiInstructionsComponent extension', () => {
    expect(AiInstructionsComponent).toBeDefined();
  });
});

