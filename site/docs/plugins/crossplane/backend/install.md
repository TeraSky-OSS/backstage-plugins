# Installing the Crossplane Permissions Backend Plugin

This guide will help you install and set up the Crossplane Permissions backend plugin in your Backstage instance.

## Prerequisites

Before installing the backend plugin, ensure you have:

1. A working Backstage instance
2. Node.js and npm/yarn installed
3. Access to your Backstage backend configuration

## Installation Steps

### 1. Add the Package

Install the backend plugin package using your package manager:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-crossplane-permissions-backend
```

### 2. Add to Backend

Modify your backend entry point (typically `packages/backend/src/index.ts`):

```typescript
import { createRouter } from '@terasky/backstage-plugin-crossplane-permissions-backend';

// In your backend initialization
backend.add(import('@terasky/backstage-plugin-crossplane-permissions-backend'));
```

### 3. Configure Permissions

Add the following to your `app-config.yaml`:

```yaml
permission:
  enabled: true # Enable Backstage permission framework
  
crossplane:
  enablePermissions: true # Enable Crossplane permission checks
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. Permission endpoints are accessible
4. Integration with the frontend plugin works correctly

### Testing the Installation

1. **Check Backend Health**
   ```bash
   curl http://localhost:7007/api/crossplane/health
   ```

2. **Test Frontend Integration**
    - Open a Crossplane resource in the frontend
    - Verify permission checks are working
    - Check access control behavior

## Troubleshooting

Common issues and solutions:

### 1. Backend Startup Issues
```bash
# Check backend logs
yarn workspace backend start --verbose
```

### 2. Permission Framework Issues
- Verify permission framework is enabled
- Check permission policy configuration
- Review backend plugin configuration

### 3. Integration Problems
- Ensure frontend and backend versions match
- Check network connectivity
- Verify API endpoint configuration

## Next Steps

After successful installation:

1. Configure permission policies
2. Set up role-based access control
3. Test with different user roles
4. Monitor permission enforcement

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.
