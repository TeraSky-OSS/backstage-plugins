# Installing the ScaleOps Backend Plugin

This guide will help you install and set up the ScaleOps backend plugin in your Backstage instance.

## Prerequisites

Before installing the backend plugin, ensure you have:

1. A working Backstage instance (version 1.47.1 or later)
2. Node.js 18+ and Yarn installed
3. Access to a ScaleOps instance
4. ScaleOps credentials (username and password)

## Installation Steps

### 1. Add Required Package

Install the package using your package manager:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-scaleops-backend
```

### 2. Add to Backend

Modify your backend entry point (typically `packages/backend/src/index.ts`):

```typescript
// In your backend initialization
backend.add(import('@terasky/backstage-plugin-scaleops-backend'));
```

**Example:**
```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));

// Add ScaleOps backend plugin
backend.add(import('@terasky/backstage-plugin-scaleops-backend'));

backend.start();
```

### 3. Configure the Plugin

Add the following to your `app-config.yaml`:

```yaml
scaleops:
  baseUrl: https://your-scaleops-instance.com
  authentication:
    enabled: true
    type: internal  # or 'ldap'
    user: ${SCALEOPS_USER}
    password: ${SCALEOPS_PASSWORD}
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. The API endpoints are accessible at `/api/scaleops/api/*`
4. MCP actions are registered (if using AI agents)

### Testing the Installation

**Check API Health:**
```bash
curl http://localhost:7007/api/scaleops/api/v1/dashboard/byNamespace \
  -H "Authorization: Bearer YOUR_BACKSTAGE_TOKEN"
```

This should return a ScaleOps authentication error if not yet configured, or data if configured correctly.

## Next Steps

After successful installation:

1. Configure authentication credentials
2. Install the frontend plugin (optional)
3. Configure entity annotations
4. Start using MCP actions with AI agents

Proceed to the [Configuration Guide](./configure.md) for detailed setup instructions.
