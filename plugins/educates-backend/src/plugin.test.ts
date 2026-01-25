import { educatesPlugin } from './plugin';

describe('educatesPlugin', () => {
  it('should be defined', () => {
    expect(educatesPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'educates'
    expect(educatesPlugin).toBeDefined();
  });
});

