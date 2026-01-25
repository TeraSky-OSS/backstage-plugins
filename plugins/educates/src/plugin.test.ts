import { educatesPlugin, EducatesPage } from './plugin';

describe('educatesPlugin', () => {
  it('should be defined', () => {
    expect(educatesPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(educatesPlugin.getId()).toBe('educates');
  });

  it('should export EducatesPage extension', () => {
    expect(EducatesPage).toBeDefined();
  });
});

