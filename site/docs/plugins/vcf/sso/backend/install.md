# Installing the VCF SSO Authentication Backend Module

This guide will help you install and set up the VCF SSO authentication backend module in your Backstage instance.

## Prerequisites

Before installing, ensure you have:

1. A working Backstage instance (version 1.47.1 or later)
2. Node.js 18+ and Yarn installed
3. Access to a VCF SSO OIDC endpoint
4. An OIDC client application registered in VCF SSO with:
   - A client ID and client secret
   - The Backstage callback URL configured as a redirect URI

## Obtaining VCF SSO OIDC Credentials

To register an OIDC client in VCF SSO:

1. Log in to your VCF SSO management interface
2. Navigate to the OIDC client applications section
3. Create a new OIDC client application
4. Configure the redirect URI:
   - Development: `http://localhost:7007/api/auth/vcfsso/handler/frame`
   - Production: `https://backstage.example.com/api/auth/vcfsso/handler/frame`
5. Note the **Client ID**, **Client Secret**, and the **OIDC discovery URL** (metadata URL)

The metadata URL typically follows the pattern:
```
https://<vcf-sso-host>/oidc/endpoint/<realm>
```

## Installation Steps

### 1. Add the Package

Install the backend module package:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-vcfsso-auth-backend
```

### 2. Register the Module in Your Backend

Add the module to your backend:

```typescript
// packages/backend/src/index.ts
backend.add(import('@terasky/backstage-plugin-vcfsso-auth-backend'));
```

**Full example:**

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Required: Core auth backend
backend.add(import('@backstage/plugin-auth-backend'));

// Add VCF SSO auth module
backend.add(import('@terasky/backstage-plugin-vcfsso-auth-backend'));

// ... other plugins

backend.start();
```

### 3. Set Environment Variables

Store sensitive credentials as environment variables:

```bash
export VCFSSO_CLIENT_ID="your-client-id"
export VCFSSO_CLIENT_SECRET="your-client-secret"
```

For production deployments, configure these in your Kubernetes secrets or secret management system.

### 4. Add the Configuration

Add the VCF SSO provider configuration to `app-config.yaml`:

```yaml
auth:
  environment: development
  providers:
    vcfsso:
      development:
        clientId: ${VCFSSO_CLIENT_ID}
        clientSecret: ${VCFSSO_CLIENT_SECRET}
        metadataUrl: https://vcf-sso.example.com/oidc/endpoint/VCFSSO
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
```

Replace the `metadataUrl` with the actual OIDC discovery endpoint for your VCF SSO instance.

### 5. Configure Sign-In Resolvers

Add sign-in resolvers to map VCF SSO users to Backstage entities:

```yaml
auth:
  providers:
    vcfsso:
      development:
        # ... credentials ...
        signIn:
          resolvers:
            - resolver: emailLocalPartMatchingUserEntityName
            - resolver: emailMatchingUserEntityProfileEmail
```

Backstage will try each resolver in order until one succeeds.

## Verification

After installation, verify that:

1. The backend starts without errors
2. The auth endpoint is accessible: `GET /api/auth/vcfsso`
3. Navigating to the sign-in page shows the VCF SSO option (requires frontend plugin)

### Test the Auth Endpoint

```bash
curl http://localhost:7007/api/auth/vcfsso/start?env=development
```

This should return a redirect to your VCF SSO authorization page.

## Troubleshooting

### Backend Won't Start

- Verify the package is installed in `packages/backend/package.json`
- Ensure `@backstage/plugin-auth-backend` is also installed
- Check for TypeScript compilation errors

### Authentication Fails

- Verify `clientId` and `clientSecret` are correct
- Ensure the `metadataUrl` is reachable from the Backstage backend
- Confirm the callback URL is registered in VCF SSO
- Check backend logs for detailed error messages

### User Not Resolved

- Verify the user entity exists in the Backstage catalog
- Check that the email in the `acct` claim matches the catalog user's email or name
- Review resolver configuration and order
- Check backend logs for resolver errors

### OIDC Discovery Fails

- Confirm the `metadataUrl` returns valid JSON when accessed directly
- Ensure no firewall or network policy blocks access from the backend to VCF SSO
- Check TLS certificate validity for the VCF SSO endpoint

## Next Steps

After successful installation:

1. Proceed to the [Configuration Guide](./configure.md) for full configuration options
2. Install the [Frontend Plugin](../frontend/install.md)
3. Configure the [Sign-In Page](../frontend/configure.md) to show the VCF SSO option
