import { appModuleGlobalSigninPage } from './module';

describe('appModuleGlobalSigninPage', () => {
  it('should be defined', () => {
    expect(appModuleGlobalSigninPage).toBeDefined();
  });

  it('should be a valid frontend module', () => {
    expect(appModuleGlobalSigninPage).toHaveProperty('$$type');
  });
});

describe('providerDefaults', () => {
  it('should export module correctly', () => {
    // The module exports a frontend module for sign-in
    expect(typeof appModuleGlobalSigninPage).toBe('object');
  });
});
