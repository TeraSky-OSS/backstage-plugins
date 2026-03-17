import { createApiRef } from '@backstage/core-plugin-api';
import type {
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
} from '@backstage/core-plugin-api';

export type VcfSsoAuthApi = OpenIdConnectApi &
  ProfileInfoApi &
  BackstageIdentityApi &
  SessionApi;

export const vcfSsoAuthApiRef = createApiRef<VcfSsoAuthApi>({
  id: 'auth.vcfsso',
});
