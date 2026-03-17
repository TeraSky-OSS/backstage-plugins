# Configuring the VCF SSO Authentication Backend Module

This guide covers all configuration options for the VCF SSO authentication backend module.

## Configuration Structure

```yaml
auth:
  environment: development  # or production
  providers:
    vcfsso:
      development:
        clientId: ${VCFSSO_CLIENT_ID}
        clientSecret: ${VCFSSO_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.example.com/oidc/endpoint/VCFSSO
        callbackUrl: http://localhost:7007/api/auth/vcfsso/handler/frame  # optional
        additionalScopes: []    # optional
        prompt: login           # optional
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
            - resolver: emailMatchingUserEntityProfileEmail
      production:
        clientId: ${VCFSSO_CLIENT_ID}
        clientSecret: ${VCFSSO_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.example.com/oidc/endpoint/VCFSSO
        callbackUrl: https://backstage.example.com/api/auth/vcfsso/handler/frame
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

## Configuration Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | OIDC client ID from VCF SSO |
| `clientSecret` | string | OIDC client secret from VCF SSO |
| `metadataUrl` | string | OIDC discovery endpoint URL (`everything before .well-known/openid-configuration`) |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `callbackUrl` | string | Auto-derived | OAuth2 callback URL. Backstage derives this automatically; set only if you need to override it. |
| `additionalScopes` | string or string[] | `[]` | Extra OAuth2 scopes to request beyond `openid profile email` |
| `prompt` | string | — | OIDC `prompt` parameter: `login`, `none`, `consent`, or `select_account` |

## Sign-In Resolvers

Sign-in resolvers map authenticated VCF SSO users to Backstage user entities.

### emailLocalPartMatchingUserEntityName

Matches the local part of the user's email (before `@`) to a Backstage user entity by `metadata.name`:

```yaml
signIn:
  resolvers:
    - resolver: emailLocalPartMatchingUserEntityName
```

**Example:** User with `acct = john.doe@example.com` → matches Backstage user entity named `john.doe`

**Optional parameters:**
```yaml
- resolver: emailLocalPartMatchingUserEntityName
  allowedDomains:
    - example.com      # Only allow sign-in from these domains
  dangerouslyAllowSignInWithoutUserInCatalog: false  # Default: false
```

### emailMatchingUserEntityProfileEmail

Matches the full email address to a Backstage user entity's `spec.profile.email`:

```yaml
signIn:
  resolvers:
    - resolver: emailMatchingUserEntityProfileEmail
```

**Example:** User with `acct = john.doe@example.com` → matches Backstage user entity with `spec.profile.email: john.doe@example.com`

**Optional parameters:**
```yaml
- resolver: emailMatchingUserEntityProfileEmail
  dangerouslyAllowSignInWithoutUserInCatalog: false  # Default: false
```

### preferredUsernameMatchingUserEntityName

Matches the `user_name` OIDC claim to a Backstage user entity by `metadata.name`:

```yaml
signIn:
  resolvers:
    - resolver: preferredUsernameMatchingUserEntityName
```

**Example:** User with `user_name = johndoe` → matches Backstage user entity named `johndoe`

**Optional parameters:**
```yaml
- resolver: preferredUsernameMatchingUserEntityName
  dangerouslyAllowSignInWithoutUserInCatalog: false  # Default: false
```

### Multiple Resolvers

Configure multiple resolvers for fallback logic — Backstage tries each in order until one succeeds:

```yaml
signIn:
  resolvers:
    - resolver: emailMatchingUserEntityProfileEmail
    - resolver: emailLocalPartMatchingUserEntityName
    - resolver: preferredUsernameMatchingUserEntityName
```

## Environment Variables

### Setting Variables

**Development (local shell):**
```bash
export VCFSSO_CLIENT_ID="your-client-id"
export VCFSSO_CLIENT_SECRET="your-client-secret"
```

**Production (Kubernetes Secret):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backstage-secrets
type: Opaque
stringData:
  VCFSSO_CLIENT_ID: "your-client-id"
  VCFSSO_CLIENT_SECRET: "your-client-secret"
```

## VCF SSO Claim Handling

VCF SSO uses non-standard OIDC claims. The module handles this automatically:

| Standard Claim | VCF SSO Equivalent | Notes |
|---------------|-------------------|-------|
| `email` | `acct` | VCF SSO does not populate the standard `email` claim |
| `preferred_username` | `user_name` | Short username |
| `name` | `name` | Standard display name (may be present) |

The module resolves the profile in this priority order:
- **Email**: `acct` → fallback to standard `email`
- **Display name**: `name` → fallback to `acct` → fallback to `user_name`

## Configuration Examples

### Basic Development Setup

```yaml
auth:
  environment: development
  providers:
    vcfsso:
      development:
        clientId: ${VCFSSO_CLIENT_ID}
        clientSecret: ${VCFSSO_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.lab.example.com/oidc/endpoint/VCFSSO
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
```

### Production Setup

```yaml
auth:
  environment: production
  providers:
    vcfsso:
      production:
        clientId: ${VCFSSO_CLIENT_ID}
        clientSecret: ${VCFSSO_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.example.com/oidc/endpoint/VCFSSO
        callbackUrl: https://backstage.example.com/api/auth/vcfsso/handler/frame
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
            - resolver: emailLocalPartMatchingUserEntityName
```

### Force Re-Authentication (Login Prompt)

Force users to re-enter credentials on every sign-in:

```yaml
auth:
  providers:
    vcfsso:
      production:
        # ... credentials and metadataUrl ...
        prompt: login
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

### Allow Sign-In Without Catalog Entry (Development Only)

For development environments where catalog entries may not exist:

```yaml
auth:
  providers:
    vcfsso:
      development:
        # ... credentials and metadataUrl ...
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
              dangerouslyAllowSignInWithoutUserInCatalog: true
```

!!! warning
    Never use `dangerouslyAllowSignInWithoutUserInCatalog: true` in production. It bypasses catalog-based access control.

### Domain-Restricted Sign-In

Only allow users from specific email domains:

```yaml
auth:
  providers:
    vcfsso:
      production:
        # ... credentials and metadataUrl ...
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
              allowedDomains:
                - example.com
                - corp.example.com
```

### Multi-Environment (Dev + Prod)

```yaml
auth:
  providers:
    vcfsso:
      development:
        clientId: ${VCFSSO_DEV_CLIENT_ID}
        clientSecret: ${VCFSSO_DEV_CLIENT_SECRET}
        metadataUrl: https://vcf-sso-dev.example.com/oidc/endpoint/VCFSSO
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
              dangerouslyAllowSignInWithoutUserInCatalog: true
      production:
        clientId: ${VCFSSO_PROD_CLIENT_ID}
        clientSecret: ${VCFSSO_PROD_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.example.com/oidc/endpoint/VCFSSO
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

## Security Considerations

- **Never commit secrets** to version control — always use environment variables
- **Use HTTPS** for all OAuth2 flows in production
- **Restrict allowed domains** to prevent unauthorized sign-in via `allowedDomains`
- **Provision user entities** in the catalog before first login when not using `dangerouslyAllowSignInWithoutUserInCatalog`
- **Rotate client secrets** periodically and update environment variables accordingly

## Troubleshooting

### OIDC Discovery Fails at Startup

- Verify the `metadataUrl` returns valid JSON
- Check network connectivity from the Backstage backend to the VCF SSO host
- Validate the TLS certificate of the VCF SSO endpoint

### User Not Resolved

- Check backend logs for the specific resolver error
- Verify the user entity exists in the catalog with matching email or name
- Ensure `spec.profile.email` is set on the user entity (for `emailMatchingUserEntityProfileEmail`)
- Try adding `dangerouslyAllowSignInWithoutUserInCatalog: true` temporarily to confirm the auth flow itself works

### Token Exchange Fails

- Verify `clientId` and `clientSecret` are correct and match the VCF SSO application
- Ensure the callback URL is registered in VCF SSO exactly as configured
- Check that the VCF SSO application is active and not expired

## Next Steps

- [Install the Frontend Plugin](../frontend/install.md)
- [Configure the Sign-In Page](../frontend/configure.md)
