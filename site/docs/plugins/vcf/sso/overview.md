# VCF SSO Authentication Plugins

The VCF SSO authentication plugins provide OIDC-based single sign-on integration with VCF (VMware Cloud Foundation) SSO for Backstage. They enable users to sign in to Backstage using their VCF SSO identity, with full support for Backstage's standard sign-in resolver framework.

## Plugin Components

### Frontend Plugin
The frontend plugin provides the OAuth2 client for VCF SSO authentication:

- Creates the `vcfSsoAuthApiRef` for use with sign-in pages and other plugins
- Implements standard OAuth2 authorization code flow
- Compatible with the Global Sign-In Page module and custom sign-in pages
- No manual wiring required — automatically discovered by Backstage

[Learn more about the frontend plugin](./frontend/about.md)

### Backend Module
The backend module integrates VCF SSO as an OIDC provider in the Backstage auth backend:

- Uses the standard OIDC authenticator (`oidcAuthenticator`)
- Includes a custom profile transform to handle VCF SSO's non-standard identity claims
- Supports all standard Backstage sign-in resolvers
- Configurable via the standard `auth.providers.vcfsso` config section

[Learn more about the backend module](./backend/about.md)

## Key Features

### Standard OIDC Integration
Built on Backstage's standard OIDC authenticator — no custom authentication logic required. Configured via a standard OIDC metadata URL (discovery endpoint).

### VCF SSO Claim Handling
VCF SSO uses non-standard OIDC claims. The backend module handles this transparently:

- The `acct` claim is used as the email address (the standard `email` claim is not populated by VCF SSO)
- The `user_name` claim provides the short username
- The plugin maps these to Backstage's standard profile fields automatically

### Flexible Sign-In Resolution
Supports all standard Backstage user resolution strategies:

- Match by email (`emailMatchingUserEntityProfileEmail`)
- Match by email local part (`emailLocalPartMatchingUserEntityName`)
- Match by preferred username (`preferredUsernameMatchingUserEntityName`)

### Global Sign-In Page Integration
Works seamlessly with the [Global Sign-In Page Module](../../signin-page/overview.md):

```yaml
signinPage:
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO
      message: Sign in using your VCF SSO account
```

## Getting Started

To get started with VCF SSO authentication:

1. Install the backend module and configure it with your VCF SSO OIDC credentials
2. Install the frontend plugin in your app package
3. Add `vcfsso` to your sign-in page configuration
4. Configure sign-in resolvers to match users to Backstage entities

For detailed instructions, refer to:

- [Frontend Plugin — About](./frontend/about.md)
- [Frontend Plugin — Install](./frontend/install.md)
- [Backend Module — About](./backend/about.md)
- [Backend Module — Install](./backend/install.md)
- [Backend Module — Configure](./backend/configure.md)
