# Installing the Kyverno Backend Plugin

This guide will help you install and set up the Kyverno backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage backend
2. Kyverno installed in your Kubernetes cluster(s)
3. Access to modify your Backstage backend configuration

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-kyverno-policy-reports-backend
```

### 2. Add to Backend

Add the plugin to your backend (typically `packages/backend/src/index.ts`):

```typescript
backend.add(import('@terasky/backstage-plugin-kyverno-policy-reports-backend'));
```

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. Permission endpoints are accessible
4. Integration with the frontend plugin works correctly

## Troubleshooting

Common issues and solutions:

1. **Backend Startup Issues**
    - Check the backend logs for errors
    - Verify the plugin import statement
    - Ensure all dependencies are installed

2. **Permission Framework Issues**
    - Confirm the permission framework is enabled
    - Check permission policy configuration
    - Verify integration with frontend components

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).
