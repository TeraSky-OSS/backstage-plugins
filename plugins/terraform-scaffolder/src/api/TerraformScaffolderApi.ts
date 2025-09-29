import { createApiRef } from '@backstage/core-plugin-api';
import { TerraformModuleReference, TerraformVariable } from '../types';

export interface TerraformScaffolderApi {
  getModuleReferences(): Promise<TerraformModuleReference[]>;
  getModuleVariables(moduleRef: TerraformModuleReference, selectedVersion?: string): Promise<TerraformVariable[]>;
  getModuleVersions(moduleRef: TerraformModuleReference): Promise<string[]>;
}

export const terraformScaffolderApiRef = createApiRef<TerraformScaffolderApi>({
  id: 'plugin.terraform-scaffolder.service',
});
