import {
  createFrontendModule,
  ApiBlueprint,
  microsoftAuthApiRef,
  googleAuthApiRef,
} from '@backstage/frontend-plugin-api';
import {
  KubernetesAuthProviders,
  kubernetesAuthProvidersApiRef,
} from '@backstage/plugin-kubernetes-react';
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

/**
 * Custom Kubernetes auth providers that includes SpectroCloud OIDC.
 *
 * This replaces the default Kubernetes auth providers to add SpectroCloud
 * as an OIDC provider alongside Microsoft and Google.
 */
const kubernetesAuthProvidersExtension = ApiBlueprint.make({
  name: 'kubernetes-auth-providers-with-spectrocloud',
  params: defineParams =>
    defineParams({
      api: kubernetesAuthProvidersApiRef,
      deps: {
        microsoftAuthApi: microsoftAuthApiRef,
        googleAuthApi: googleAuthApiRef,
        spectroCloudAuthApi: spectroCloudAuthApiRef,
      },
      factory: ({ microsoftAuthApi, googleAuthApi, spectroCloudAuthApi }) => {
        return new KubernetesAuthProviders({
          microsoftAuthApi,
          googleAuthApi,
          oidcProviders: {
            spectrocloud: spectroCloudAuthApi,
          },
        });
      },
    }),
});

/**
 * Frontend module that configures Kubernetes authentication with SpectroCloud.
 *
 * This module extends the kubernetes plugin to add SpectroCloud OIDC support.
 * 
 * @alpha
 */
export default createFrontendModule({
  pluginId: 'kubernetes',
  extensions: [kubernetesAuthProvidersExtension],
});
