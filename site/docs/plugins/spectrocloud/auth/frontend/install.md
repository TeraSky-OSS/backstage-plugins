# Installing the SpectroCloud Authentication Frontend Plugin

This guide will help you install the SpectroCloud authentication frontend plugin in your Backstage instance.

## Prerequisites

Before installing the frontend plugin, ensure you have:

1. A working Backstage instance (version 1.47.1 or later)
2. Node.js 18+ and Yarn installed
3. **SpectroCloud backend module installed and configured** (required)

## Installation Steps

### 1. Add Required Package

Install the package using your package manager:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-spectrocloud-auth
```

### 2. Verify Auto-Discovery

The plugin is automatically discovered by Backstage. You can verify it's installed by checking:

```bash
grep "@terasky/backstage-plugin-spectrocloud-auth" packages/app/package.json
```

### 3. No App.tsx Changes Needed!

Unlike older Backstage plugins, this plugin is **automatically loaded**. There's no need to import or register it in `App.tsx`.

### 4. Configure Sign-In Page

#### Option A: Global Sign-In Page Module (Easiest)

If you're using the global sign-in page module:

```yaml
# app-config.yaml
signinPage:
  providers:
    spectrocloud:
      enabled: true
```

#### Option B: Custom Sign-In Page

If you have a custom sign-in page implementation, import the API reference:

```typescript
import { spectroCloudAuthApiRef } from '@terasky/backstage-plugin-spectrocloud-auth';

const providers = [
  {
    id: 'spectrocloud-auth-provider',
    title: 'SpectroCloud',
    message: 'Sign in using SpectroCloud',
    apiRef: spectroCloudAuthApiRef,
  },
];
```

## Quick Start Example

### Minimal Configuration

**app-config.yaml:**
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

signinPage:
  providers:
    spectrocloud:
      enabled: true
```

**Environment variables:**
```bash
export SPECTROCLOUD_CLIENT_ID="your-client-id"
export SPECTROCLOUD_CLIENT_SECRET="your-client-secret"
```

**Start Backstage:**
```bash
yarn dev
```

## Verification

After installation, verify the plugin is working:

### 1. Check Dependencies
```bash
cat packages/app/package.json | grep spectrocloud-auth
```

Should show:
```json
"@terasky/backstage-plugin-spectrocloud-auth": "^0.1.0"
```

### 2. Check Build
```bash
yarn workspace app build
```

Should complete without errors.

### 3. Test Sign-In
1. Navigate to http://localhost:3000
2. You should see "SpectroCloud" as a sign-in option
3. Click it and complete authentication
4. Verify you're logged in

### 4. Verify API Access
Open browser console and run:
```javascript
// After signing in
const authApi = await window.backstage.getApi('core.auth.spectrocloud');
const profile = await authApi.getProfile();
console.log(profile);
```

## Integration with Other Components

### Sign-In Page
The plugin automatically integrates with:
- Global Sign-In Page Module
- Custom sign-in pages using `SignInPage` component
- Backstage's authentication system

### Backend Communication
The plugin communicates with:
- SpectroCloud backend module at `/api/auth/spectrocloud`
- Backstage discovery API for endpoint resolution

## Package Contents

The package exports:

```typescript
// Main plugin (default export)
export default spectroCloudAuthPlugin;

// API reference for use in other plugins
export { spectroCloudAuthApiRef };

// API Blueprint (advanced usage)
export { spectroCloudAuthApi };
```

## Troubleshooting

### Plugin Not Found
```bash
# Reinstall
yarn --cwd packages/app add @terasky/backstage-plugin-spectrocloud-auth

# Clear cache
yarn install --force
```

### Build Errors
```bash
# Check for type errors
yarn workspace app type-check

# Clean and rebuild
yarn workspace app clean
yarn workspace app build
```

### Sign-In Option Not Showing
- Verify backend module is installed and running
- Check `app-config.yaml` has SpectroCloud provider enabled
- Review browser console for errors
- Check that `signinPage.providers.spectrocloud.enabled` is `true`

### Import Errors
```bash
# Ensure all peer dependencies are installed
yarn install

# Check for version conflicts
yarn why @backstage/frontend-plugin-api
```

## Post-Installation

After successful installation:

1. **Configure Backend** - Ensure backend module has correct credentials
2. **Test Authentication** - Complete a full sign-in flow
3. **Configure Resolvers** - Set up user resolution in backend config
4. **Optional Features**:
   - Install Kubernetes auth module for cluster access
   - Customize sign-in page appearance
   - Configure multiple authentication providers

## Next Steps

- [Configure Sign-In Page](./configure.md)
- [Install Kubernetes Module](../kubernetes-module/install.md) (optional)
- Review [backend configuration](../backend/configure.md)
