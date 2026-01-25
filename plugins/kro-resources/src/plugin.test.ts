import { kroResourcesPlugin, KroResourceTable, KroResourceGraph, KroOverviewCard } from './plugin';

describe('kroResourcesPlugin', () => {
  it('should be defined', () => {
    expect(kroResourcesPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(kroResourcesPlugin.getId()).toBe('kro-resources');
  });

  it('should export KroResourceTable extension', () => {
    expect(KroResourceTable).toBeDefined();
  });

  it('should export KroResourceGraph extension', () => {
    expect(KroResourceGraph).toBeDefined();
  });

  it('should export KroOverviewCard extension', () => {
    expect(KroOverviewCard).toBeDefined();
  });
});

