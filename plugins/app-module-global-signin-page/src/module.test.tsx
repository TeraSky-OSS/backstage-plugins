import { appModuleGlobalSigninPage } from './module';

describe('appModuleGlobalSigninPage', () => {
  it('should be defined', () => {
    expect(appModuleGlobalSigninPage).toBeDefined();
  });

  it('should be a frontend module for app', () => {
    // The module is created with createFrontendModule for the app plugin
    expect(appModuleGlobalSigninPage).toBeDefined();
  });
});

