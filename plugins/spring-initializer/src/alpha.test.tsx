import { springInitializerPlugin, springInitializerExtension } from './alpha';

describe('alpha exports', () => {
  it('should export springInitializerPlugin', () => {
    expect(springInitializerPlugin).toBeDefined();
  });

  it('should export springInitializerExtension', () => {
    expect(springInitializerExtension).toBeDefined();
  });
});
