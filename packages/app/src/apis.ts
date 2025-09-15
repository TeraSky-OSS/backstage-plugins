import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import {
  vcfAutomationApiRef,
  VcfAutomationClient,
} from '@terasky/backstage-plugin-vcf-automation';
import {
  aiRulesApiRef,
  AiRulesClient,
} from '@terasky/backstage-plugin-ai-rules';
import {
  terraformScaffolderApiRef,
  TerraformScaffolderClient,
} from '@terasky/backstage-plugin-terraform-scaffolder';

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: vcfAutomationApiRef,
    deps: { discoveryApi: discoveryApiRef, identityApi: identityApiRef },
    factory: ({ discoveryApi, identityApi }) => new VcfAutomationClient({ discoveryApi, identityApi }),
  }),
  createApiFactory({
    api: aiRulesApiRef,
    deps: { discoveryApi: discoveryApiRef, identityApi: identityApiRef },
    factory: ({ discoveryApi, identityApi }) => {
      return new AiRulesClient({ discoveryApi, identityApi });
    },
  }),
  createApiFactory({
    api: terraformScaffolderApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => new TerraformScaffolderClient({ configApi }),
  }),
];