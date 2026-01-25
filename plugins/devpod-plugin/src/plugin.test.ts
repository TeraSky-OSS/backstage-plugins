import { devpodPlugin, DevpodProvider, DevpodComponent } from './plugin';

describe('devpodPlugin', () => {
  it('should be defined', () => {
    expect(devpodPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(devpodPlugin.getId()).toBe('backstage-plugin-devpod');
  });

  it('should export DevpodProvider extension', () => {
    expect(DevpodProvider).toBeDefined();
  });

  it('should export DevpodComponent extension', () => {
    expect(DevpodComponent).toBeDefined();
  });
});

