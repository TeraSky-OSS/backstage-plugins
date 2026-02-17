# SpectroCloud Authentication Backend Module

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-auth-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-auth-backend)

## Overview

The SpectroCloud authentication backend module provides OIDC (OpenID Connect) authentication integration with SpectroCloud Palette for Backstage. It implements the OAuth2 authorization code flow with dual token management: RS256 ID tokens for Backstage/Kubernetes authentication and HS256 session tokens for SpectroCloud API access. The module shares token state with the SpectroCloud backend plugin for user-scoped API operations.

## Features

### OIDC Authentication
- Standard OAuth2 authorization code flow
- Token exchange with client secret
- Nonce support for OIDC security
- PKCE-ready implementation

### Dual Token Management

The module handles two distinct token types from SpectroCloud:

**RS256 ID Token**:
- Used for Backstage user identity
- Used for Kubernetes OIDC authentication
- Standard OIDC ID token
- Returned in token exchange response

**HS256 Session Token**:
- Used for SpectroCloud Palette API calls
- SpectroCloud-specific session token
- May be provided as authorization code, refresh_token, or in cookies

### Token Cache

The module maintains a shared global in-memory token cache:

- **Storage**: Global `Map` keyed by user email
- **Shared with**: SpectroCloud backend plugin
- **Values**: `{ token: string, expiresAt: number }`
- **Purpose**: Enable user-scoped SpectroCloud API access
- **Expiration**: Automatic removal of expired tokens
- **Scope**: Process-local (not distributed)

### Cookie Management

After successful authentication:
- Sets `spectrocloud-api-token` cookie (1 hour TTL)
- Uses lax same-site policy
- Path: `/` for site-wide access
- Enables frontend token resolution

### User Profile

- JWT-based user profile extraction from ID token
- Email, given name, family name from claims
- Sub (subject) identifier for user resolution
- Compatible with standard Backstage profile

### Sign-In Resolvers

Compatible with all standard Backstage sign-in resolvers:
- Email matching user entity profile email
- Email local part matching user entity name
- Custom resolvers via configuration

## Technical Architecture

### Authentication Flow

1. **User initiates sign-in** with SpectroCloud
2. **Backend redirects** to SpectroCloud authorization endpoint with:
   - `response_type=code`
   - `scope=openid profile email`
   - `state` parameter (CSRF protection)
   - `nonce` parameter (replay protection)
3. **User authenticates** with SpectroCloud (may involve external IdP)
4. **SpectroCloud redirects** back with authorization code
5. **Backend exchanges code** for tokens:
   - Token endpoint derived from auth URL (replace `/auth` with `/token`)
   - Sends client ID, client secret, and authorization code
6. **Token response** contains:
   - `id_token`: RS256-signed OIDC ID token
   - `refresh_token` or code itself: HS256 session token
7. **HS256 token detection**:
   - Checks if authorization code is a JWT (HS256)
   - Falls back to `refresh_token` field
   - May be in cookies/headers
8. **HS256 token storage**:
   - Decodes token to extract email and expiration
   - Stores in global cache by user email
   - Makes available to backend plugin
9. **RS256 ID token processing**:
   - Decodes to extract user profile (email, name, sub)
   - Passes to sign-in resolver
10. **Sign-in resolver** matches user to Backstage entity
11. **Session created** with Backstage identity
12. **Cookie set** with HS256 token for frontend

### Token Types

| Token Type | Algorithm | Source | Use | Storage |
|------------|-----------|--------|-----|---------|
| **ID Token** | RS256 | Token response `id_token` | Backstage identity, Kubernetes OIDC | Backstage session |
| **Session Token** | HS256 | Code, `refresh_token`, or cookies | SpectroCloud API | Global cache by email + cookie |

### Token Endpoint Derivation

The module automatically derives the token endpoint from the authorization URL:

```typescript
const tokenUrl = authorizationUrl.replace('/auth', '/token');
```

Examples:
- Auth: `https://console.spectrocloud.com/v1/oidc/tenant/{id}/auth`
- Token: `https://console.spectrocloud.com/v1/oidc/tenant/{id}/token`

### Integration Points

- **Backstage Auth Backend Plugin**: Registers SpectroCloud as OAuth2 provider
- **Auth Providers Extension Point**: Uses `createOAuthAuthenticator`
- **Sign-In Resolvers**: Standard Backstage resolver framework
- **SpectroCloud Backend Plugin**: Shares token cache for user-scoped API access
- **SpectroCloud Frontend Plugin**: Receives tokens via cookies and headers

### Integration with Backend Plugin

The auth backend and backend plugin share state:

1. **Token Cache**: Global in-memory cache accessible by both plugins
2. **Token Storage**: Auth backend stores HS256 tokens after OIDC flow
3. **Token Retrieval**: Backend plugin reads tokens for API calls
4. **Re-Auth Flow**: Backend signals when token is missing

**Token Flow**:
```
User → Auth Backend (OIDC) → Token Cache (store)
Frontend → Backend Plugin → Token Cache (read) → SpectroCloud API
```

## Security Features

### OIDC Compliance
- Authorization code flow with PKCE-ready implementation
- Nonce parameter for replay attack prevention
- State parameter for CSRF protection
- Secure token exchange with client secret
- Proper scope handling

### Token Security
- RS256 signature verification (delegated to Backstage)
- HS256 token stored securely in server-side cache
- JWT claim validation (email, sub, exp)
- Expiration checking with automatic removal
- No tokens in URLs or logs
- Secure session storage

### Cookie Security
- HTTP-only cookie (frontend cannot access via JavaScript)
- Lax same-site policy
- 1 hour expiration (shorter than session)
- Path restricted to root

### Limitations and Considerations

1. **In-Memory Cache**: Token cache is not persistent
   - Tokens lost on backend restart
   - Not shared across backend instances
   - Requires sticky sessions in clustered deployments

2. **Token Refresh**: Limited refresh support
   - SpectroCloud does not provide standard OAuth2 refresh grant
   - Uses same HS256 token for "refresh"
   - Users must re-authenticate when token expires

3. **JWT Decoding**: Unverified decoding for HS256 tokens
   - Used only for expiration and email extraction
   - Not used for security decisions
   - Verification done by SpectroCloud

4. **Token URL Derivation**: Assumes consistent endpoint naming
   - Token endpoint derived by replacing `/auth` with `/token`
   - May fail if SpectroCloud changes URL structure

## Use Cases

### Enterprise SSO
Integrate with SpectroCloud as your organization's identity provider for Backstage authentication. SpectroCloud can federate with external IdPs (Google, Microsoft, Okta, etc.), providing a unified authentication experience.

### Kubernetes Authentication
Use SpectroCloud RS256 ID tokens for user-level authentication to Kubernetes clusters managed by SpectroCloud. The ID token can be used directly in kubeconfig for OIDC authentication.

### User-Scoped API Access
Enable user-specific SpectroCloud API operations in Backstage:
- View only accessible projects and clusters
- Download kubeconfig with user identity
- Create clusters under user's permissions
- Audit trail with user attribution

### Audit and Compliance
Track user actions in both Backstage and Kubernetes:
- SpectroCloud operations attributed to authenticated user
- Kubernetes API calls use user's OIDC identity
- Complete audit trail across platforms

### Multi-Tenant Support
Support multiple SpectroCloud tenants with different client configurations per environment (development, staging, production).

## Components Overview

### Authenticator (`src/authenticator.ts`)

Custom OAuth2 authenticator implementing:
- `start()`: Initiates OAuth2 flow with nonce
- `authenticate()`: Exchanges code for tokens, detects HS256 token
- `refresh()`: Returns same token (limited refresh support)

### Module (`src/module.ts`)

Backend module registration:
- Registers `spectrocloud` OAuth2 provider
- Sets up auth provider extension
- Configures callback handler
- Implements cookie setting logic

### Token Cache (`src/tokenCache.ts`)

Shared global cache:
- `storeSessionToken(email, token, expiresAt)`: Store HS256 token
- `getSessionTokenByEmail(email)`: Retrieve valid token
- Automatic expiration handling

### Frontend Auth (`@terasky/backstage-plugin-spectrocloud-auth`)

Frontend companion plugin:
- Wraps OAuth2 API for `spectrocloud` provider
- Provides `getSpectroCloudApiToken()` helper
- Resolves HS256 token from cookies or OAuth2 tokens
- Integrates with `spectroCloudApiRef`

## Dependencies

- `@backstage/plugin-auth-backend-module-oauth2-provider`: OAuth2 authenticator framework
- `@backstage/plugin-auth-node`: Auth utilities
- `@terasky/backstage-plugin-spectrocloud-backend`: Shares token cache
- JWT decoding library for token inspection
