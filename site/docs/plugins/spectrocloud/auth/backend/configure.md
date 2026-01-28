# Configuring the SpectroCloud Authentication Backend Module

The SpectroCloud authentication backend module offers extensive configuration options for OIDC authentication.

## Configuration Structure

```yaml
auth:
  environment: development  # or production
  providers:
    spectrocloud:
      development:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/{tenant-id}/auth
        callbackUrl: http://localhost:7007/api/auth/spectrocloud/handler/frame
        scope: openid profile email
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
            - resolver: emailLocalPartMatchingUserEntityName
      production:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/{tenant-id}/auth
        callbackUrl: https://backstage.example.com/api/auth/spectrocloud/handler/frame
        scope: openid profile email
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

## Configuration Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | OAuth2 client ID from SpectroCloud |
| `clientSecret` | string | OAuth2 client secret from SpectroCloud |
| `authorizationUrl` | string | SpectroCloud OIDC authorization endpoint |
| `callbackUrl` | string | Backstage callback URL for OAuth2 flow |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `scope` | string | `openid profile email` | OAuth2 scopes to request |

## Sign-In Resolvers

Sign-in resolvers map authenticated SpectroCloud users to Backstage user entities.

### Built-In Resolvers

#### emailMatchingUserEntityProfileEmail
Matches users by email address:
```yaml
signIn:
  resolvers:
    - resolver: emailMatchingUserEntityProfileEmail
```

**How it works:**
- Extracts email from SpectroCloud ID token
- Searches for Backstage user entity with matching `spec.profile.email`
- Creates session if match found

#### emailLocalPartMatchingUserEntityName
Matches users by email local part (before @):
```yaml
signIn:
  resolvers:
    - resolver: emailLocalPartMatchingUserEntityName
```

**How it works:**
- Extracts email from SpectroCloud ID token
- Takes local part (before @) as username
- Searches for Backstage user entity with matching `metadata.name`

### Multiple Resolvers
Use multiple resolvers for fallback logic:
```yaml
signIn:
  resolvers:
    - resolver: emailMatchingUserEntityProfileEmail
    - resolver: emailLocalPartMatchingUserEntityName
```

Backstage will try each resolver in order until one succeeds.

## Environment Variables

### Required Variables

```bash
export SPECTROCLOUD_CLIENT_ID="your-client-id"
export SPECTROCLOUD_CLIENT_SECRET="your-client-secret"
```

### Setting Variables

**Development (local):**
```bash
# In your shell profile (~/.bashrc, ~/.zshrc)
export SPECTROCLOUD_CLIENT_ID="..."
export SPECTROCLOUD_CLIENT_SECRET="..."
```

**Production (Kubernetes):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backstage-secrets
type: Opaque
stringData:
  SPECTROCLOUD_CLIENT_ID: "your-client-id"
  SPECTROCLOUD_CLIENT_SECRET: "your-client-secret"
```

## SpectroCloud Configuration

### Obtaining Client Credentials

1. Log in to SpectroCloud Palette console
2. Navigate to **Tenant Settings** → **OAuth Integrations**
3. Click **Add OAuth Client**
4. Configure:
   - **Name**: Backstage
   - **Redirect URI**: `http://localhost:7007/api/auth/spectrocloud/handler/frame` (dev)
   - **Redirect URI**: `https://backstage.example.com/api/auth/spectrocloud/handler/frame` (prod)
   - **Scopes**: `openid`, `profile`, `email`
5. Save and note the Client ID and Client Secret

### Finding Your Tenant ID

Your tenant ID is visible in the SpectroCloud console URL or can be found in:
- Account Settings
- API documentation
- Support team

The authorization URL format is:
```
https://console.spectrocloud.com/v1/oidc/tenant/{tenant-id}/auth
```

## Cookie Configuration (Optional)

For local development with non-standard domains:

```yaml
auth:
  session:
    secret: ${SESSION_SECRET}
  
  # Optional: Cookie domain for local development
  experimentalExtraAllowedOrigins:
    - http://localhost:3000
    - http://localhost:7007
```

## Configuration Examples

### Basic Development Setup
```yaml
auth:
  environment: development
  providers:
    spectrocloud:
      development:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/abc123/auth
        callbackUrl: http://localhost:7007/api/auth/spectrocloud/handler/frame
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

### Production Setup
```yaml
auth:
  environment: production
  providers:
    spectrocloud:
      production:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/abc123/auth
        callbackUrl: https://backstage.example.com/api/auth/spectrocloud/handler/frame
        scope: openid profile email
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

### Multiple Resolvers
```yaml
auth:
  providers:
    spectrocloud:
      development:
        # ... connection config ...
        signIn:
          resolvers:
            # Try email first
            - resolver: emailMatchingUserEntityProfileEmail
            # Fall back to username
            - resolver: emailLocalPartMatchingUserEntityName
```

## Troubleshooting

### Common Issues

**1. Token Exchange Fails**
- Verify client secret is correct
- Check authorization URL has correct tenant ID
- Ensure callback URL matches exactly

**2. User Not Resolved**
- Verify user entity exists in catalog
- Check email matches between SpectroCloud and catalog
- Review resolver configuration
- Check backend logs for resolver errors

**3. Session Expires Immediately**
- Check token expiration time in ID token
- Verify clock sync between servers
- Review session configuration

**4. CORS Errors**
- Add frontend origin to `experimentalExtraAllowedOrigins`
- Verify callback URL is correct
- Check cookie domain settings

## Advanced Configuration

### Custom Scopes
```yaml
auth:
  providers:
    spectrocloud:
      development:
        # ... other config ...
        scope: openid profile email groups
```

### Custom Token Endpoint
The module automatically derives the token endpoint from the authorization URL by replacing `/auth` with `/token`. If SpectroCloud changes their endpoint structure, you may need to update the authenticator code.

## Security Considerations

- **Never commit secrets** to version control
- Use environment variables for sensitive data
- Rotate client secrets periodically
- Use HTTPS in production
- Configure proper CORS policies
- Review user resolution logic for your organization

## Next Steps

After configuration:

1. Install and configure the frontend plugin
2. Configure sign-in page to display SpectroCloud option
3. Optional: Install Kubernetes authentication module
4. Test authentication flow end-to-end
