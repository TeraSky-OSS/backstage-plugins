# Installing VCF Operations Backend Plugin

This guide walks you through installing the VCF Operations Backend plugin in your Backstage application.

## Installation Steps

### 1. Install the Package

Add the backend plugin to your Backstage application:

```bash
# From your Backstage root directory
yarn --cwd packages/backend add @terasky/backstage-plugin-vcf-operations-backend
```

### 2. Register the Plugin

Add the plugin to your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugin registrations

// Add VCF Operations backend plugin
backend.add(import('@terasky/backstage-plugin-vcf-operations-backend'));

backend.start();
```

## Verification

### 1. Start the Backend

Start your Backstage backend to ensure the plugin loads correctly:

```bash
yarn dev
```

### 2. Check Health Endpoint

Verify the plugin is running by checking the health endpoint:

```bash
curl http://localhost:7007/api/vcf-operations/health
```

Expected response:
```json
{
  "status": "ok"
}
```

### 3. Check Logs

Look for VCF Operations plugin initialization in your backend logs:

```
[vcf-operations] VcfOperationsService initialized with 1 instance(s)
[vcf-operations] Permissions registered: vcf-operations.metrics.view
```

## Next Steps

After successful installation:

1. **[Configure the Backend](configure.md)** - Set up VCF Operations instances and authentication
2. **Install Frontend Plugin** - Add the frontend components for metric visualization
3. **Configure Permissions** - Set up access control for VCF Operations data
4. **Test Integration** - Verify end-to-end functionality with your VCF Operations environment


The VCF Operations Backend plugin provides the foundation for VCF Operations integration - once installed and configured, you can add the frontend components to start visualizing your infrastructure metrics.