import { createApiRef } from '@backstage/core-plugin-api';
import type {
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
} from '@backstage/core-plugin-api';

/**
 * Custom API interface for SpectroCloud that extends standard OAuth APIs
 * with a method to retrieve the Spectro Cloud API token (HS256 session token).
 *
 * @public
 */
export interface SpectroCloudAuthApi extends OpenIdConnectApi, ProfileInfoApi, BackstageIdentityApi, SessionApi {
  /**
   * Get the Spectro Cloud API token (HS256 session token) for making API calls.
   * This is different from the OIDC ID token (RS256) used for authentication.
   *
   * @returns Promise resolving to the Spectro Cloud API token, or undefined if not available
   */
  getSpectroCloudApiToken(): Promise<string | undefined>;
}

/**
 * API reference for SpectroCloud authentication.
 *
 * This API provides OIDC authentication capabilities for SpectroCloud,
 * including user profile information, Backstage identity, and session management,
 * plus a custom method to retrieve the Spectro Cloud API token.
 *
 * @public
 */
export const spectroCloudAuthApiRef = createApiRef<SpectroCloudAuthApi>({
  id: 'auth.spectrocloud',
});
