# VCF SSO Authentication Backend Module

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcfsso-auth-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcfsso-auth-backend) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-vcfsso-auth-backend)

## Overview

The VCF SSO authentication backend module integrates VCF (VMware Cloud Foundation) SSO as an OIDC authentication provider for the Backstage auth backend. It uses Backstage's standard `oidcAuthenticator` and adds a custom profile transform to correctly handle VCF SSO's non-standard OIDC identity claims.

## Features

### Standard OIDC Integration
- Built on `@backstage/plugin-auth-backend-module-oidc-provider`
- Configured via a standard OIDC metadata URL (discovery endpoint)
- No custom authentication flow — fully compliant with the OIDC spec
- Automatic endpoint discovery from the metadata URL

### VCF SSO Claim Handling

VCF SSO does not populate the standard `email` claim in its OIDC tokens. The module handles this automatically with a custom profile transform:

| Claim | Description | Usage |
|-------|-------------|-------|
| `acct` | Non-standard — contains the user's email address | Mapped to `profile.email` |
| `user_name` | Short username | Used as fallback display name |
| `name` | Display name (standard) | Used as `profile.displayName` if present |
| `picture` | Profile picture URL (standard) | Mapped to `profile.picture` |

The transform logic (in priority order):
1. Email: `acct` claim → falls back to standard `email` claim
2. Display name: `name` claim → falls back to `acct` → falls back to `user_name`

### Sign-In Resolvers

Supports all standard Backstage sign-in resolvers:

- **`emailLocalPartMatchingUserEntityName`** — Matches the local part of the email (before `@`) against the Backstage user entity name. Useful when your Backstage user entities are named by username.
- **`emailMatchingUserEntityProfileEmail`** — Matches the full email against `spec.profile.email` in the Backstage user entity.
- **`preferredUsernameMatchingUserEntityName`** — Matches the `user_name` claim against the user entity name.

### Optional: Allow Sign-In Without Catalog Entry

Each resolver supports `dangerouslyAllowSignInWithoutUserInCatalog: true` to allow users to sign in even if they do not have a matching entity in the Backstage catalog. Use this only for development or trusted environments.

## Technical Architecture

### Authentication Flow

1. User clicks the VCF SSO sign-in button in Backstage
2. Backstage backend redirects user to VCF SSO authorization endpoint (discovered from `metadataUrl`)
3. User authenticates with VCF SSO
4. VCF SSO redirects back to the Backstage callback URL with an authorization code
5. Backstage backend exchanges the code for tokens via the OIDC token endpoint
6. The custom profile transform extracts the user's email from the `acct` claim
7. The configured sign-in resolver maps the user to a Backstage entity
8. A Backstage session is created for the authenticated user

### Module Registration

The module registers the `vcfsso` provider with the Backstage auth plugin:

```typescript
createBackendModule({
  pluginId: 'auth',
  moduleId: 'vcfsso-provider',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'vcfsso',
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
            profileTransform: async (result) => {
              // Maps VCF SSO's non-standard `acct` claim to email
              const email = result.fullProfile.userinfo['acct'] ?? result.fullProfile.userinfo.email;
              return { profile: { email, displayName, picture } };
            },
          }),
        });
      },
    });
  },
});
```

## Configuration Reference

```yaml
auth:
  environment: development
  providers:
    vcfsso:
      development:
        clientId: ${VCFSSO_CLIENT_ID}
        clientSecret: ${VCFSSO_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.example.com/oidc/endpoint/VCFSSO
        callbackUrl: http://localhost:7007/api/auth/vcfsso/handler/frame  # optional
        additionalScopes: []   # optional
        prompt: login           # optional
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
            - resolver: emailMatchingUserEntityProfileEmail
```

See the [Configure guide](./configure.md) for full documentation of each parameter.

## Dependencies

- `@backstage/plugin-auth-backend-module-oidc-provider` — Standard OIDC authenticator
- `@backstage/plugin-auth-node` — Auth utilities, extension points, and common resolvers
- `@backstage/backend-plugin-api` — Backend plugin registration

## Use Cases

### Corporate SSO
Use VCF SSO as your organization's single identity provider for Backstage, enabling employees to sign in with their existing VCF credentials without needing a separate Backstage account.

### VCF-Integrated Platform
When running Backstage as part of a VCF-based internal developer platform, this module enables seamless identity federation — users authenticated against VCF SSO can interact with both Backstage and VCF Automation resources under their own identity.

### Multi-Environment Support
Configure separate OIDC client applications per environment (development, staging, production) using Backstage's built-in environment configuration support.

## Next Steps

- [Install the Backend Module](./install.md)
- [Configure the Backend Module](./configure.md)
- [Install the Frontend Plugin](../frontend/install.md)
