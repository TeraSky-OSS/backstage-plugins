import { terraformScaffolderApiRef, TerraformScaffolderClient } from './index';

describe('terraform-scaffolder api exports', () => {
  it('should export terraformScaffolderApiRef', () => {
    expect(terraformScaffolderApiRef).toBeDefined();
    expect(terraformScaffolderApiRef.id).toBe('plugin.terraform-scaffolder.service');
  });

  it('should export TerraformScaffolderClient', () => {
    expect(TerraformScaffolderClient).toBeDefined();
  });
});

