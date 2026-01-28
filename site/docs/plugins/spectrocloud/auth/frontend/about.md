# SpectroCloud Authentication Frontend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-auth/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-auth)

## Overview

The SpectroCloud authentication frontend plugin provides the OAuth2 client implementation for SpectroCloud OIDC authentication in Backstage. It creates the necessary API references and OAuth2 client that enable sign-in functionality and session management.

## Features

### OAuth2 Client
- Standard OAuth2 authorization code flow
- OIDC-compliant authentication
- Automatic token management
- Session persistence

### API Integrations
The plugin provides `spectroCloudAuthApiRef` which implements:
- **OpenIdConnectApi** - OIDC operations (signIn, getIdToken, etc.)
- **ProfileInfoApi** - User profile information
- **BackstageIdentityApi** - Backstage identity token
- **SessionApi** - Session management

### Sign-In Integration
- Compatible with Backstage sign-in pages
- Works with global sign-in page module
- Fullscreen popup for authentication
- Automatic redirect handling

## Technical Architecture

### Plugin Structure
The plugin is a frontend plugin that exports:
- `spectroCloudAuthApiRef` - API reference for SpectroCloud auth
- `spectroCloudAuthApi` - API Blueprint implementation
- `spectroCloudAuthPlugin` - Frontend plugin instance

### API Blueprint
Uses Backstage's new frontend system with `ApiBlueprint.make`:
```typescript
ApiBlueprint.make({
  api: spectroCloudAuthApiRef,
  deps: {
    configApi: configApiRef,
    discoveryApi: discoveryApiRef,
    oauthRequestApi: oauthRequestApiRef,
  },
  factory: ({ configApi, discoveryApi, oauthRequestApi }) =>
    OAuth2.create({
      provider: { id: 'spectrocloud', title: 'SpectroCloud' },
      defaultScopes: ['openid', 'profile', 'email'],
      // ...
    })
})
```

### Auto-Discovery
The plugin is automatically discovered by Backstage when:
- Package is installed in `packages/app`
- Listed in `package.json` dependencies
- Exported as default from plugin module

No manual wiring in `App.tsx` required!

## Integration Points

### Sign-In Page
Works with:
- Global Sign-In Page Module (`@terasky/backstage-plugin-app-module-global-signin-page`)
- Custom sign-in pages using `SignInPage` component
- Backstage's default sign-in page

### Backend Module
Requires the backend authentication module:
- `@terasky/backstage-plugin-spectrocloud-auth-backend`

### Other Plugins
Can be used by any plugin that needs SpectroCloud authentication:
- Kubernetes plugin (via kubernetes-auth-module)
- Custom plugins requiring SpectroCloud identity

## Components

### spectroCloudAuthApiRef
The main API reference for SpectroCloud authentication:

```typescript
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';
import { useApi } from '@backstage/core-plugin-api';

function MyComponent() {
  const authApi = useApi(spectroCloudAuthApiRef);
  
  // Sign in
  await authApi.signIn();
  
  // Get user profile
  const profile = await authApi.getProfile();
  
  // Get ID token (for Kubernetes)
  const idToken = await authApi.getIdToken();
  
  // Get Backstage identity
  const identity = await authApi.getBackstageIdentity();
}
```

### Available Methods

#### Authentication
- `signIn()` - Initiate sign-in flow
- `signOut()` - Sign out user
- `getBackstageIdentity()` - Get Backstage identity with token

#### Profile
- `getProfile()` - Get user profile (email, name, picture)

#### OIDC
- `getIdToken()` - Get OIDC ID token (for Kubernetes auth)

#### Session
- `sessionState$()` - Observable of session state

## Use Cases

### Sign-In Page Integration
Enable SpectroCloud as a sign-in option:
```typescript
const providers = [
  {
    id: 'spectrocloud-auth-provider',
    title: 'SpectroCloud',
    message: 'Sign in using SpectroCloud',
    apiRef: spectroCloudAuthApiRef,
  },
];
```

### Kubernetes Authentication
The ID token from this API is used by the Kubernetes authentication module to access clusters.

### Custom Plugin Integration
Use SpectroCloud authentication in your own plugins:
```typescript
const authApi = useApi(spectroCloudAuthApiRef);
const identity = await authApi.getBackstageIdentity();
// Use identity.token for API calls
```

## Technical Details

### Token Storage
- Tokens stored in browser session storage
- Automatic expiration handling
- Refresh on token expiry
- Secure cookie-based session

### Popup Authentication
- Fullscreen popup for better UX on mobile
- Automatic popup closing on success
- Error handling and timeout

### Discovery
- Uses Backstage discovery API to find auth backend
- Automatic endpoint resolution
- Environment-aware configuration

## Troubleshooting

### Common Issues

**1. Sign-In Popup Blocked**
- Allow popups for your Backstage domain
- Check browser popup blocker settings

**2. Authentication Loop**
- Clear browser cookies
- Check callback URL configuration
- Verify backend module is running

**3. Token Not Available**
- Ensure backend module is configured correctly
- Check backend logs for auth errors
- Verify sign-in resolver is working

**4. Cannot Get ID Token**
- This is critical for Kubernetes auth
- Check backend token exchange is returning `id_token`
- Verify token is RS256 signed

## Best Practices

1. **Use Environment Variables** for sensitive configuration
2. **Test Authentication Flow** in development before production
3. **Configure Multiple Resolvers** for flexibility
4. **Monitor Session Expiration** and handle gracefully
5. **Use HTTPS in Production** for security

## Next Steps

- [Install Frontend Plugin](./install.md)
- [Configure Sign-In Page](./configure.md)
- [Install Kubernetes Auth Module](../kubernetes-module/install.md) (optional)
