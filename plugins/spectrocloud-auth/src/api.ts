import { createApiRef } from '@backstage/core-plugin-api';
import type {
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
} from '@backstage/core-plugin-api';

/**
 * API reference for SpectroCloud authentication.
 *
 * This API provides OIDC authentication capabilities for SpectroCloud,
 * including user profile information, Backstage identity, and session management.
 *
 * @public
 */
export const spectroCloudAuthApiRef = createApiRef<
  OpenIdConnectApi & ProfileInfoApi & BackstageIdentityApi & SessionApi
>({
  id: 'auth.spectrocloud',
});
