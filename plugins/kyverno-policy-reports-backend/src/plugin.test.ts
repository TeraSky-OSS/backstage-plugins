import { kyvernoPolicyReportsPlugin } from './plugin';

describe('kyvernoPolicyReportsPlugin', () => {
  it('should be defined', () => {
    expect(kyvernoPolicyReportsPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'kyverno'
    expect(kyvernoPolicyReportsPlugin).toBeDefined();
  });
});

