import { terraformScaffolderPlugin, TerraformModuleExtension } from './plugin';

describe('terraformScaffolderPlugin', () => {
  it('should be defined', () => {
    expect(terraformScaffolderPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(terraformScaffolderPlugin.getId()).toBe('terraform-scaffolder');
  });

  it('should export TerraformModuleExtension', () => {
    expect(TerraformModuleExtension).toBeDefined();
  });
});

