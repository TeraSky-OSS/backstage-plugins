import { createApiRef } from '@backstage/core-plugin-api';
import { TerraformScaffolderClient } from './TerraformScaffolderClient';

export const terraformScaffolderApiRef = createApiRef<TerraformScaffolderClient>({
  id: 'plugin.terraform-scaffolder.service',
});

export { TerraformScaffolderClient } from './TerraformScaffolderClient';

