# Installation

This guide will help you install the API Docs Module for CRDs in your Backstage instance.

## Prerequisites

- Backstage instance (version 1.47.0 or later)
- `@backstage/plugin-api-docs` installed and configured
- Node.js 18+ and Yarn

## Installation Steps

### 1. Install the Package

From the root of your Backstage app:

```bash
yarn workspace app add @terasky/backstage-plugin-api-docs-module-crd
```

### 2. Add the Module to Your App

For **New Frontend System** (recommended):

Edit `packages/app/src/index.tsx`:

```typescript
import { createApp } from '@backstage/app-defaults';

// Add this import
import apiDocsModuleCrd from '@terasky/backstage-plugin-api-docs-module-crd';

const app = createApp({
  features: [
    // ... other features
    apiDocsModuleCrd, // Add this line
  ],
});
```

That's it! The module will automatically extend the API Docs plugin.

### 3. Verify Installation

1. Start your Backstage app:
   ```bash
   yarn dev
   ```

2. Create a test API entity with `spec.type: crd` (see [Configuration Guide](./configure.md))

3. Navigate to the API entity in the catalog

4. You should see the CRD rendered with an interactive schema browser

## Troubleshooting

### Module Not Loading

**Issue:** The CRD widget doesn't appear

**Solutions:**
- Verify the module is imported in `packages/app/src/index.tsx`
- Check that the API entity has `spec.type: crd`
- Ensure the CRD YAML is in `spec.definition`
- Check browser console for errors

### Other API Types Not Working

**Issue:** OpenAPI/AsyncAPI widgets stopped working after installing the module

**Solutions:**
- This should not happen as the module preserves existing widgets
- Check that `@backstage/plugin-api-docs` is still properly configured
- Verify no conflicts in your app configuration
- Check browser console for errors

### TypeScript Errors

**Issue:** TypeScript compilation errors after installation

**Solutions:**
- Run `yarn install` to update dependencies
- Run `yarn tsc` to check for type errors
- Ensure you're using compatible versions of dependencies
- Clear TypeScript cache: `rm -rf node_modules/.cache`

## Next Steps

- [Configure the module](./configure.md) to create API entities for your CRDs
- Learn about [features and usage](./about.md)
- Explore the [overview](../overview.md) for more information

## Version Compatibility

| Plugin Version | Backstage Version | Notes |
|----------------|-------------------|-------|
| 1.0.x | 1.47.0+ | Initial release, requires new frontend system |

## Support

If you encounter issues:
1. Check the [Configuration Guide](./configure.md) for common setup patterns
2. Review the [About page](./about.md) for feature documentation
3. Open an issue on [GitHub](https://github.com/terasky-oss/backstage-plugins)
