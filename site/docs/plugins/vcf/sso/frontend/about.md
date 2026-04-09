# VCF SSO Authentication Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcfsso-auth/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcfsso-auth) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-vcfsso-auth)

## Overview

The VCF SSO authentication frontend plugin provides the OAuth2 client implementation for VCF SSO OIDC authentication in Backstage. It creates the necessary API reference and OAuth2 client that enable sign-in functionality and session management when using VCF (VMware Cloud Foundation) SSO as the identity provider.

## Features

### OAuth2 Client
- Standard OAuth2 authorization code flow
- OIDC-compliant authentication
- Automatic token management
- Session persistence

### API Integration
The plugin provides `vcfSsoAuthApiRef` which implements:
- **OpenIdConnectApi** — OIDC operations (signIn, getIdToken, etc.)
- **ProfileInfoApi** — User profile information
- **BackstageIdentityApi** — Backstage identity token
- **SessionApi** — Session management

### Sign-In Integration
- Compatible with Backstage sign-in pages
- Works with the [Global Sign-In Page Module](../../../signin-page/overview.md)
- Fullscreen popup for authentication
- Automatic redirect handling

## Technical Architecture

### Plugin Structure
The plugin is a frontend plugin that exports:
- `vcfSsoAuthApiRef` — API reference for VCF SSO authentication
- `vcfSsoAuthApi` — API Blueprint implementation
- `vcfSsoAuthPlugin` — Frontend plugin instance

### API Blueprint
Uses Backstage's new frontend system with `ApiBlueprint.make`:

```typescript
ApiBlueprint.make({
  api: vcfSsoAuthApiRef,
  deps: {
    configApi: configApiRef,
    discoveryApi: discoveryApiRef,
    oauthRequestApi: oauthRequestApiRef,
  },
  factory: ({ configApi, discoveryApi, oauthRequestApi }) =>
    OAuth2.create({
      provider: { id: 'vcfsso', title: 'VCF SSO' },
      defaultScopes: ['openid', 'profile', 'email'],
      popupOptions: { size: { fullscreen: true } },
      // ...
    })
})
```

### Auto-Discovery
The plugin is automatically discovered by Backstage when:
- The package is installed in `packages/app`
- It is listed in `package.json` dependencies
- It is exported as default from the plugin module

No manual wiring in `App.tsx` required.

## Integration Points

### Sign-In Page
Works with:
- Global Sign-In Page Module (`@terasky/backstage-plugin-app-module-global-signin-page`)
- Custom sign-in pages using the `SignInPage` component

### Backend Module
Requires the backend authentication module:
- `@terasky/backstage-plugin-vcfsso-auth-backend`

## Components

### vcfSsoAuthApiRef
The main API reference for VCF SSO authentication:

```typescript
import { vcfSsoAuthApiRef } from '@terasky/backstage-plugin-vcfsso-auth';
import { useApi } from '@backstage/core-plugin-api';

function MyComponent() {
  const authApi = useApi(vcfSsoAuthApiRef);

  // Sign in
  await authApi.signIn();

  // Get user profile
  const profile = await authApi.getProfile();

  // Get Backstage identity
  const identity = await authApi.getBackstageIdentity();
}
```

### Available Methods

#### Authentication
- `signIn()` — Initiate sign-in flow
- `signOut()` — Sign out user
- `getBackstageIdentity()` — Get Backstage identity with token

#### Profile
- `getProfile()` — Get user profile (email, name, picture)

#### OIDC
- `getIdToken()` — Get OIDC ID token

#### Session
- `sessionState$()` — Observable of session state

## Use Cases

### Sign-In Page Integration
Enable VCF SSO as a sign-in option via the Global Sign-In Page module:

```yaml
signinPage:
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO
      message: Sign in using your VCF SSO account
```

### Custom Sign-In Page
Use the API reference directly in a custom sign-in page:

```typescript
const providers = [
  {
    id: 'vcf-sso-auth-provider',
    title: 'VCF SSO',
    message: 'Sign in using VCF SSO',
    apiRef: vcfSsoAuthApiRef,
  },
];
```

## Troubleshooting

### Common Issues

**1. Sign-In Popup Blocked**
- Allow popups for your Backstage domain
- Check browser popup blocker settings

**2. Authentication Loop**
- Clear browser cookies
- Check callback URL configuration in the backend module
- Verify backend module is running

**3. Token Not Available**
- Ensure the backend module is configured correctly
- Check backend logs for auth errors
- Verify sign-in resolver is working

## Next Steps

- [Install Frontend Plugin](./install.md)
- [Configure Frontend Plugin](./configure.md)
- [Install Backend Module](../backend/install.md)
