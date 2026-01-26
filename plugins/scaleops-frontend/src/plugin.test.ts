import { scaleopsPlugin, ScaleopsCard, ScaleOpsDashboard } from './plugin';

describe('scaleopsPlugin', () => {
  it('should be defined', () => {
    expect(scaleopsPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(scaleopsPlugin.getId()).toBe('scaleops');
  });

  it('should export ScaleopsCard extension', () => {
    expect(ScaleopsCard).toBeDefined();
  });

  it('should export ScaleOpsDashboard extension', () => {
    expect(ScaleOpsDashboard).toBeDefined();
  });
});

