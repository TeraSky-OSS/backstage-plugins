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

### Prompt Parameter
Add the `prompt` parameter to control authentication behavior:

```yaml
auth:
  providers:
    spectrocloud:
      development:
        # ... other config ...
        prompt: login  # Force re-authentication
        # or
        prompt: none  # Silent authentication (SSO)
```

**Values**:
- `login`: Force user to re-enter credentials
- `none`: Silent authentication (fails if not already authenticated)
- `consent`: Force consent screen
- `select_account`: Prompt account selection

## Integration with Backend Plugin

The auth backend works in tandem with the SpectroCloud backend plugin:

### Shared Token Cache

Both plugins access the same global token cache:

```typescript
// Auth backend stores tokens
storeSessionToken(email, token, expiresAt);

// Backend plugin retrieves tokens
const token = getSessionTokenByEmail(email);
```

### Token Flow

1. **Authentication**: User authenticates via OIDC
2. **Token Storage**: Auth backend stores HS256 token in cache
3. **Cookie**: Auth backend sets `spectrocloud-api-token` cookie
4. **API Request**: Frontend sends request with headers:
   - `X-SpectroCloud-User-Email`: User's email
   - `X-SpectroCloud-Token`: HS256 token (from cookie)
5. **Token Lookup**: Backend plugin looks up token in cache
6. **API Call**: Backend uses token for SpectroCloud API

### Re-Authentication

When token is missing from cache:

1. Backend plugin returns `X-SpectroCloud-ReAuth-Required: true` header
2. Frontend detects header
3. Frontend triggers sign-out
4. User re-authenticates
5. New token stored in cache
6. Operations resume

### Configuration Consistency

Ensure both plugins are enabled:

```yaml
spectrocloud:
  enabled: true  # Enables both auth and backend plugins

auth:
  providers:
    spectrocloud:
      development:
        # ... auth config ...
```

## Security Considerations

### Secrets Management
- **Never commit secrets** to version control
- Use environment variables for sensitive data
- Store secrets in secure secret management systems (Vault, AWS Secrets Manager, etc.)
- Rotate client secrets periodically
- Limit client secret access to authorized personnel

### Network Security
- Use HTTPS in production (required for OAuth2)
- Configure proper CORS policies
- Ensure callback URL uses HTTPS in production
- Validate redirect URIs in SpectroCloud OAuth client config

### Token Security
- Token cache is in-memory and process-local
- Tokens are not logged or exposed in error messages
- Cookie is HTTP-only and uses lax same-site policy
- Consider implementing token encryption at rest for enhanced security

### User Resolution
- Review sign-in resolver logic for your organization
- Ensure user entities exist before authentication
- Consider implementing auto-provisioning if needed
- Validate email domains if using email-based resolution

### Deployment Considerations
- **Clustered Deployments**: Use sticky sessions (token cache is not distributed)
- **High Availability**: Consider implementing distributed cache (Redis, etc.)
- **Token Persistence**: Implement persistent cache for zero-downtime restarts
- **Monitoring**: Track authentication failures and token cache hit/miss rates

## Troubleshooting

### Common Issues

**1. Token Exchange Fails**
- Verify client secret is correct
- Check authorization URL has correct tenant ID
- Ensure callback URL matches exactly (including protocol and port)
- Review SpectroCloud OAuth client configuration

**2. User Not Resolved**
- Verify user entity exists in catalog with correct email
- Check email claim in ID token matches catalog
- Review resolver configuration and order
- Check backend logs for resolver errors
- Ensure user entity has `spec.profile.email` (for email resolver)

**3. Session Expires Immediately**
- Check token expiration time in ID token
- Verify clock sync between servers
- Review session configuration in `app-config.yaml`
- Check cookie settings and browser compatibility

**4. CORS Errors**
- Add frontend origin to `experimentalExtraAllowedOrigins`
- Verify callback URL is correct
- Check cookie domain settings
- Review browser console for specific errors

**5. HS256 Token Not Cached**
- Check auth backend logs for token detection
- Verify token is a valid JWT
- Ensure email claim exists in token
- Review token cache expiration settings

**6. Backend API Calls Fail**
- Verify token is in cache (check logs)
- Ensure frontend sends `X-SpectroCloud-User-Email` header
- Check token expiration
- Review backend plugin configuration

**7. Re-Auth Loop**
- Token cache may be empty (backend restarted)
- Token expired but not refreshed
- Email mismatch between request and cache
- Check for `X-SpectroCloud-ReAuth-Required` header

### Debug Mode

Enable debug logging:

```yaml
backend:
  # Enable debug logging for auth
  debug: true
```

Check logs for:
- Token exchange responses
- HS256 token detection
- Cache storage operations
- Cookie setting

## Best Practices

### Development
1. Use local callback URL for development
2. Configure both development and production environments
3. Test with multiple users and email domains
4. Verify token expiration handling

### Production
1. Use HTTPS for all OAuth2 flows
2. Configure production callback URL in SpectroCloud
3. Implement monitoring and alerting
4. Use sticky sessions or distributed cache
5. Set up token rotation policies
6. Review and audit authentication logs regularly

### User Management
1. Provision user entities before first login
2. Implement auto-provisioning if needed
3. Keep catalog emails in sync with SpectroCloud
4. Document user resolution logic

## Next Steps

After configuration:

1. **Install frontend plugin**: `@terasky/backstage-plugin-spectrocloud-auth`
2. **Configure sign-in page**: Add SpectroCloud to available providers
3. **Optional: Install Kubernetes auth module**: `@terasky/backstage-plugin-spectrocloud-kubernetes-auth-module`
4. **Configure backend plugin**: Ensure backend plugin is enabled
5. **Test authentication flow**:
   - Sign in with SpectroCloud
   - Verify token in cache
   - Test API calls
   - Verify re-authentication on token expiry
6. **Set up monitoring**: Track auth failures and token cache metrics
