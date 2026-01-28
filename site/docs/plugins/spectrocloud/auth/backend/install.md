# Installing the SpectroCloud Authentication Backend Module

This guide will help you install and set up the SpectroCloud authentication backend module in your Backstage instance.

## Prerequisites

Before installing the backend module, ensure you have:

1. A working Backstage instance (version 1.47.1 or later)
2. Node.js 18+ and Yarn installed
3. Access to a SpectroCloud Palette instance
4. SpectroCloud OIDC client credentials (client ID and client secret)

## Getting SpectroCloud Credentials

You'll need to create an OIDC application in SpectroCloud:

1. Log in to your SpectroCloud Palette console
2. Navigate to **Tenant Settings** → **OAuth Integrations**
3. Create a new OAuth client application
4. Note down the **Client ID** and **Client Secret**
5. Configure the redirect URI: `http://localhost:7007/api/auth/spectrocloud/handler/frame`
   - For production, use your Backstage backend URL

## Installation Steps

### 1. Add Required Package

Install the package using your package manager:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-spectrocloud-auth-backend
```

### 2. Add to Backend

The module is automatically discovered by Backstage. Simply ensure it's imported in your backend:

```typescript
// packages/backend/src/index.ts
backend.add(import('@terasky/backstage-plugin-spectrocloud-auth-backend'));
```

**Example:**
```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Required: Core auth backend
backend.add(import('@backstage/plugin-auth-backend'));

// Add SpectroCloud auth module
backend.add(import('@terasky/backstage-plugin-spectrocloud-auth-backend'));

// ... other plugins

backend.start();
```

### 3. Set Environment Variables

Set the client secret as an environment variable:

```bash
export SPECTROCLOUD_CLIENT_SECRET="your-client-secret-here"
```

For production, configure this in your deployment environment (Kubernetes secrets, etc.).

### 4. Configure the Module

Add the SpectroCloud provider configuration to your `app-config.yaml`:

```yaml
auth:
  providers:
    spectrocloud:
      development:
        clientId: ${SPECTROCLOUD_CLIENT_ID}
        clientSecret: ${SPECTROCLOUD_CLIENT_SECRET}
        authorizationUrl: https://console.spectrocloud.com/v1/oidc/tenant/{your-tenant-id}/auth
        callbackUrl: http://localhost:7007/api/auth/spectrocloud/handler/frame
        scope: openid profile email
```

**Note:** Replace `{your-tenant-id}` with your actual SpectroCloud tenant ID.

### 5. Configure Sign-In Resolvers

Add sign-in resolvers to match SpectroCloud users to Backstage entities:

```yaml
auth:
  providers:
    spectrocloud:
      development:
        # ... other config ...
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
            - resolver: emailLocalPartMatchingUserEntityName
```

This will match users by their email address or email local part (before @) against Backstage user entities.

## Verification

After installation, verify that:

1. The plugin appears in your backend package.json dependencies
2. The backend starts without errors
3. The auth endpoint is accessible at `/api/auth/spectrocloud`
4. Authentication flow completes successfully

### Testing the Installation

**Check Auth Endpoint:**
```bash
curl http://localhost:7007/api/auth/spectrocloud/start?env=development
```

This should return a redirect to SpectroCloud's authorization page.

**Test Full Flow:**
1. Navigate to your Backstage instance
2. Click "Sign In"
3. Select SpectroCloud provider
4. Complete authentication
5. Verify you're logged in to Backstage

## Troubleshooting

### Backend Won't Start
- Verify the package is installed in `packages/backend/package.json`
- Check for TypeScript compilation errors
- Ensure `@backstage/plugin-auth-backend` is installed

### Authentication Fails
- Verify client ID and secret are correct
- Check authorization URL has correct tenant ID
- Ensure callback URL matches SpectroCloud OAuth app configuration
- Check browser console and backend logs for errors

### User Not Resolved
- Verify user entity exists in Backstage catalog
- Check email in SpectroCloud matches catalog user email
- Review sign-in resolver configuration
- Check backend logs for resolver errors

## Next Steps

After successful installation:

1. Configure production credentials
2. Install the frontend plugin
3. Configure sign-in page to show SpectroCloud option
4. Optional: Install Kubernetes authentication module

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.
